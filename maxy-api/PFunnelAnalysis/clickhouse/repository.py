from typing import Any, Dict, List, Tuple

import logging
from ClickHouseComm import get_client
from . import SQL
from .dto import DiscoverGroupMetrics, FunnelQuery, FunnelRow
from ..clickhouse_condition_builder import build_where_clause


def fetch_funnel(query: FunnelQuery) -> List[FunnelRow]:
    params = query.model_dump()
    sql = SQL.render("funnel.selectFunnel", params)
    client = get_client()
    result = client.query(sql, params)
    return [FunnelRow.model_validate(dict(zip(result.column_names, row))) for row in result.result_rows]


def _build_discover_group_sql(
    *,
    base_source: str,
    where_sql: str,
    having_sql: str,
    period_clause: str,
) -> Tuple[str, str, str]:
    filters = [clause for clause in (where_sql, period_clause) if clause]
    filtered_where = f" WHERE {' AND '.join(filters)}" if filters else ""
    filtered_inner = f"SELECT user_key AS uid FROM {base_source}{filtered_where} GROUP BY uid"
    if having_sql:
        filtered_inner = f"{filtered_inner} HAVING {having_sql}"

    total_filters = [clause for clause in (period_clause,) if clause]
    total_where = f" WHERE {' AND '.join(total_filters)}" if total_filters else ""
    total_inner = f"SELECT user_key AS uid FROM {base_source}{total_where} GROUP BY uid"

    sql = (
        "WITH\n"
        f"    (SELECT count(*) FROM ({filtered_inner})) AS findCount,\n"
        f"    (SELECT count(*) FROM ({total_inner})) AS totalCount\n"
        "SELECT\n"
        "    findCount,\n"
        "    totalCount,\n"
        "    if(totalCount = 0, 0, findCount / totalCount) AS rate"
    )
    return sql, filtered_inner, total_inner


def fetch_discover_group_metrics(
    *,
    base_source: str,
    where_sql: str,
    having_sql: str,
    period_clause: str,
    params: Dict[str, Any],
) -> Tuple[DiscoverGroupMetrics, str]:
    sql, _, _ = _build_discover_group_sql(
        base_source=base_source,
        where_sql=where_sql,
        having_sql=having_sql,
        period_clause=period_clause,
    )
    client = get_client()
    result = client.query(sql, params)

    if result.result_rows:
        payload = dict(zip(result.column_names, result.result_rows[0]))
    else:
        payload = {"findCount": 0, "totalCount": 0, "rate": 0.0}

    metrics = DiscoverGroupMetrics.model_validate(payload)
    return metrics, sql


def fetch_discover_step_metrics(
    *,
    base_source: str,
    step_conditions: List[dict],
    params: Dict[str, Any],
    resolver=None,
) -> Tuple[DiscoverGroupMetrics, str, Dict[str, Any]]:
    """Preview funnel step discovery without segments."""
    if resolver is None:
        raise ValueError("resolver is required for building field expressions.")

    step_exprs, step_params = build_funnel_step_filters(step_conditions, resolver)
    if not step_exprs:
        sql = "SELECT 0 AS findCount, 0 AS totalCount, 0.0 AS rate"
        return DiscoverGroupMetrics(findCount=0, totalCount=0, rate=0.0), sql, params

    all_params: Dict[str, Any] = {**params, **step_params}
    step_expr_sql = ", ".join(step_exprs)
    total_steps = len(step_exprs)
    sql = (
        "WITH filtered_events AS ("
        f"    SELECT * FROM {base_source} "
        "WHERE event_time >= toDateTime(%(p_from)s) "
        "AND event_time < toDateTime(%(p_to)s) + INTERVAL 1 DAY"
        "), "
        "funnel_data AS ("
        "    SELECT user_key, windowFunnel(3600, 'strict_deduplication')("
        "        event_time, "
        f"        {step_expr_sql}"
        "    ) AS funnel_steps "
        "    FROM filtered_events "
        "    GROUP BY user_key"
        "), counts AS ("
        "    SELECT "
        "        count(*) AS totalCount, "
        f"        countIf(funnel_steps >= {total_steps}) AS findCount "
        "    FROM funnel_data"
        ") "
        "SELECT "
        "    findCount, "
        "    totalCount, "
        "    if(totalCount = 0, 0, findCount / totalCount) AS rate "
        "FROM counts"
    )
    client = get_client()
    result = client.query(sql, all_params)

    if result.result_rows:
        payload = dict(zip(result.column_names, result.result_rows[0]))
    else:
        payload = {"findCount": 0, "totalCount": 0, "rate": 0.0}

    metrics = DiscoverGroupMetrics.model_validate(payload)
    return metrics, sql, all_params


def _namespace_params(expr: str, params: Dict[str, Any], prefix: str) -> Tuple[str, Dict[str, Any]]:
    """Rename parameter placeholders to keep them unique across steps/groups."""
    if not params:
        return expr, {}
    mapped: Dict[str, Any] = {}
    updated_expr = expr
    for key, value in params.items():
        new_key = f"{prefix}{key}"
        updated_expr = updated_expr.replace(f"%({key})s", f"%({new_key})s")
        mapped[new_key] = value
    return updated_expr, mapped


def _build_condition_expression(where_sql: str, having_sql: str) -> str:
    """Combine WHERE/HAVING fragments into an aggregated boolean expression."""
    where_clause = (where_sql or "").strip()
    having_clause = (having_sql or "").strip()
    parts: List[str] = []
    if where_clause:
        parts.append(f"max(toUInt8({where_clause})) = 1")
    if having_clause:
        parts.append(f"({having_clause})")
    if not parts:
        return "1"
    return " AND ".join(f"({part})" for part in parts)


def build_funnel_step_filters(
    step_conditions: List[dict], resolver
) -> Tuple[List[str], Dict[str, Any]]:
    """Build ClickHouse boolean expressions for each funnel step."""
    step_exprs: List[str] = []
    all_params: Dict[str, Any] = {}

    for idx, step in enumerate(step_conditions, start=1):
        conditions = step.get("condition") if isinstance(step, dict) else None
        where_sql, where_params, _, _ = build_where_clause(conditions or [], resolver)
        expr = where_sql.strip() or "1"
        namespaced_expr, mapped = _namespace_params(expr, where_params, f"s{idx}_")
        step_exprs.append(namespaced_expr)
        all_params.update(mapped)

    return step_exprs, all_params


def build_segment_cases(groups: List[dict], resolver) -> Tuple[List[Dict[str, str]], Dict[str, Any]]:
    """Build segment_key expressions per group."""
    cases: List[Dict[str, str]] = []
    all_params: Dict[str, Any] = {}

    for idx, group in enumerate(groups, start=1):
        key = group.get("name") or f"Group {idx}"
        if key.strip().upper() == "ALL":
            continue
        conditions = group.get("condition") if isinstance(group, dict) else None
        where_sql, where_params, having_sql, having_params = build_where_clause(
            conditions or [], resolver
        )
        expr = _build_condition_expression(where_sql, having_sql)
        namespaced_expr, mapped = _namespace_params(
            expr,
            {**where_params, **having_params},
            f"g{idx}_",
        )
        cases.append({"key": key, "condition": namespaced_expr})
        all_params.update(mapped)

    return cases, all_params


def fetch_funnel_session_closed(
    *,
    step_conditions: List[dict],
    groups: List[dict],
    params: Dict[str, Any],
    include_status: bool = True,
    resolver=None,
) -> List[Dict[str, Any]]:
    """Run the dynamic session-based funnel query."""
    if resolver is None:
        raise ValueError("resolver is required for building field expressions.")

    step_exprs, step_params = build_funnel_step_filters(step_conditions, resolver)
    segment_cases, segment_params = build_segment_cases(groups, resolver)

    all_params = {
        **params,
        **step_params,
        **segment_params,
        "step_exprs": step_exprs,
        "segment_cases": segment_cases,
        "include_status": include_status,
    }

    sql = SQL.render(
        "funnel.sessionClosed",
        {
            "step_exprs": step_exprs,
            "segment_cases": segment_cases,
            "include_status": include_status,
        },
    )

    # Log to both uvicorn logger and stdout so it is visible regardless of handler config.
    # logger = logging.getLogger("uvicorn.error")
    # logger.info("[FunnelDetail][SQL] %s", sql)
    # logger.info("[FunnelDetail][PARAMS] %s", all_params)
    print("[FunnelDetail][SQL]", sql, flush=True)
    print("[FunnelDetail][PARAMS]", all_params, flush=True)

    client = get_client()
    result = client.query(sql, all_params)
    rows: List[Dict[str, Any]] = []
    for row in result.result_rows:
        payload = dict(zip(result.column_names, row))
        rows.append(payload)
    return rows


def fetch_funnel_session_open(
    *,
    step_conditions: List[dict],
    groups: List[dict],
    params: Dict[str, Any],
    include_status: bool | None = None,
    resolver=None,
) -> List[Dict[str, Any]]:
    """Run the dynamic open-funnel query."""
    if resolver is None:
        raise ValueError("resolver is required for building field expressions.")

    step_exprs, step_params = build_funnel_step_filters(step_conditions, resolver)
    segment_cases, segment_params = build_segment_cases(groups, resolver)

    all_params = {
        **params,
        **step_params,
        **segment_params,
        "step_exprs": step_exprs,
        "segment_cases": segment_cases,
    }

    sql = SQL.render(
        "funnel.sessionOpen",
        {
            "step_exprs": step_exprs,
            "segment_cases": segment_cases,
        },
    )

    # logger = logging.getLogger("uvicorn.error")
    # logger.info("[FunnelDetail][SQL][open] %s", sql)
    # logger.info("[FunnelDetail][PARAMS][open] %s", all_params)
    print("[FunnelDetail][SQL][open]", sql, flush=True)
    print("[FunnelDetail][PARAMS][open]", all_params, flush=True)

    client = get_client()
    result = client.query(sql, all_params)
    rows: List[Dict[str, Any]] = []
    for row in result.result_rows:
        payload = dict(zip(result.column_names, row))
        rows.append(payload)
    return rows
