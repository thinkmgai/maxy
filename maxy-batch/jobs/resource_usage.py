"""
Resource Usage widget cache (Valkey).

- Source: ClickHouse `maxy_model_hourly` (today only)
- Output: Device models per (package_id, server_type, os_type) sorted by user count

Valkey keys:
- `{VALKEY_PREFIX}:resourceusage:popup:{package_id}:{server_type}:{os_type}`
  - Hash fields: day, updated_at, items(JSON)
- `{VALKEY_PREFIX}:resourceusage:series:{package_id}:{server_type}:{os_type}`
  - Hash fields: day, updated_at, <deviceModel>(JSON series)
  - TTL: short (stale-safe)
"""

from __future__ import annotations

import json
import logging
from collections import defaultdict
from datetime import date, datetime, timezone
from typing import Iterable

import redis

from ClickHouseComm import get_client
from clickhouse import SQL
from settings import SETTINGS

VALKEY_POPUP_PREFIX = f"{SETTINGS.valkey_prefix}:resourceusage:popup"
VALKEY_SERIES_PREFIX = f"{SETTINGS.valkey_prefix}:resourceusage:series"
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


def _to_ts_ms(value: object) -> int:
    if isinstance(value, datetime):
        dt = value
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return int(dt.timestamp() * 1000)
    if isinstance(value, date):
        dt = datetime(value.year, value.month, value.day, tzinfo=timezone.utc)
        return int(dt.timestamp() * 1000)
    if isinstance(value, str):
        try:
            parsed = datetime.fromisoformat(value)
        except Exception:
            return 0
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return int(parsed.timestamp() * 1000)
    return 0


def _fetch_daily_totals() -> list[dict]:
    client = _get_click_client()
    sql = SQL.render("resourceusage.selectTopModelsHourly")
    logging.info("[resource_usage] SQL: %s", sql)
    result = client.query(sql)
    return list(_rows_to_dicts(result))

def _fetch_hourly_series() -> list[dict]:
    client = _get_click_client()
    sql = SQL.render("resourceusage.selectModelsHourlySeries")
    logging.info("[resource_usage] hourly SQL: %s", sql)
    result = client.query(sql)
    return list(_rows_to_dicts(result))

def _build_payload(
    daily_rows: Iterable[dict],
    hourly_rows: Iterable[dict],
) -> tuple[dict[tuple[str, str, str], list[dict]], dict]:
    series_grouped: defaultdict[
        tuple[str, str, str],
        defaultdict[str, dict[str, list[list[object]]]],
    ] = defaultdict(lambda: defaultdict(lambda: {"cpu": [], "memory": []}))
    popup_grouped: defaultdict[tuple[str, str, str], list[dict]] = defaultdict(list)
    top_models: set[tuple[str, str, str, str]] = set()

    for row in daily_rows:
        pkg = row.get("package_id")
        server_type = row.get("server_type")
        os_type = row.get("os_type")
        device_model = row.get("device_model")
        if _is_missing(pkg) or _is_missing(server_type) or _is_missing(os_type) or _is_missing(device_model):
            continue

        pkg_s = str(pkg).strip()
        server_s = str(server_type).strip()
        os_s = str(os_type).strip()
        model_s = str(device_model).strip()
        key = (pkg_s, server_s, os_s)
        top_models.add((pkg_s, server_s, os_s, model_s))

        day_user_count = _to_int(row.get("user_count_day"))
        day_log_count = _to_int(row.get("log_count_day"))
        day_cpu_sum = _to_int(row.get("sum_cpu_usage_day"))
        day_mem_sum = _to_int(row.get("sum_mem_usage_day"))

        day_cpu_avg = round(day_cpu_sum / day_log_count, 1) if day_log_count > 0 else 0.0
        day_mem_avg = int(round(day_mem_sum / day_log_count)) if day_log_count > 0 else 0

        popup_grouped[key].append(
            {
                "deviceModel": model_s,
                "count": day_user_count,
                "usageCount": day_log_count,
                "cpuUsage": day_cpu_avg,
                "memUsage": day_mem_avg,
                "osType": os_s,
            }
        )

    for key, items in popup_grouped.items():
        items.sort(key=lambda item: (item.get("count", 0), item.get("deviceModel", "")), reverse=True)

    for row in hourly_rows:
        pkg = row.get("package_id")
        server_type = row.get("server_type")
        os_type = row.get("os_type")
        device_model = row.get("device_model")
        hour_bucket = row.get("hour_bucket")
        if (
            _is_missing(pkg)
            or _is_missing(server_type)
            or _is_missing(os_type)
            or _is_missing(device_model)
            or hour_bucket is None
        ):
            continue

        pkg_s = str(pkg).strip()
        server_s = str(server_type).strip()
        os_s = str(os_type).strip()
        model_s = str(device_model).strip()
        if (pkg_s, server_s, os_s, model_s) not in top_models:
            continue

        log_count = _to_int(row.get("log_count"))
        cpu_avg = _to_int(row.get("avg_cpu_usage"))
        mem_avg = _to_int(row.get("avg_mem_usage"))


        ts_ms = _to_ts_ms(hour_bucket)
        if ts_ms <= 0:
            continue
        group_key = (pkg_s, server_s, os_s)
        series = series_grouped[group_key][model_s]
        series["cpu"].append([ts_ms, cpu_avg])
        series["memory"].append([ts_ms, mem_avg])

    # Sort series points by timestamp for deterministic output.
    for key, models in series_grouped.items():
        for model_name, series in models.items():
            for metric in ("cpu", "memory"):
                series[metric].sort(key=lambda point: point[0])

    return dict(popup_grouped), series_grouped


def _write_valkey(popup_grouped: dict[tuple[str, str, str], list[dict]], series_grouped: dict) -> None:
    if not popup_grouped:
        logging.info("[resource_usage] no rows to write")
        return

    client = _get_valkey_client()
    day = datetime.utcnow().date().isoformat()
    now_iso = datetime.utcnow().isoformat() + "Z"

    pipe = client.pipeline(transaction=True)
    for (pkg, server_type, os_type), items in popup_grouped.items():
        popup_key = f"{VALKEY_POPUP_PREFIX}:{pkg}:{server_type}:{os_type}"
        series_key = f"{VALKEY_SERIES_PREFIX}:{pkg}:{server_type}:{os_type}"

        pipe.delete(popup_key)
        pipe.hset(
            popup_key,
            mapping={
                "day": day,
                "updated_at": now_iso,
                "items": json.dumps(items, ensure_ascii=False),
            },
        )
        pipe.expire(popup_key, VALKEY_TTL_SECONDS)

        pipe.delete(series_key)
        series_mapping: dict[str, str] = {
            "day": day,
            "updated_at": now_iso,
        }
        for item in items:
            model = str(item.get("deviceModel") or "").strip()
            if not model:
                continue
            series = series_grouped.get((pkg, server_type, os_type), {}).get(model)
            if not series:
                continue
            series_mapping[model] = json.dumps(series, ensure_ascii=False)
        pipe.hset(series_key, mapping=series_mapping)
        pipe.expire(series_key, VALKEY_TTL_SECONDS)

        logging.info(
            "[resource_usage] write pkg=%s srv=%s os=%s models=%d",
            pkg,
            server_type,
            os_type,
            len(items),
        )

    pipe.execute()
    logging.info("[resource_usage] wrote %d keys (ttl=%ss)", len(popup_grouped), VALKEY_TTL_SECONDS)


def run() -> None:
    try:
        daily_rows = _fetch_daily_totals()
        hourly_rows = _fetch_hourly_series()
        popup_grouped, series_grouped = _build_payload(daily_rows, hourly_rows)
        _write_valkey(popup_grouped, series_grouped)
    except Exception:
        logging.exception("[resource_usage] failed to sync")


__all__ = ["run"]
