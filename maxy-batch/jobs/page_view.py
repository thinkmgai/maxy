"""
Page View info list cache for the widget (Valkey).

- Source: ClickHouse `maxy_page_daily` (today only)
- Output: Top crash/error/log pages per (package_nm, server_type, os_type)

Valkey key:
- `{VALKEY_PREFIX}:pageview:infolist:{package_nm}:{server_type}:{os_type}`
  - Hash fields: day, updated_at, items(JSON)
  - TTL: short (stale-safe)
"""

from __future__ import annotations

import json
import logging
from collections import defaultdict
from datetime import datetime
from typing import Dict, Iterable, Tuple

import redis

from ClickHouseComm import get_client
from clickhouse import SQL
from settings import SETTINGS

VALKEY_KEY_PREFIX = f"{SETTINGS.valkey_prefix}:pageview:infolist"
VALKEY_TTL_SECONDS = 120

TYPE_LOG = 0
TYPE_ERROR = 1
TYPE_CRASH = 2

_valkey_client: redis.Redis | None = None


def _rows_to_dicts(result) -> Iterable[dict]:
    cols = result.column_names
    for row in result.result_rows:
        yield dict(zip(cols, row))


def _get_click_client():
    # 세션 충돌을 피하기 위해 매 호출마다 신규 클라이언트를 생성한다.
    return get_client(SETTINGS.clickhouse)


def _get_valkey_client() -> redis.Redis:
    global _valkey_client
    if _valkey_client is None:
        _valkey_client = redis.Redis(
            host=SETTINGS.valkey_host,
            port=SETTINGS.valkey_port,
            password=SETTINGS.valkey_password or None,
            db=SETTINGS.valkey_db,
            ssl=SETTINGS.valkey_ssl,
            decode_responses=True,
        )
    return _valkey_client


def _is_missing(value: object) -> bool:
    if value is None:
        return True
    if isinstance(value, str):
        return value.strip() == ""
    return False


def _safe_int(value: object, *, default: int = 0) -> int:
    if value is None:
        return default
    try:
        return int(value)
    except Exception:
        try:
            return int(float(value))
        except Exception:
            return default


def _normalize_key(row: dict) -> tuple[str, str, str] | None:
    pkg = row.get("package_nm")
    server_type = row.get("server_type")
    os_type = row.get("os_type")
    if _is_missing(pkg) or _is_missing(server_type) or _is_missing(os_type):
        return None
    return str(pkg).strip(), str(server_type).strip(), str(os_type).strip()


def _fetch_top(kind: str) -> list[dict]:
    client = _get_click_client()
    sql_id = {
        "crash": "pageview.selectTopCrashByPage",
        "error": "pageview.selectTopErrorByPage",
        "log": "pageview.selectTopLogByPage",
    }.get(kind)
    if not sql_id:
        raise ValueError(f"Unknown kind: {kind}")
    sql = SQL.render(sql_id)
    logging.info("[page_view] %s SQL: %s", kind, sql)
    result = client.query(sql)
    return list(_rows_to_dicts(result))


def _collect_grouped(
    rows: Iterable[dict],
    *,
    count_key: str,
    type_value: int,
    min_count: int = 0,
) -> Dict[Tuple[str, str, str], list[dict]]:
    grouped: defaultdict[Tuple[str, str, str], list[dict]] = defaultdict(list)
    for row in rows:
        key = _normalize_key(row)
        if key is None:
            continue
        page_url = str(row.get("page_url") or "").strip()
        if not page_url:
            continue
        count = _safe_int(row.get(count_key))
        if count <= min_count:
            continue
        grouped[key].append(
            {
                "pageURL": page_url,
                "count": count,
                "type": type_value,
            }
        )
    return dict(grouped)


def _sort_items(items: list[dict]) -> list[dict]:
    return sorted(items, key=lambda item: (item.get("count", 0), item.get("pageURL", "")), reverse=True)


def _build_priority_list(
    crash_items: list[dict],
    error_items: list[dict],
    log_items: list[dict],
    *,
    limit: int = 30,
) -> list[dict]:
    ordered = crash_items + error_items

    if log_items:
        if len(ordered) >= limit:
            ordered = ordered[: max(0, limit - 1)]
            ordered.append(log_items[0])
        else:
            ordered.extend(log_items)

    return ordered[:limit]


def _write_valkey(grouped: dict[tuple[str, str, str], list[dict]]) -> None:
    if not grouped:
        logging.info("[page_view] no rows to write")
        return

    client = _get_valkey_client()
    day = datetime.utcnow().date().isoformat()
    now_iso = datetime.utcnow().isoformat() + "Z"

    pipe = client.pipeline(transaction=True)
    for (pkg, server_type, os_type), items in grouped.items():
        if not items:
            continue
        key = f"{VALKEY_KEY_PREFIX}:{pkg}:{server_type}:{os_type}"
        pipe.hset(
            key,
            mapping={
                "day": day,
                "updated_at": now_iso,
                "items": json.dumps(items, ensure_ascii=False),
            },
        )
        pipe.expire(key, VALKEY_TTL_SECONDS)
        logging.info("[page_view] write key=%s items=%d", key, len(items))
    pipe.execute()
    logging.info("[page_view] wrote %d keys (ttl=%ss)", len(grouped), VALKEY_TTL_SECONDS)


def run() -> None:
    try:
        crash_rows = _fetch_top("crash")
        error_rows = _fetch_top("error")
        log_rows = _fetch_top("log")

        crash_grouped = _collect_grouped(
            crash_rows,
            count_key="crash_count",
            type_value=TYPE_CRASH,
            min_count=0,
        )
        error_grouped = _collect_grouped(
            error_rows,
            count_key="error_count",
            type_value=TYPE_ERROR,
            min_count=0,
        )
        log_grouped = _collect_grouped(
            log_rows,
            count_key="log_count",
            type_value=TYPE_LOG,
            min_count=0,
        )

        grouped: dict[tuple[str, str, str], list[dict]] = {}
        all_keys = set(crash_grouped) | set(error_grouped) | set(log_grouped)
        for key in all_keys:
            crash_items = _sort_items(crash_grouped.get(key, []))
            error_items = _sort_items(error_grouped.get(key, []))
            log_items = _sort_items(log_grouped.get(key, []))
            grouped[key] = _build_priority_list(crash_items, error_items, log_items)

        _write_valkey(grouped)
    except Exception:
        logging.exception("[page_view] failed to sync")


__all__ = ["run"]
