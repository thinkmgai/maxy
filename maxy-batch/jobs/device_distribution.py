"""
Device Distribution widget cache (Valkey).

- Source: ClickHouse `maxy_model_hourly` aggregated for “today” (local time)
- Output: Per-(package, server, os) device metrics persisted to Valkey for the API
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

VALKEY_KEY_PREFIX = f"{SETTINGS.valkey_prefix}:devicedistribution"
VALKEY_TTL_SECONDS = 120
MAX_ITEMS_PER_KEY = 100

_valkey_client: redis.Redis | None = None


def _rows_to_dicts(result) -> Iterable[dict]:
    """Transform ClickHouse result rows into dictionaries keyed by column name."""
    cols = result.column_names
    for row in result.result_rows:
        yield dict(zip(cols, row))


def _get_click_client():
    """Return a fresh ClickHouse client to avoid session reuse issues."""
    return get_client(SETTINGS.clickhouse)


def _get_valkey_client() -> redis.Redis:
    """Lazy-init a Valkey client reused across invocations."""
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


def _to_int(value: object, *, default: int = 0) -> int:
    """Convert arbitrary values to int with a forgiving fallback."""
    if value is None:
        return default
    try:
        return int(value)
    except Exception:
        try:
            return int(float(value))
        except Exception:
            return default


def _fetch_device_rows() -> list[dict]:
    """Pull aggregated per-device metrics from ClickHouse (today only)."""
    client = _get_click_client()
    sql = SQL.render("devicedistribution.selectDeviceDistribution")
    logging.info("[device_distribution] SQL: %s", sql)
    result = client.query(sql)
    return list(_rows_to_dicts(result))


def _build_payload(rows: Iterable[dict]) -> dict:
    """Reshape raw ClickHouse rows into a Valkey-friendly structure."""
    grouped: defaultdict[tuple[str, str, str], list[dict]] = defaultdict(list)
    totals: defaultdict[tuple[str, str, str], dict[str, int]] = defaultdict(
        lambda: {"device": 0, "view": 0, "error": 0, "crash": 0}
    )

    for row in rows:
        pkg = row.get("package_id")
        server = row.get("server_type")
        os_type = row.get("os_type")
        model = row.get("device_model")
        
        device_count = _to_int(row.get("device_count"))
        view_count = _to_int(row.get("view_count"))
        error_count = _to_int(row.get("error_count"))
        crash_count = _to_int(row.get("crash_count"))

        key = (pkg, server, os_type)
        grouped[key].append(
            {
                "deviceModel": model,
                "osType": os_type,
                "deviceCount": device_count,
                "viewCount": view_count,
                "errorCount": error_count,
                "crashCount": crash_count,
            }
        )
        totals[key]["device"] += device_count
        totals[key]["view"] += view_count
        totals[key]["error"] += error_count
        totals[key]["crash"] += crash_count

    payloads: dict[tuple[str, str, str], dict] = {}
    for key, items in grouped.items():
        total_error = totals[key]["error"]
        total_crash = totals[key]["crash"]

        # Keep heavier models first for predictable rendering in the widget.
        items.sort(key=lambda item: (item["viewCount"], item["errorCount"], item["crashCount"]), reverse=True)

        prepared = []
        for item in items[:MAX_ITEMS_PER_KEY]:
            error_rate = (item["errorCount"] / total_error * 100) if total_error > 0 else 0.0
            crash_rate = (item["crashCount"] / total_crash * 100) if total_crash > 0 else 0.0
            prepared.append(
                {
                    **item,
                    "errorRate": round(error_rate, 2),
                    "crashRate": round(crash_rate, 2),
                }
            )

        payloads[key] = {
            "items": prepared,
            "totals": {
                "totalDevices": totals[key]["device"],
                "totalViews": totals[key]["view"],
                "totalErrors": total_error,
                "totalCrashes": total_crash,
            },
        }

    return payloads


def _write_valkey(payloads: dict) -> None:
    """Persist prepared payloads to Valkey with a short TTL."""
    if not payloads:
        logging.info("[device_distribution] no data to write")
        return

    client = _get_valkey_client()
    updated_iso = datetime.now().isoformat()

    pipe = client.pipeline(transaction=True)
    for (pkg, server, os_type), payload in payloads.items():
        key = f"{VALKEY_KEY_PREFIX}:{pkg}:{server}:{os_type}"
        pipe.delete(key)
        pipe.hset(
            key,
            mapping={
                "items": json.dumps(payload["items"], ensure_ascii=False),
                "totals": json.dumps(payload["totals"], ensure_ascii=False),
                "updated_at": updated_iso,
            },
        )
        pipe.expire(key, VALKEY_TTL_SECONDS)
        logging.info(
            "[device_distribution] valkey write %s items=%d totals=%s",
            key,
            len(payload["items"]),
            payload["totals"],
        )
    pipe.execute()


def run() -> None:
    """Entry point used by the scheduler."""
    try:
        rows = _fetch_device_rows()
        payloads = _build_payload(rows)
        _write_valkey(payloads)
    except Exception:
        logging.exception("[device_distribution] failed to refresh cache")


__all__ = ["run"]
