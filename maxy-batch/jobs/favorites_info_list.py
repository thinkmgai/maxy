"""
Favorites widget InfoList cache (Valkey).

- Source: ClickHouse aggregated table `maxy_page_daily` (today only).
- Output: top 100 pages per (package_id, server_type, os_type) ordered by `cnt`.

Valkey key:
- `{VALKEY_PREFIX}:favorites:infolist:{package_id}:{server_type}:{os_type}`
  - Hash fields: day, updated_at, items(JSON)
  - TTL: short (stale-safe)
"""

from __future__ import annotations

import json
import logging
from collections import defaultdict
from datetime import datetime
from typing import Iterable

import redis

from ClickHouseComm import get_client
from clickhouse import SQL
from settings import SETTINGS

VALKEY_KEY_PREFIX = f"{SETTINGS.valkey_prefix}:favorites:infolist"
VALKEY_TTL_SECONDS = 120

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


def _to_int(value: object, *, default: int = 0) -> int:
    if value is None:
        return default
    try:
        return int(value)
    except Exception:
        try:
            return int(float(value))
        except Exception:
            return default


def _to_int_rounded(value: object, *, default: int = 0) -> int:
    if value is None:
        return default
    try:
        return int(round(float(value)))
    except Exception:
        return default


def _fetch_today_top_pages() -> dict[tuple[str, str, str], list[dict]]:
    client = _get_click_client()
    sql = SQL.render("favorites.selectFavoritesTodayTopPages")
    logging.info("[favorites_info_list] SQL: %s", sql)
    result = client.query(sql)

    grouped: defaultdict[tuple[str, str, str], list[dict]] = defaultdict(list)
    for row in _rows_to_dicts(result):
        pkg = row.get("package_id")
        server_type = row.get("server_type")
        os_type = row.get("os_type")
        page_name = row.get("page_name")
        if _is_missing(pkg) or _is_missing(server_type) or _is_missing(os_type) or _is_missing(page_name):
            continue

        log_count = _to_int(row.get("log_count"))
        sum_cpu_usage = _to_int(row.get("sum_cpu_usage"))
        sum_mem_usage = _to_int(row.get("sum_mem_usage"))

        request_count = _to_int(row.get("request_count"))
        sum_response_tm = _to_int(row.get("sum_response_tm"))
        uniq_device_count = _to_int(row.get("uniq_device_count"))

        grouped[(str(pkg), str(server_type), str(os_type))].append(
            {
                "reqUrl": str(page_name),
                "count": _to_int(row.get("cnt")),
                "logCount": log_count,
                "uniqDeviceCount": uniq_device_count,
                "sumCpuUsage": sum_cpu_usage,
                "sumMemUsage": sum_mem_usage,
                "loadingTime": _to_int_rounded(row.get("avg_loading_tm")),
                "responseTime": int(round(sum_response_tm / request_count)) if request_count > 0 else 0,
                "intervaltime": _to_int_rounded(row.get("avg_interval_tm")),
                "errorCount": _to_int(row.get("error_count")),
                "crashCount": _to_int(row.get("crash_count")),
                "cpuUsage": int(round(sum_cpu_usage / log_count)) if log_count > 0 else 0,
                "memUsage": int(round(sum_mem_usage / log_count)) if log_count > 0 else 0,
                "logType": None,
            }
        )

    return dict(grouped)


def _write_valkey(grouped: dict[tuple[str, str, str], list[dict]]) -> None:
    if not grouped:
        logging.info("[favorites_info_list] no rows to write")
        return

    client = _get_valkey_client()
    day = datetime.utcnow().date().isoformat()
    now_iso = datetime.utcnow().isoformat() + "Z"

    pipe = client.pipeline(transaction=True)
    for (pkg, server_type, os_type), items in grouped.items():
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
        logging.info("[favorites_info_list] write key=%s items=%d", key, len(items))
    pipe.execute()
    logging.info("[favorites_info_list] wrote %d keys (ttl=%ss)", len(grouped), VALKEY_TTL_SECONDS)


def run() -> None:
    try:
        grouped = _fetch_today_top_pages()
        _write_valkey(grouped)
    except Exception as exc:
        logging.exception("[favorites_info_list] failed to sync: %s", exc)


__all__ = ["run"]
