from __future__ import annotations

import csv
import json
from datetime import datetime, timedelta
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

from pydantic import BaseModel

from apiserver import app
try:
    from .clickhouse.repository import (
        fetch_discover_group_metrics,
        fetch_discover_step_metrics,
        fetch_funnel_session_closed,
        fetch_funnel_session_open,
    )
except Exception as _clickhouse_exc:  # clickhouse dependency might be optional for other endpoints
    fetch_discover_group_metrics = None  # type: ignore
    fetch_discover_step_metrics = None  # type: ignore
    fetch_funnel_session_closed = None  # type: ignore
    fetch_funnel_session_open = None  # type: ignore
    _CLICKHOUSE_IMPORT_ERROR = _clickhouse_exc
else:
    _CLICKHOUSE_IMPORT_ERROR = None
logger = logging.getLogger("uvicorn.error")
from .clickhouse_condition_builder import build_where_clause
from .funnelModels import (
    FunnelListRequest,
    FunnelListResponse,
    FunnelDetailRequest,
    FunnelDetailResponse,
    FunnelAddEditRequest,
    FunnelAddEditResponse,
    FunnelListChangeOrderRequest,
    FunnelListChangeOrderResponse,
    FunnelDeleteRequest,
    FunnelDeleteResponse,
    GroupAddEditRequest,
    GroupAddEditResponse,
    GroupDeleteRequest,
    GroupDeleteResponse,
    GroupListRequest,
    GroupListResponse,
    ConditionCatalogRequest,
    ConditionCatalogResponse,
    ConditionCatalog,
    FilterCatalogRequest,
    FilterCatalogResponse,
    FilterCatalog,
    DiscoverGroupRequest,
    DiscoverGroupResponse,
    DiscoverStepRequest,
    DiscoverStepResponse,
)

DATA_DIR = Path(__file__).resolve().parent.parent / "Data"
CONDITION_CATEGORY_CSV = DATA_DIR / "marketing.condition_category.csv"
CONDITION_FIELD_CSV = DATA_DIR / "marketing.condition_field.csv"
FILTER_CSV = DATA_DIR / "marketing.filter.csv"
GROUP_CSV = DATA_DIR / "marketing.group.csv"
GROUP_FIELDNAMES = ["id", "nm", "desc", "condition", "order", "userId"]
FUNNEL_CSV = DATA_DIR / "marketing.funnel_info.csv"
FUNNEL_FIELDNAMES = ["id", "nm", "period", "route", "step", "chart", "order", "userId"]
FUNNEL_GROUP_MAP_CSV = DATA_DIR / "marketing.group_by_id.csv"
FUNNEL_GROUP_MAP_FIELDS = ["pid", "id"]
FUNNEL_SAMPLE_CSV = DATA_DIR / "marketing.funnel_sample.csv"
DISCOVER_STEP_CSV = DATA_DIR / "marketing.discover_step.csv"
DISCOVERY_BASE_TABLE = "maxy_mkt_event_log"


class ConditionPreviewRequest(BaseModel):
    """조건/기간을 받아 ClickHouse SQL 프리뷰를 생성하기 위한 요청 모델."""

    condition: Optional[List[Dict[str, Any]]] = None
    period: Optional[Dict[str, Any]] = None


class ConditionPreviewResponse(BaseModel):
    code: int = 200
    data: Dict[str, Any]
    message: Optional[str] = None


def _parse_bool(value: str | None) -> bool:
    if value is None:
        return False
    return value.strip().lower() in {"1", "true", "t", "y", "yes"}


def _safe_int(value: str | int | None) -> int:
    try:
        if value in ("", None):
            return 0
        return int(value)
    except (TypeError, ValueError):
        return 0


def _safe_float(value: str | int | float | None) -> float:
    try:
        if value in ("", None):
            return 0.0
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _load_condition_catalog_from_csv() -> ConditionCatalog:
    category_rows: list[dict[str, str]] = []
    field_rows: list[dict[str, str]] = []

    with CONDITION_CATEGORY_CSV.open(encoding="utf-8-sig", newline="") as fp:
        reader = csv.DictReader(fp)
        category_rows.extend(reader)

    with CONDITION_FIELD_CSV.open(encoding="utf-8-sig", newline="") as fp:
        reader = csv.DictReader(fp)
        field_rows.extend(reader)

    if not category_rows:
        raise ValueError("Condition category table is empty.")

    categories: dict[int, dict] = {}
    category_types: dict[int, str] = {}

    for row in category_rows:
        try:
            category_id = int(row.get("id") or 0)
            order = int(row.get("order") or 0)
        except ValueError as error:
            raise ValueError(f"Invalid category row: {row}") from error

        if category_id == 0:
            continue

        categories[category_id] = {
            "order": order,
            "id": category_id,
            "name": row.get("name", ""),
            "enable_step": _parse_bool(row.get("enable_step")),
            "sub": [],
        }
        category_types[category_id] = (row.get("group_type") or "standard").strip().lower()

    for row in field_rows:
        try:
            condition_id = int(row.get("id") or 0)
            category_id = int(row.get("category_id") or 0)
            order = int(row.get("order") or 0)
        except ValueError:
            continue

        if condition_id == 0 or category_id == 0 or category_id not in categories:
            continue

        defaults_raw = (row.get("defaults_json") or "").strip()
        defaults: list[str] = []
        if defaults_raw:
            try:
                parsed = json.loads(defaults_raw)
                if isinstance(parsed, list):
                    defaults = parsed
            except json.JSONDecodeError:
                defaults = []

        categories[category_id]["sub"].append(
            {
                "order": order,
                "id": condition_id,
                "name": row.get("name", ""),
                "default": defaults,
            }
        )

    for category in categories.values():
        category["sub"].sort(key=lambda item: item.get("order", 0))

    event_payload = None
    standard_payloads: list[dict] = []
    for category_id, payload in categories.items():
        group_type = category_types.get(category_id, "standard")
        if group_type == "event":
            event_payload = payload
        else:
            standard_payloads.append(payload)

    standard_payloads.sort(key=lambda item: item.get("order", 0))

    return ConditionCatalog(event=event_payload, standard=standard_payloads)


def _load_filter_catalog_from_csv() -> FilterCatalog:
    with FILTER_CSV.open(encoding="utf-8-sig", newline="") as fp:
        reader = csv.DictReader(fp)
        rows = list(reader)

    if not rows:
        raise ValueError("Filter table is empty.")

    options: list[dict] = []
    for row in rows:
        try:
            option_id = int(row.get("id") or 0)
            order = int(row.get("order") or 0)
        except ValueError:
            continue

        if option_id == 0:
            continue

        options.append(
            {
                "id": option_id,
                "order": order,
                "name": row.get("name", ""),
            }
        )

    options.sort(key=lambda option: option.get("order", 0))
    return FilterCatalog(options=options)


def _resolve_field_expression(row: Dict[str, Any]) -> str | None:
    """조건 row를 ClickHouse 컬럼/표현식 문자열로 변환."""
    field_id = row.get("fieldId") or row.get("id")
    field_name = (row.get("field") or "").strip()

    # 필드 id가 없으면 필드명으로 매핑
    try:
        numeric_id = int(field_id)
    except Exception:
        numeric_id = None

    if numeric_id == 11:
        return "is_first_open"
    if numeric_id == 12:
        return "toInt64(length(coalesce(user_id, '')) > 0)"
    if numeric_id == 13:
        return "JSONExtractString(toString(user_properties), 'grade')"
    if numeric_id == 14:
        # 최근 이벤트 기준 active/sleep/dropoff 상태 계산
        return (
            "multiIf("
            "event_time >= now() - INTERVAL 30 DAY, 'active', "
            "event_time >= now() - INTERVAL 60 DAY, 'sleep', "
            "'dropoff')"
        )
    if numeric_id == 21:
        return "platform"
    if numeric_id == 22:
        return "device_category"
    if numeric_id == 23:
        return "os_category"
    if numeric_id == 24:
        return "app_version"
    if numeric_id == 25:
        return "browser"
    if numeric_id == 31:
        # page_view + page_name
        return "event_name = 'page_view' AND JSONExtractString(toString(event_params), 'page_name')"
    if numeric_id == 32:
        # page_view + path+query
        return (
            "event_name = 'page_view' AND "
            "concat(JSONExtractString(toString(event_params), 'path'), "
            "JSONExtractString(toString(event_params), 'query'))"
        )
    if numeric_id == 33:
        # page_view + host
        return "event_name = 'page_view' AND JSONExtractString(toString(event_params), 'host')"
    if numeric_id == 51:
        return "traffic_source"
    if numeric_id == 52:
        return "medium"
    if numeric_id == 53:
        return "campaign"
    if numeric_id == 61:
        return "event_name"
    if numeric_id == 62:
        return "is_important_event"
    if numeric_id is not None and numeric_id >= 91:
        # Event category: if a value is provided, compare against event_params.value, otherwise event_name
        raw_value = row.get("value")
        has_value = raw_value not in (None, "")
        if has_value:
            return "JSONExtractString(toString(event_params), 'value')"
        return "event_name"

    if not field_name:
        return None

    # 공백/특수문자는 언더바로 치환
    safe_key = "".join(char if char.isalnum() or char in {"_", "-"} else "_" for char in field_name)

    # event_params / user_properties 모두에서 조회
    return (
        "coalesce("
        f"JSONExtractString(toString(event_params), '{safe_key}'), "
        f"JSONExtractString(toString(user_properties), '{safe_key}'))"
    )


def _format_sql_with_params(query: str, params: Dict[str, Any]) -> str:
    """미리보기 용으로 %(p1)s 플레이스홀더를 실제 값으로 치환."""

    def _quote(value: Any) -> str:
        if value is None:
            return "NULL"
        if isinstance(value, bool):
            return "1" if value else "0"
        if isinstance(value, (int, float)):
            return str(value)
        # 문자열은 작은따옴표 이스케이프
        text = str(value).replace("'", "''")
        return f"'{text}'"

    format_params = {key: _quote(val) for key, val in params.items()}
    try:
        return query % format_params
    except Exception:
        return query


def _extract_period(period: Dict[str, Any] | None) -> Dict[str, str] | None:
    if not isinstance(period, dict):
        return None
    start = (period.get("from") or period.get("startDate") or period.get("start")) or ""
    end = (period.get("to") or period.get("endDate") or period.get("end")) or ""
    start = str(start).strip()
    end = str(end).strip()
    if not start or not end:
        return None
    return {"from": start, "to": end}


def _default_period_range(days: int = 7) -> Dict[str, str]:
    now = datetime.utcnow()
    start = now - timedelta(days=days)
    return {
        "from": start.strftime("%Y-%m-%d %H:%M:%S"),
        "to": now.strftime("%Y-%m-%d %H:%M:%S"),
    }


def _coerce_period_value(raw: Any) -> Dict[str, str] | None:
    """Accept dict or JSON string for period and normalize."""
    if isinstance(raw, dict):
        return _extract_period(raw)
    if isinstance(raw, str):
        text = raw.strip()
        if text.startswith("{"):
            try:
                parsed = json.loads(text)
                if isinstance(parsed, dict):
                    return _extract_period(parsed)
            except json.JSONDecodeError:
                return None
    return None


def _normalize_condition_payload(condition: list | None) -> list[dict]:
    if not isinstance(condition, list):
        return []
    normalized_blocks: list[dict] = []
    for block_index, block in enumerate(condition, start=1):
        if not isinstance(block, dict):
            continue
        rows = block.get("conditions")
        if not isinstance(rows, list):
            continue
        normalized_rows: list[dict] = []
        for row_index, row in enumerate(rows, start=1):
            if not isinstance(row, dict):
                continue
            filtered_row = dict(row)
            value_exists = "value" in filtered_row
            if value_exists:
                raw_value = filtered_row.get("value")
                is_blank_str = isinstance(raw_value, str) and raw_value.strip() == ""
                is_none = raw_value is None
                is_empty_iterable = isinstance(raw_value, (list, tuple)) and len(raw_value) == 0
                if is_blank_str or is_none or is_empty_iterable:
                    filtered_row.pop("value", None)
                    value_exists = False
            if not value_exists and filtered_row.get("type") != "count":
                if "operator" in filtered_row:
                    filtered_row["operator"] = 5
            filtered_row["order"] = row_index
            # count 타입에서도 필드 id는 그대로 사용
            field_id = filtered_row.get("fieldId") or filtered_row.get("id")
            try:
                numeric_id = int(field_id)
            except Exception:
                numeric_id = None

            normalized_rows.append(filtered_row)
        if normalized_rows:
            normalized_blocks.append(
                {
                    "order": block_index,
                    "conditions": normalized_rows,
                }
            )
    return normalized_blocks


def _build_discover_group_query_parts(
    condition: list | None,
    period: Dict[str, Any] | None,
) -> tuple[str, str, str, Dict[str, Any]]:
    normalized_condition = _normalize_condition_payload(condition)
    where_sql, where_params, having_sql, having_params = build_where_clause(
        normalized_condition, _resolve_field_expression
    )

    resolved_period = _extract_period(period)
    period_clause = ""
    period_params: Dict[str, Any] = {}
    if resolved_period:
        period_clause = (
            "event_time >= toDateTime(%(p_from)s) AND "
            "event_time < toDateTime(%(p_to)s) + INTERVAL 1 DAY"
        )
        period_params["p_from"] = resolved_period["from"]
        period_params["p_to"] = resolved_period["to"]

    all_params: Dict[str, Any] = {**period_params, **where_params, **having_params}
    return where_sql, having_sql, period_clause, all_params


@app.post(
    "/PFunnelAnalysis/DiscoverGroupPreview",
    response_model=ConditionPreviewResponse,
    summary="[PFunnelAnalysis] DiscoverGroupPreview",
)
async def discover_group_preview(request: ConditionPreviewRequest) -> ConditionPreviewResponse:
    """발견 그룹 미리보기 (SQL/파라미터 확인용)
    Args:
        request (ConditionPreviewRequest):
    
        {
            "condition": [
                {
                    "order": 1,
                    "conditions": [
                        {"order": 1, "id": 11, "field": "가입경로", "operator": 5, "value": "new"},
                        {"order": 2, "id": 21, "field": "OS", "operator": 5, "value": "Android"}
                    ]
                }
            ],
            "period": { "from": "2025-01-01 00:00:00", "to": "2025-01-07 23:59:59" }
        }

    Returns:
        ConditionPreviewResponse: WHERE/HAVING SQL과 파라미터, 미리보기 문자열
    
        {
            "code": 200,
            "data": {
                "sql": "...",       // 원본 템플릿 SQL
                "params": {...},    // 바인딩 파라미터
                "preview": "...",   // 파라미터가 치환된 SQL
                "findCount": 123,
                "totalCount": 456,
                "rate": 0.27
            }
        }
    """

    if fetch_discover_group_metrics is None:
        message = (
            "ClickHouse client is not available."
            if _CLICKHOUSE_IMPORT_ERROR is None
            else str(_CLICKHOUSE_IMPORT_ERROR)
        )
        print("[DiscoverGroupPreview] ERROR:", message)
        return ConditionPreviewResponse(code=500, data={}, message=message)

    if fetch_discover_group_metrics is None:
        return DiscoverGroupResponse(
            code=500,
            data={},
            message=(
                "ClickHouse client is not available."
                if _CLICKHOUSE_IMPORT_ERROR is None
                else str(_CLICKHOUSE_IMPORT_ERROR)
            ),
        )

    where_sql, having_sql, period_clause, all_params = _build_discover_group_query_parts(
        request.condition, request.period
    )

    try:
        metrics, final_query = fetch_discover_group_metrics(
            base_source=DISCOVERY_BASE_TABLE,
            where_sql=where_sql,
            having_sql=having_sql,
            period_clause=period_clause,
            params=all_params,
        )
    except Exception as exc:
        message = str(exc)
        print("[DiscoverGroupPreview] ERROR:", message)
        return ConditionPreviewResponse(
            code=500,
            data={},
            message=message,
        )

    preview_query = _format_sql_with_params(final_query, all_params)
    print("[DiscoverGroupPreview] SQL:", final_query)
    print("[DiscoverGroupPreview] PARAMS:", all_params)
    print("[DiscoverGroupPreview] PREVIEW:", preview_query)

    return ConditionPreviewResponse(
        code=200,
        data={
            "sql": final_query,
            "params": all_params,
            "preview": preview_query,
            "findCount": metrics.findCount,
            "totalCount": metrics.totalCount,
            "rate": metrics.rate,
        },
    )


def _load_discover_metrics_from_csv(csv_path: Path, user_id: str | None) -> dict[str, float | int]:
    if not csv_path.exists():
        raise FileNotFoundError(f"{csv_path.name} not found.")

    with csv_path.open(encoding="utf-8-sig", newline="") as fp:
        reader = csv.DictReader(fp)
        rows = list(reader)

    if not rows:
        raise ValueError(f"{csv_path.name} is empty.")

    normalized_user = (user_id or "").strip()
    target_row: dict[str, str] | None = None
    default_row: dict[str, str] | None = None

    for row in rows:
        row_user = str(row.get("userId") or "").strip()
        if normalized_user and row_user == normalized_user:
            target_row = row
            break
        if default_row is None and (not row_user or row_user.lower() in {"*", "default", "all"}):
            default_row = row

    resolved_row = target_row or default_row or rows[0]
    return {
        "findCount": _safe_int(resolved_row.get("findCount")),
        "rate": _safe_float(resolved_row.get("rate")),
    }


def _read_group_rows() -> list[dict[str, str]]:
    if not GROUP_CSV.exists():
        return []
    with GROUP_CSV.open(encoding="utf-8-sig", newline="") as fp:
        reader = csv.DictReader(fp)
        return list(reader)


def _write_group_rows(rows: list[dict[str, str]]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    sorted_rows = sorted(
        rows,
        key=lambda row: (
            _safe_int(row.get("order")),
            _safe_int(row.get("id")),
        ),
    )
    with GROUP_CSV.open("w", encoding="utf-8", newline="") as fp:
        writer = csv.DictWriter(fp, fieldnames=GROUP_FIELDNAMES)
        writer.writeheader()
        for row in sorted_rows:
            payload = {}
            for field in GROUP_FIELDNAMES:
                value = row.get(field, "")
                payload[field] = "" if value is None else str(value)
            writer.writerow(payload)


def _load_groups_for_user(user_id: str | None) -> list[dict]:
    normalized_user = (user_id or "").strip()
    rows = _read_group_rows()
    groups: list[dict] = []

    for row in rows:
        if normalized_user and row.get("userId", "").strip() != normalized_user:
            continue
        group_id = _safe_int(row.get("id"))
        order = _safe_int(row.get("order"))
        if group_id == 0:
            continue

        condition_raw = row.get("condition") or "[]"
        try:
            condition_value = json.loads(condition_raw)
        except json.JSONDecodeError:
            condition_value = []

        groups.append(
            {
                "id": group_id,
                "name": row.get("nm", ""),
                "description": row.get("desc", ""),
                "order": order,
                "condition": condition_value,
            }
        )

    groups.sort(key=lambda group: (group.get("order", 0), group.get("id", 0)))
    return groups


def _upsert_group_entry(
    *,
    group_id: int,
    name: str,
    description: str,
    condition: list[dict],
    user_id: str,
) -> None:
    normalized_condition = _normalize_condition_payload(condition)
    rows = _read_group_rows()
    updated = False
    max_id = 0
    max_order = 0

    for row in rows:
        current_id = _safe_int(row.get("id"))
        if current_id == 0:
            continue
        max_id = max(max_id, current_id)
        current_order = _safe_int(row.get("order"))
        max_order = max(max_order, current_order)

        if current_id == group_id and group_id > 0:
            updated = True

    if not updated:
        new_id = max_id + 1 if max_id > 0 else 1
        new_order = max_order + 1 if max_order > 0 else 1
        rows.append(
            {
                "id": str(new_id),
                "nm": name,
                "desc": description,
                "condition": json.dumps(normalized_condition, ensure_ascii=False),
                "order": str(new_order),
                "userId": user_id,
            }
        )
    else:
        for row in rows:
            current_id = _safe_int(row.get("id"))
            if current_id != group_id:
                continue
            row["nm"] = name
            row["desc"] = description
            row["condition"] = json.dumps(normalized_condition, ensure_ascii=False)
            row["userId"] = user_id

    _write_group_rows(rows)


def _delete_group_entry(group_id: int) -> None:
    rows = _read_group_rows()
    if not rows:
        return
    filtered = []
    for row in rows:
        current_id = _safe_int(row.get("id"))
        if current_id == 0:
            continue
        if current_id == group_id:
            continue
        filtered.append(row)
    _write_group_rows(filtered)


def _read_funnel_rows() -> list[dict[str, str]]:
    if not FUNNEL_CSV.exists():
        return []
    with FUNNEL_CSV.open(encoding="utf-8-sig", newline="") as fp:
        reader = csv.DictReader(fp)
        return list(reader)


def _write_funnel_rows(rows: list[dict[str, str]]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    sorted_rows = sorted(
        rows,
        key=lambda row: (_safe_int(row.get("order")), _safe_int(row.get("id"))),
    )
    with FUNNEL_CSV.open("w", encoding="utf-8", newline="") as fp:
        writer = csv.DictWriter(fp, fieldnames=FUNNEL_FIELDNAMES)
        writer.writeheader()
        for row in sorted_rows:
            payload = {}
            for field in FUNNEL_FIELDNAMES:
                value = row.get(field, "")
                payload[field] = "" if value is None else str(value)
            writer.writerow(payload)


def _read_sample_rows() -> list[dict[str, str]]:
    if not FUNNEL_SAMPLE_CSV.exists():
        return []
    with FUNNEL_SAMPLE_CSV.open(encoding="utf-8-sig", newline="") as fp:
        reader = csv.DictReader(fp)
        return list(reader)


def _write_sample_rows(rows: list[dict[str, str]]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with FUNNEL_SAMPLE_CSV.open("w", encoding="utf-8", newline="") as fp:
        writer = csv.DictWriter(
            fp,
            fieldnames=[
                "pid",
                "step_order",
                "group_id",
                "active_count",
                "dropoff_count",
                "conversion_rate",
                "dropoff_rate",
            ],
        )
        writer.writeheader()
        writer.writerows(rows)


def _generate_sample_metrics(step_order: int, group_position: int) -> dict[str, int]:
    base_active = max(10, 150 - step_order * 20 - group_position * 5)
    dropoff = min(100, 10 + step_order * 5 + group_position * 3)
    conversion = max(0, min(100, 100 - dropoff))
    return {
        "active_count": base_active,
        "dropoff_count": dropoff,
        "conversion_rate": conversion,
        "dropoff_rate": 100 - conversion,
    }


def _sync_sample_rows(funnel_id: int, steps: list[dict], group_ids: list[int]) -> None:
    rows = _read_sample_rows()
    rows = [row for row in rows if _safe_int(row.get("pid")) != funnel_id]

    if not steps or not group_ids:
        _write_sample_rows(rows)
        return

    for step_index, step in enumerate(steps, start=1):
        order = step.get("order")
        resolved_order = order if isinstance(order, int) and order > 0 else step_index
        for position, group_id in enumerate(group_ids, start=1):
            if group_id <= 0:
                continue
            metrics = _generate_sample_metrics(resolved_order, position)
            rows.append(
                {
                    "pid": str(funnel_id),
                    "step_order": str(resolved_order),
                    "group_id": str(group_id),
                    **{key: str(value) for key, value in metrics.items()},
                }
            )

    _write_sample_rows(rows)


def _read_sample_rows() -> list[dict[str, str]]:
    if not FUNNEL_SAMPLE_CSV.exists():
        return []
    with FUNNEL_SAMPLE_CSV.open(encoding="utf-8-sig", newline="") as fp:
        reader = csv.DictReader(fp)
        return list(reader)


def _write_sample_rows(rows: list[dict[str, str]]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with FUNNEL_SAMPLE_CSV.open("w", encoding="utf-8", newline="") as fp:
        writer = csv.DictWriter(
            fp,
            fieldnames=[
                "pid",
                "step_order",
                "group_id",
                "active_count",
                "dropoff_count",
                "conversion_rate",
                "dropoff_rate",
            ],
        )
        writer.writeheader()
        writer.writerows(rows)


def _generate_sample_metrics(step_order: int, group_position: int) -> dict[str, int]:
    base_active = max(10, 150 - step_order * 20 - group_position * 5)
    dropoff = min(100, 10 + step_order * 5 + group_position * 3)
    conversion_rate = max(0, min(100, 100 - dropoff))
    return {
        "active_count": base_active,
        "dropoff_count": dropoff,
        "conversion_rate": conversion_rate,
        "dropoff_rate": 100 - conversion_rate,
    }


def _sync_sample_rows(funnel_id: int, steps: list[dict], group_ids: list[int]) -> None:
    rows = _read_sample_rows()
    rows = [row for row in rows if _safe_int(row.get("pid")) != funnel_id]

    if not steps or not group_ids:
        _write_sample_rows(rows)
        return

    for step_index, step in enumerate(steps, start=1):
        order = step.get("order")
        resolved_order = order if isinstance(order, int) and order > 0 else step_index
        for position, group_id in enumerate(group_ids, start=1):
            if group_id <= 0:
                continue
            metrics = _generate_sample_metrics(resolved_order, position)
            rows.append(
                {
                    "pid": str(funnel_id),
                    "step_order": str(resolved_order),
                    "group_id": str(group_id),
                    **{key: str(value) for key, value in metrics.items()},
                }
            )

    _write_sample_rows(rows)


def _read_group_map_rows() -> list[dict[str, str]]:
    if not FUNNEL_GROUP_MAP_CSV.exists():
        return []
    with FUNNEL_GROUP_MAP_CSV.open(encoding="utf-8-sig", newline="") as fp:
        reader = csv.DictReader(fp)
        return list(reader)


def _write_group_map_rows(rows: list[dict[str, str]]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with FUNNEL_GROUP_MAP_CSV.open("w", encoding="utf-8", newline="") as fp:
        writer = csv.DictWriter(fp, fieldnames=FUNNEL_GROUP_MAP_FIELDS)
        writer.writeheader()
        for row in rows:
            payload = {}
            for field in FUNNEL_GROUP_MAP_FIELDS:
                value = row.get(field, "")
                payload[field] = "" if value is None else str(value)
            writer.writerow(payload)


def _set_funnel_group_mapping(funnel_id: int, group_ids: list[int]) -> None:
    rows = _read_group_map_rows()
    filtered = [
        row
        for row in rows
        if _safe_int(row.get("pid")) != funnel_id
    ]
    seen: set[int] = set()
    for entry in group_ids:
        if isinstance(entry, dict):
            group_id = _safe_int(entry.get("id"))
        else:
            group_id = int(entry) if isinstance(entry, int) else _safe_int(entry)
        if group_id <= 0:
            continue
        if group_id in seen:
            continue
        seen.add(group_id)
        filtered.append({"pid": str(funnel_id), "id": str(group_id)})
    _write_group_map_rows(filtered)


def _remove_funnel_group_mapping(funnel_id: int) -> None:
    rows = _read_group_map_rows()
    filtered = [row for row in rows if _safe_int(row.get("pid")) != funnel_id]
    _write_group_map_rows(filtered)


def _build_group_map_index(rows: list[dict[str, str]]) -> dict[int, list[int]]:
    index: dict[int, list[int]] = {}
    for row in rows:
        pid = _safe_int(row.get("pid"))
        gid = _safe_int(row.get("id"))
        if pid == 0 or gid == 0:
            continue
        index.setdefault(pid, []).append(gid)
    for value in index.values():
        value.sort()
    return index


def _normalize_step_payload(steps: list | None) -> list[dict]:
    if not isinstance(steps, list):
        return []
    normalized: list[dict] = []
    for index, step in enumerate(steps, start=1):
        if not isinstance(step, dict):
            continue
        sanitized = {
            key: value
            for key, value in step.items()
            if key != "groups"
        }
        sanitized["condition"] = _normalize_condition_payload(step.get("condition"))
        sanitized["order"] = index
        if "id" not in sanitized or not isinstance(sanitized["id"], int):
            sanitized["id"] = index
        normalized.append(sanitized)
    return normalized


def _build_group_lookup() -> dict[int, dict]:
    lookup: dict[int, dict] = {}
    rows = _read_group_rows()
    for row in rows:
        group_id = _safe_int(row.get("id"))
        if group_id == 0:
            continue
        condition_raw = row.get("condition") or "[]"
        try:
            condition = json.loads(condition_raw)
        except json.JSONDecodeError:
            condition = []
        lookup[group_id] = {
            "id": group_id,
            "name": row.get("nm", ""),
            "description": row.get("desc", ""),
            "order": _safe_int(row.get("order")),
            "condition": condition,
        }
    return lookup


def _build_group_payloads(group_ids: list[int], lookup: dict[int, dict]) -> list[dict]:
    payloads: list[dict] = []
    for index, group_id in enumerate(group_ids, start=1):
        group = lookup.get(group_id)
        if not group:
            continue
        payloads.append(
            {
                "id": group_id,
                "name": group.get("name", ""),
                "description": group.get("description"),
                "order": index,
                "condition": group.get("condition"),
            }
        )
    return payloads


def _contains_status_condition(payload: Any) -> bool:
    """Detect if the condition tree includes status (fieldId/id == 14)."""
    if isinstance(payload, dict):
        field_id = payload.get("fieldId") or payload.get("id")
        try:
            if int(field_id) == 14:
                return True
        except Exception:
            pass
        for key in ("conditions", "condition", "children"):
            if _contains_status_condition(payload.get(key)):
                return True
        return False
    if isinstance(payload, list):
        return any(_contains_status_condition(item) for item in payload)
    return False


def _parse_period_value(value: str | None):
    if value is None:
        return None
    trimmed = value.strip()
    if not trimmed:
        return None
    try:
        return json.loads(trimmed)
    except json.JSONDecodeError:
        pass
    if trimmed.isdigit():
        return int(trimmed)
    return trimmed


def _build_funnel_summary(row: dict[str, str], map_index: dict[int, list[int]], group_lookup: dict[int, dict]) -> dict:
    funnel_id = _safe_int(row.get("id"))
    group_ids = map_index.get(funnel_id, [])
    try:
        steps = json.loads(row.get("step") or "[]")
    except json.JSONDecodeError:
        steps = []
    return {
        "id": funnel_id,
        "name": row.get("nm", ""),
        "order": _safe_int(row.get("order")),
        "route": _safe_int(row.get("route")),
        "chart": _safe_int(row.get("chart")),
        "period": _parse_period_value(row.get("period")),
        "userId": row.get("userId"),
        "step": steps,
        "group": _build_group_payloads(group_ids, group_lookup),
    }


def _build_detail_steps(
    step_rows: list,
    group_payloads: list[dict],
    sample_rows: list[dict] | None = None,
) -> list[dict]:
    detail_groups = [
        {
            "id": group.get("id"),
            "order": idx,
            "name": group.get("name"),
            "active_count": 0,
            "dropoff_count": None,
            "conversion_rate": None,
            "dropoff_rate": None,
        }
        for idx, group in enumerate(group_payloads, start=1)
    ]

    sample_index: dict[tuple[int, int], dict] = {}
    if sample_rows:
        for row in sample_rows:
            step_order = _safe_int(row.get("step_order"))
            group_id = _safe_int(row.get("group_id"))
            if step_order == 0 or group_id == 0:
                continue
            sample_index[(step_order, group_id)] = row

    detail_steps: list[dict] = []
    if not isinstance(step_rows, list):
        step_rows = []
    for index, step in enumerate(step_rows, start=1):
        if not isinstance(step, dict):
            continue

        resolved_order = step.get("order") if isinstance(step.get("order"), int) else index
        groups = []
        for group in detail_groups:
            row = dict(group)
            sample = sample_index.get((resolved_order, group.get("id")))
            if sample:
                row["active_count"] = _safe_int(sample.get("active_count"))
                row["dropoff_count"] = _safe_int(sample.get("dropoff_count"))
                row["conversion_rate"] = _safe_int(sample.get("conversion_rate"))
                row["dropoff_rate"] = _safe_int(sample.get("dropoff_rate"))
            groups.append(row)

        detail_steps.append(
            {
                "id": step.get("id") if isinstance(step.get("id"), int) else index,
                "stepnm": step.get("stepnm") or f"Step {index}",
                "order": resolved_order,
                "condition": step.get("condition"),
                "groups": groups,
            }
        )
    return detail_steps


def _build_detail_steps_from_clickhouse(
    step_rows: list,
    group_payloads: list[dict],
    result_rows: list[dict],
) -> list[dict]:
    step_count = len(step_rows) if isinstance(step_rows, list) else 0
    if step_count == 0:
        return []

    # Map segment_key -> counts
    result_map: Dict[str, dict] = {}
    for row in result_rows:
        key = str(row.get("segment_key") or "").strip()
        if not key:
            continue
        result_map[key] = row

    # Prepare group info using provided payloads; if none, fall back to result keys.
    detail_groups = []
    if group_payloads:
        for idx, group in enumerate(group_payloads, start=1):
            detail_groups.append(
                {
                    "id": group.get("id"),
                    "order": idx,
                    "name": group.get("name") or f"Group {idx}",
                }
            )
    else:
        for idx, key in enumerate(sorted(result_map.keys()), start=1):
            detail_groups.append({"id": None, "order": idx, "name": key})

    detail_steps: list[dict] = []
    for index, step in enumerate(step_rows, start=1):
        resolved_order = step.get("order") if isinstance(step.get("order"), int) else index
        groups: list[dict] = []

        for group in detail_groups:
            key = group.get("name") or "ALL"
            row = result_map.get(key, {})
            current = _safe_int(row.get(f"step{index}_users"))
            next_count = _safe_int(row.get(f"step{index + 1}_users")) if index < step_count else 0
            entrance_count = _safe_int(row.get(f"step{index}_entrance")) if index > 1 else None
            skipped_count = None
            if index >= 3:
                raw_skip = row.get(f"step{index}_skipped")
                skipped_count = _safe_int(raw_skip) if raw_skip is not None else None

            active_count = current
            dropoff_from_query = None
            raw_drop = row.get(f"step{index}_dropped")
            if raw_drop is not None:
                dropoff_from_query = _safe_int(raw_drop)
            if dropoff_from_query is not None:
                dropoff_count = dropoff_from_query
            elif index < step_count:
                dropoff_count = max(active_count - next_count, 0)
            else:
                dropoff_count = None

            conversion_rate = None
            dropoff_rate = None
            if index < step_count:
                conv_val = row.get(f"step{index + 1}_conversion")
                if conv_val is not None:
                    conversion_rate = _safe_float(conv_val)
                    dropoff_rate = round(max(100 - conversion_rate, 0), 2)
                else:
                    conversion_rate = round((next_count / active_count) * 100, 2) if active_count > 0 else 0
                    dropoff_rate = round(100 - conversion_rate, 2) if active_count > 0 else 0

            groups.append(
                {
                    "id": group.get("id"),
                    "order": group.get("order"),
                    "name": key,
                    "active_count": active_count,
                    "dropoff_count": dropoff_count,
                    "conversion_rate": conversion_rate,
                    "dropoff_rate": dropoff_rate,
                    "entrance_count": entrance_count,
                    "skipped_count": skipped_count,
                }
            )

        detail_steps.append(
            {
                "id": step.get("id") if isinstance(step.get("id"), int) else index,
                "stepnm": step.get("stepnm") or f"Step {index}",
                "order": resolved_order,
                "condition": step.get("condition"),
                "groups": groups,
            }
        )

    return detail_steps


@app.post(
    "/PFunnelAnalysis/FunnelList",
    response_model=FunnelListResponse,
    summary="[PFunnelAnalysis] FunnelList",
)
async def funnel_list(request: FunnelListRequest) -> FunnelListResponse:
    """퍼널 목록 조회
    Args:
        request (FunnelListRequest): 퍼널 목록 조회 요청

        {
            "applicationId": 1,
            "userId": "admin",
            "type": 1
        }

    Returns:
        FunnelListResponse: 퍼널 목록

        {
            "code": 200,
            "list": [
                {"id": 1, "name": "회원 여정 퍼널", "order": 1, ...},
                ...
            ]
        }
    """
    logger = logging.getLogger("uvicorn.error")
    logger.info("[FunnelDetail] request payload: %s", request.model_dump())
    print("[FunnelDetail] request payload:", request.model_dump(), flush=True)
    logger.info("[FunnelDetail] request payload: %s", request.model_dump())
    print("[FunnelDetail] request payload:", request.model_dump(), flush=True)
    rows = _read_funnel_rows()
    map_rows = _read_group_map_rows()
    map_index = _build_group_map_index(map_rows)
    group_lookup = _build_group_lookup()
    user_filter = (request.userId or "").strip()

    summaries: list[dict] = []
    for row in rows:
        if user_filter and row.get("userId", "").strip() != user_filter:
            continue
        summaries.append(_build_funnel_summary(row, map_index, group_lookup))

    return FunnelListResponse(code=200, list=summaries)


@app.post(
    "/PFunnelAnalysis/FunnelDetail",
    response_model=FunnelDetailResponse,
    summary="[PFunnelAnalysis] FunnelDetail",
)
async def funnel_detail(request: FunnelDetailRequest) -> FunnelDetailResponse:
    """퍼널 상세 조회
    Args:
        request (FunnelDetailRequest): 퍼널 상세 조회 요청

        {
            "id": 1,
            "group": "1,2",
            "period": { "from": "2025-01-01 00:00:00", "to": "2025-01-31 23:59:59" },
            "route": 1   // 1: closed, 2: open
        }

    Returns:
        FunnelDetailResponse: 단계·그룹별 상세 결과

        {
            "code": 200,
            "list": [
                {"id": 1, "stepnm": "회원가입", "order": 1, "groups": [...], ...},
                ...
            ]
        }
    """
    logger = logging.getLogger("uvicorn.error")
    logger.info("[FunnelDetail] request payload: %s", request.model_dump())
    print("[FunnelDetail] request payload:", request.model_dump(), flush=True)

    rows = _read_funnel_rows()
    target_row = None
    for row in rows:
        if _safe_int(row.get("id")) == request.id:
            target_row = row
            break

    if target_row is None:
        return FunnelDetailResponse(code=404, message="Funnel not found", list=[])

    try:
        step_rows = json.loads(target_row.get("step") or "[]")
    except json.JSONDecodeError:
        step_rows = []

    map_rows = _read_group_map_rows()
    map_index = _build_group_map_index(map_rows)
    group_lookup = _build_group_lookup()
    group_payloads = _build_group_payloads(map_index.get(request.id, []), group_lookup)

    route_type = _safe_int(target_row.get("route"))
    if request.route is not None:
        override_route = _safe_int(request.route)
        if override_route in (1, 2):
            route_type = override_route
    use_open_funnel = route_type == 2
    query_func = fetch_funnel_session_open if use_open_funnel else fetch_funnel_session_closed

    if query_func is None:
        logger.error("[FunnelDetail] ClickHouse fetch unavailable: %s", _CLICKHOUSE_IMPORT_ERROR)
        print("[FunnelDetail] ClickHouse fetch unavailable:", _CLICKHOUSE_IMPORT_ERROR, flush=True)
        return FunnelDetailResponse(
            code=500,
            message=("ClickHouse client is not available." if _CLICKHOUSE_IMPORT_ERROR is None else str(_CLICKHOUSE_IMPORT_ERROR)),
            list=[],
        )

    period_range = _extract_period(request.period) or _coerce_period_value(target_row.get("period"))
    if period_range is None:
        period_range = _default_period_range()

    include_status = False

    try:
        logger.info("[FunnelDetail] using period %s", period_range)
        print("[FunnelDetail] using period", period_range, flush=True)
        logger.info("[FunnelDetail] route_type=%s use_open=%s", route_type, use_open_funnel)
        result_rows = query_func(
            step_conditions=step_rows,
            groups=group_payloads,
            params={"p_from": period_range["from"], "p_to": period_range["to"]},
            include_status=include_status,
            resolver=_resolve_field_expression,
        )
        detail_steps = _build_detail_steps_from_clickhouse(step_rows, group_payloads, result_rows)
    except Exception as exc:
        logger.exception("[FunnelDetail] ClickHouse query failed")
        print("[FunnelDetail] ClickHouse query failed:", exc, flush=True)
        return FunnelDetailResponse(code=500, message=str(exc), list=[])

    return FunnelDetailResponse(code=200, list=detail_steps)


@app.post(
    "/PFunnelAnalysis/FunnelAddEdit",
    response_model=FunnelAddEditResponse,
    summary="[PFunnelAnalysis] FunnelAddEdit",
)
async def funnel_add_edit(request: FunnelAddEditRequest) -> FunnelAddEditResponse:
    """퍼널 등록/수정
    Args:
        request (FunnelAddEditRequest): 퍼널 저장 요청
            
        {
            "id": 0,                        // 신규는 0
            "name": "회원 전환 퍼널",
            "description": "가입→로그인→결제",
            "route": 1,                     // 1: closed, 2: open
            "chart": 1,
            "period": { "from": "...", "to": "..." },
            "group": [{ "id": 1 }],
            "step": [
                {
                    "id": 1,
                    "stepnm": "회원가입",
                    "order": 1,
                    "condition": [ { "order": 1, "conditions": [ ... ] } ]
                }
            ],
            "userId": "admin"
        }

    Returns:
        FunnelAddEditResponse: 저장 결과

        { 
            "code": 200, 
            "msg": "success" 
        }
    """
    if not request.userId:
        return FunnelAddEditResponse(code=400, msg="userId is required")

    rows = _read_funnel_rows()
    normalized_steps = _normalize_step_payload(request.step)
    step_payload = json.dumps(normalized_steps, ensure_ascii=False)

    target_row = None
    max_id = 0
    max_order = 0
    for row in rows:
        funnel_id = _safe_int(row.get("id"))
        max_id = max(max_id, funnel_id)
        max_order = max(max_order, _safe_int(row.get("order")))
        if funnel_id == request.id and request.id > 0:
            target_row = row

    if target_row is None:
        new_id = request.id if request.id > 0 else max_id + 1
        if new_id <= max_id:
            new_id = max_id + 1
        new_order = max_order + 1 if max_order > 0 else 1
        target_row = {
            "id": str(new_id),
            "order": str(new_order),
        }
        rows.append(target_row)
    funnel_id = _safe_int(target_row.get("id"))
    target_row["nm"] = (request.name or "").strip()
    target_row["period"] = json.dumps(request.period, ensure_ascii=False)
    target_row["route"] = str(request.route)
    target_row["step"] = step_payload
    target_row["chart"] = str(request.chart)
    target_row["userId"] = request.userId

    _write_funnel_rows(rows)

    group_ids: list[int] = []
    for group in request.group:
        if isinstance(group, dict):
            group_id = _safe_int(group.get("id"))
        else:
            group_id = getattr(group, "id", None)
        if isinstance(group_id, int) and group_id > 0:
            group_ids.append(group_id)
    _set_funnel_group_mapping(funnel_id, group_ids)
    _sync_sample_rows(funnel_id, normalized_steps, group_ids)

    return FunnelAddEditResponse(code=200, msg="success")


@app.post(
    "/PFunnelAnalysis/FunnelListChangeOrder",
    response_model=FunnelListChangeOrderResponse,
    summary="[PFunnelAnalysis] FunnelListChangeOrder",
)
async def funnel_list_change_order(request: FunnelListChangeOrderRequest) -> FunnelListChangeOrderResponse:
    """퍼널 순서 변경
    Args:
        request (FunnelListChangeOrderRequest):

        {
            "orgId": 3,
            "destId": 2,
            "orgOrder": 2,
            "destOrder": 1
        }

    Returns:
        FunnelListChangeOrderResponse: 
        
        { 
            "code": 200, 
            "msg": "success" 
        }
    """
    rows = _read_funnel_rows()
    if not rows:
        return FunnelListChangeOrderResponse(code=200, msg="success")

    org_id = request.orgId
    dest_id = request.destId
    org_order = request.orgOrder
    dest_order = request.destOrder

    for row in rows:
        funnel_id = _safe_int(row.get("id"))
        if funnel_id == org_id:
            row["order"] = str(org_order)
        elif funnel_id == dest_id:
            row["order"] = str(dest_order)

    _write_funnel_rows(rows)
    return FunnelListChangeOrderResponse(code=200, msg="success")


@app.post(
    "/PFunnelAnalysis/FunnelDelete",
    response_model=FunnelDeleteResponse,
    summary="[PFunnelAnalysis] FunnelDelete",
)
async def funnel_delete(request: FunnelDeleteRequest) -> FunnelDeleteResponse:
    """퍼널 삭제
    Args:
        request (FunnelDeleteRequest): 
        
        {
            "id": 10 
        }

    Returns:
        FunnelDeleteResponse: 
        
        { 
            "code": 200, 
            "msg": "success" 
        }
    """
    rows = _read_funnel_rows()
    remaining = []
    removed = False
    for row in rows:
        funnel_id = _safe_int(row.get("id"))
        if funnel_id == request.id:
            removed = True
            continue
        remaining.append(row)
    if removed:
        _write_funnel_rows(remaining)
        _remove_funnel_group_mapping(request.id)
    return FunnelDeleteResponse(code=200, msg="success")


@app.post(
    "/PFunnelAnalysis/GroupAddEdit",
    response_model=GroupAddEditResponse,
    summary="[PFunnelAnalysis] GroupAddEdit",
)
async def group_add_edit(request: GroupAddEditRequest) -> GroupAddEditResponse:
    """그룹 등록/수정
    Args:
        request (GroupAddEditRequest):

        {
            "id": 0,
            "name": "신규 모바일 사용자",
            "description": "최근 7일 신규+모바일",
            "condition": [
                {
                    "order": 1,
                    "conditions": [
                        {"order": 1, "id": 11, "field": "가입경로", "operator": 5, "value": "new"},
                        {"order": 2, "id": 22, "field": "디바이스", "operator": 5, "value": "mobile"}
                    ]
                }
            ],
            "userId": "admin"
        }

    Returns:
        GroupAddEditResponse: 
        
        { 
            "code": 200, 
            "msg": "success" 
        }
    """
    if not request.userId:
        return GroupAddEditResponse(code=400, msg="userId is required")
    name = (request.name or "").strip()
    if not name:
        return GroupAddEditResponse(code=400, msg="Group name is required")

    description = (request.description or "").strip()
    condition_payload = request.condition if isinstance(request.condition, list) else []

    _upsert_group_entry(
        group_id=request.id,
        name=name,
        description=description,
        condition=condition_payload,
        user_id=request.userId,
    )

    return GroupAddEditResponse(code=200, msg="success")


@app.post(
    "/PFunnelAnalysis/GroupDelete",
    response_model=GroupDeleteResponse,
    summary="[PFunnelAnalysis] GroupDelete",
)
async def group_delete(request: GroupDeleteRequest) -> GroupDeleteResponse:
    """그룹 삭제
    Args:
        request (GroupDeleteRequest): 
        
        { 
            "id": 3 
        }

    Returns:
        GroupDeleteResponse: 
        
        {
            "code": 200, 
            "msg": "success" 
        }
    """
    if request.id and request.id > 0:
        _delete_group_entry(request.id)
    return GroupDeleteResponse(code=200, msg="success")


@app.post(
    "/PFunnelAnalysis/GroupList",
    response_model=GroupListResponse,
    summary="[PFunnelAnalysis] GroupList",
)
async def group_list(request: GroupListRequest) -> GroupListResponse:
    """그룹 목록 조회
    Args:
        request (GroupListRequest): 
        
        {
            "userId": "admin" 
        }

    Returns:
        GroupListResponse:

        {
            "code": 200,
            "list": [
                {"id": 1, "name": "...", "description": "...", "condition": [...]},
                ...
            ]
        }
    """
    groups = _load_groups_for_user(request.userId)
    return GroupListResponse(
        code=200,
        list=groups,
    )


@app.post(
    "/PFunnelAnalysis/ConditionCatalog",
    response_model=ConditionCatalogResponse,
    summary="[PFunnelAnalysis] ConditionCatalog",
)
async def condition_catalog(request: ConditionCatalogRequest) -> ConditionCatalogResponse:
    """ 조건 카탈로그 목록 조회
    Args:
        request (ConditionCatalogRequest): 조건 카탈로그 조회 요청

        {
            "userId": 1
        }
    
    Returns:
        ConditionCatalogResponse: 조건 카탈로그 조회 응답

        {
            "code": 200,
            "data": ConditionCatalog()
        }

    """

    try:
        catalog = _load_condition_catalog_from_csv()
    except FileNotFoundError:
        return ConditionCatalogResponse(
            code=500,
            data=ConditionCatalog(),
            message="Condition data source not found.",
        )
    except ValueError as exc:
        return ConditionCatalogResponse(
            code=500,
            data=ConditionCatalog(),
            message=str(exc),
        )

    return ConditionCatalogResponse(
        code=200,
        data=catalog,
    )


@app.post(
    "/PFunnelAnalysis/FilterCatalog",
    response_model=FilterCatalogResponse,
    summary="[PFunnelAnalysis] FilterCatalog",
)
async def filter_catalog(request: FilterCatalogRequest) -> FilterCatalogResponse:
    """ 필터 조건 목록 조회
    Args:
        request (FilterCatalogRequest): 필터 조건 목록 조회 요청

        {
            "userId": 1
        }
    
    Returns:
        FilterCatalogResponse: 필터 조건 목록 조회 응답

        {
            "code": 200,
            "data": FilterCatalog()
        }
    """

    try:
        catalog = _load_filter_catalog_from_csv()
    except FileNotFoundError:
        return FilterCatalogResponse(
            code=500,
            data=FilterCatalog(),
            message="Filter data source not found.",
        )
    except ValueError as exc:
        return FilterCatalogResponse(
            code=500,
            data=FilterCatalog(),
            message=str(exc),
        )

    return FilterCatalogResponse(
        code=200,
        data=catalog,
    )

@app.post(
    "/PFunnelAnalysis/DiscoverGroup",
    response_model=DiscoverGroupResponse,
    summary="[PFunnelAnalysis] DiscoverGroup",
)
async def discover_group(request: DiscoverGroupRequest) -> DiscoverGroupResponse:
    """발견 그룹 가져오기 (ClickHouse 라이브 조회)
    Args:
        request (DiscoverGroupRequest): 발견 그룹 조회 요청

        예시:
        {
            "userId": "admin",
            "period": { "from": "2025-01-01 00:00:00", "to": "2025-01-07 23:59:59" },
            "condition": [
                {
                    "order": 1,
                    "conditions": [
                        {"order": 1, "id":11, "field": "가입경로", "operator": 5, "value": "new"},
                        {"order": 2, "id":21, "field": "OS", "operator": 5, "value": "Android"},
                        {"order": 3, "id":12, "field": "로그인", "operator": 5, "value": "true"}
                    ]
                },
                {
                    "order": 2,
                    "conditions": [
                        {"order": 1, "id":61, "field": "이벤트명", "operator": 5, "value": 100}
                    ]
                }
            ]
        }
    
    Returns:
        DiscoverGroupResponse: 발견 그룹 조회 응답

        ClickHouse 사용 시:
        {
            "code": 200,
            "data": {
                "findCount": 1234,
                "totalCount": 56789,
                "rate": 0.12,
                "sql": "...",
                "params": {...},
                "preview": "..."
            }
        }

        ClickHouse 미사용 시(CSV fallback):
        {
            "code": 200,
            "data": {
                "findCount": 67,
                "rate": 0.05
            }
        }
    """


    where_sql, having_sql, period_clause, all_params = _build_discover_group_query_parts(
        request.condition, request.period
    )

    try:
        metrics, final_query = fetch_discover_group_metrics(
            base_source=DISCOVERY_BASE_TABLE,
            where_sql=where_sql,
            having_sql=having_sql,
            period_clause=period_clause,
            params=all_params,
        )
    except Exception as exc:
        return DiscoverGroupResponse(
            code=500,
            data={},
            message=str(exc),
        )

    preview_query = _format_sql_with_params(final_query, all_params)
    return DiscoverGroupResponse(
        code=200,
        data={
            "findCount": metrics.findCount,
            "totalCount": metrics.totalCount,
            "rate": metrics.rate,
            "sql": final_query,
            "params": all_params,
            "preview": preview_query,
        },
    )

@app.post(
    "/PFunnelAnalysis/DiscoverStep",
    response_model=DiscoverStepResponse,
    summary="[PFunnelAnalysis] DiscoverStep",
)
async def discover_step(request: DiscoverStepRequest) -> DiscoverStepResponse:
    """발견 단계 가져오기 (ClickHouse 라이브 조회)
    Args:
        request (DiscoverStepRequest): 발견 단계 조회 요청

        예시:
        {
            "userId": "admin",
            "period": { "from": "2025-01-01 00:00:00", "to": "2025-01-07 23:59:59" },
            "condition": [
                {
                    "id": 1,
                    "stepnm": "회원가입",
                    "order": 1,
                    "condition": [
                        {
                            "order": 1,
                            "conditions": [
                                {"order": 1, "id":92, "field": "buy_amount", "operator": 5, "value": "5000"}
                            ]
                        }
                    ]
                },
                {
                    "id": 2,
                    "stepnm": "로그인",
                    "order": 2,
                    "condition": [
                        {
                            "order": 1,
                            "conditions": [
                                {"order": 1, "id":92, "field": "buy_amount", "operator": 5, "value": "5000"}
                            ]
                        }
                    ]
                },
                {
                    "id": 3,
                    "stepnm": "결제화면 진입",
                    "order": 3,
                    "condition": [
                        {
                            "order": 1,
                            "conditions": [
                                {"order": 1, "id":92, "field": "buy_amount", "operator": 5, "value": "5000"}
                            ]
                        }
                    ]
                },
                {
                    "id": 4,
                    "stepnm": "결제완료",
                    "order": 4,
                    "condition": [
                        {
                            "order": 1,
                            "conditions": [
                                {"order": 1, "id":92, "field": "buy_amount", "operator": 5, "value": "5000"}
                            ]
                        }
                    ]
                }
            ]
        }
    
    Returns:
        DiscoverStepResponse: 발견 단계 조회 응답

        ClickHouse 사용 시:
        {
            "code": 200,
            "data": {
                "findCount": 67,
                "totalCount": 1234,
                "rate": 0.05,
                "sql": "...",
                "params": {...},
                "preview": "..."
            }
        }

        ClickHouse 미사용 시(CSV fallback):
        {
            "code": 200,
            "data": {
                "findCount": 67,
                "rate": 0.05
            }
        }
    """

    if fetch_discover_step_metrics is None:
        try:
            payload = _load_discover_metrics_from_csv(DISCOVER_STEP_CSV, request.userId)
        except FileNotFoundError:
            return DiscoverStepResponse(
                code=500,
                data={},
                message="Discover step data source not found.",
            )
        except ValueError as exc:
            return DiscoverStepResponse(
                code=500,
                data={},
                message=str(exc),
            )

        return DiscoverStepResponse(
            code=200,
            data=payload,
        )

    resolved_period = _extract_period(request.period) or _default_period_range()
    params = {
        "p_from": resolved_period["from"],
        "p_to": resolved_period["to"],
    }

    try:
        metrics, final_query, all_params = fetch_discover_step_metrics(
            base_source=DISCOVERY_BASE_TABLE,
            step_conditions=request.condition or [],
            params=params,
            resolver=_resolve_field_expression,
        )
    except Exception as exc:
        return DiscoverStepResponse(
            code=500,
            data={},
            message=str(exc),
        )

    preview_query = _format_sql_with_params(final_query, all_params)

    return DiscoverStepResponse(
        code=200,
        data={
            "findCount": metrics.findCount,
            "totalCount": metrics.totalCount,
            "rate": metrics.rate,
            "sql": final_query,
            "params": all_params,
            "preview": preview_query,
        },
    )

