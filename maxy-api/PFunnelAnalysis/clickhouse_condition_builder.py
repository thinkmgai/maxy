"""Utility to translate funnel group conditions into ClickHouse WHERE fragments.

This builds SQL snippets and parameter values that can be plugged into a
ClickHouse client. It is used by the funnel discovery/detail APIs.
"""

from __future__ import annotations

from typing import Any, Callable, Iterable, Mapping, Sequence


_OPERATOR_SQL = {
    1: "match({expr}, %(param)s)",  # regex
    2: "startsWith({expr}, %(param)s)",
    3: "endsWith({expr}, %(param)s)",
    4: "positionCaseInsensitive({expr}, %(param)s) > 0",
    5: "{expr} = %(param)s",
    6: "{expr} > %(param)s",
    7: "{expr} < %(param)s",
    8: "{expr} >= %(param)s",
    9: "{expr} <= %(param)s",
}


def _normalize_value(raw_value: Any, value_type: str) -> Any | None:
    """Convert inbound values to a shape safe for SQL parameters."""
    if raw_value is None:
        return None

    if isinstance(raw_value, (list, tuple)):
        normalized = [_normalize_value(item, value_type) for item in raw_value]
        filtered = [item for item in normalized if item is not None]
        return filtered if filtered else None

    if value_type == "count":
        try:
            number = float(raw_value)
            return number
        except (TypeError, ValueError):
            return None

    text = str(raw_value).strip()
    return text if text else None


def _map_value_for_query(row: Mapping[str, Any], normalized: Any, value_type: str) -> Any:
    """Apply per-field coercion for specific ids."""
    try:
        fid = int(row.get("fieldId") or row.get("id") or 0)
    except Exception:
        fid = 0

    if value_type == "value":
        if fid == 11:  # first_open new/returning
            if isinstance(normalized, str):
                lowered = normalized.strip().lower()
                if lowered in {"rew", "new", "입"}:
                    return 1
                if lowered in {"returning"}:
                    return 0
            return normalized
        if fid in {12, 62}:  # boolean-ish fields
            if isinstance(normalized, str):
                lowered = normalized.strip().lower()
                return 1 if lowered in {"true", "1", "t", "y", "yes"} else 0
            return 1 if normalized else 0

    return normalized


def _is_iterable_not_string(value: Any) -> bool:
    return isinstance(value, Iterable) and not isinstance(value, (str, bytes, bytearray))


def _is_event_category(category_id: Any) -> bool:
    try:
        numeric = int(category_id)
    except (TypeError, ValueError):
        return False
    return numeric == 9


def build_where_clause(
    groups: Sequence[Mapping[str, Any]] | None,
    resolve_field: Callable[[Mapping[str, Any]], str | None],
) -> tuple[str, dict[str, Any], str, dict[str, Any]]:
    """Translate condition groups into SQL WHERE/HAVING fragments and params."""

    if not groups:
        return "", {}, "", {}

    where_params: dict[str, Any] = {}
    having_params: dict[str, Any] = {}
    where_blocks: list[str] = []
    having_blocks: list[str] = []
    param_counter = 0

    for group in groups:
        rows = group.get("conditions") or []
        ors: list[str] = []
        having_ors: list[str] = []

        for row in rows:
            expr = resolve_field(row)
            if not expr:
                continue

            operator_id = row.get("operator")
            if operator_id is None and _is_event_category(row.get("categoryId")):
                operator_id = 5  # default to equals for event category
            template = _OPERATOR_SQL.get(operator_id)
            if not template:
                continue

            value_type = row.get("type") or "value"
            if _is_event_category(row.get("categoryId")) and value_type != "count":
                value_type = "value"
            raw_value = row.get("value")
            normalized = _normalize_value(raw_value, value_type)
            if normalized is None and _is_event_category(row.get("categoryId")) and value_type == "value":
                fallback_value = (row.get("field") or "").strip()
                normalized = _normalize_value(fallback_value, "value")
            if normalized is None:
                continue

            normalized_for_query = _map_value_for_query(row, normalized, value_type)

            target_list = having_ors if value_type == "count" else ors
            param_store = having_params if value_type == "count" else where_params

            event_name_clause: str | None = None
            raw_field_name = (row.get("field") or "").strip()
            if _is_event_category(row.get("categoryId")) and raw_field_name:
                param_counter += 1
                event_name_param = f"p{param_counter}"
                where_params[event_name_param] = raw_field_name
                event_name_clause = f"event_name = %({event_name_param})s"

            effective_expr = expr
            if value_type == "count":
                if raw_field_name:
                    param_counter += 1
                    event_param_name = f"p{param_counter}"
                    param_store[event_param_name] = raw_field_name
                    effective_expr = f"countIf(event_name = %({event_param_name})s)"
                else:
                    effective_expr = f"countIf({expr} IS NOT NULL)"

            if _is_iterable_not_string(normalized):
                param_names = []
                for item in normalized:
                    param_counter += 1
                    name = f"p{param_counter}"
                    param_store[name] = _map_value_for_query(row, item, value_type)
                    param_names.append(f"%({name})s")
                in_fragment = f"{effective_expr} IN ({', '.join(param_names)})"
                if event_name_clause and value_type != "count":
                    in_fragment = f"({event_name_clause} AND {in_fragment})"
                target_list.append(in_fragment)
                continue

            param_counter += 1
            param_name = f"p{param_counter}"
            param_store[param_name] = normalized_for_query
            fragment = template.format(expr=effective_expr, param=param_name)
            fragment = fragment.replace("%(param)s", f"%({param_name})s")
            if event_name_clause and value_type != "count":
                fragment = f"({event_name_clause} AND {fragment})"
            target_list.append(fragment)

        if ors:
            where_blocks.append("(" + " OR ".join(ors) + ")")
        if having_ors:
            having_blocks.append("(" + " OR ".join(having_ors) + ")")

    where_sql = " AND ".join(where_blocks)
    having_sql = " AND ".join(having_blocks)
    return where_sql, where_params, having_sql, having_params
