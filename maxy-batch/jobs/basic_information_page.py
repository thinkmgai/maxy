"""
Page-level summary: fetch today's page flow stats and store in Valkey.
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Dict, Iterable, Tuple

import redis

from ClickHouseComm import get_client
from clickhouse import SQL
from settings import SETTINGS

_click_client = None
_valkey_client = None


def _normalize_dimensions(row: dict) -> tuple[str, str, str] | None:
    """Return normalized (pkg, server, os) or None when any dimension is missing."""
    pkg = row.get("package_nm")
    server = row.get("server_type")
    os_type = row.get("os_type")

    def _is_missing(value: object) -> bool:
        if value is None:
            return True
        if isinstance(value, str):
            return value.strip() == ""
        return False

    if _is_missing(pkg) or _is_missing(server) or _is_missing(os_type):
        logging.warning(
            "[basic_information_page] skip row with missing dimensions pkg=%s server=%s os=%s row=%s",
            pkg,
            server,
            os_type,
            row,
        )
        return None

    return (str(pkg), str(server), str(os_type))


def _rows_to_dicts(result) -> Iterable[dict]:
    cols = result.column_names
    for row in result.result_rows:
        yield dict(zip(cols, row))


def _get_click_client():
    global _click_client
    if _click_client is None:
        _click_client = get_client(SETTINGS.clickhouse)
    return _click_client


def _get_valkey_client():
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


def _fetch_page_metrics() -> Dict[Tuple[str, str, str], dict]:
    client = _get_click_client()
    sql = SQL.render("metrics.selectBITodayPageSummary")
    logging.info("[basic_information_page] SQL (page): %s", sql)
    result = client.query(sql)
    metrics: Dict[Tuple[str, str, str], dict] = {}
    for row in _rows_to_dicts(result):
        key = _normalize_dimensions(row)
        if key is None:
            continue
        metrics[key] = {
            "crash_count": int(row.get("crash_count") or 0),
            "error_count": int(row.get("error_count") or 0),
            "js_error_count": int(row.get("js_error_count") or 0),
            "log_count": int(row.get("log_count") or 0),
            "intervaltime_avg": float(row.get("intervaltime_avg") or 0),
            "lcp_avg": float(row.get("lcp_avg") or 0),
            "ttfb_avg": float(row.get("ttfb_avg") or 0),
            "fcp_avg": float(row.get("fcp_avg") or 0),
            "inp_avg": float(row.get("inp_avg") or 0),
            "pv": int(row.get("pv") or 0),
        }
    return metrics


def _write_valkey(metrics: Dict[Tuple[str, str, str], dict]) -> None:
    client = _get_valkey_client()
    pipe = client.pipeline()
    for (pkg, server, os_type), vals in metrics.items():
        key = f"{SETTINGS.valkey_prefix}:page:{pkg}:{server}:{os_type}"
        payload = {
            "package_nm": pkg,
            "server_type": server,
            "os_type": os_type,
            **vals,
            "updated_at": datetime.utcnow().isoformat() + "Z",
        }
        pipe.hset(key, mapping=payload)
        logging.info("[basic_information_page] write key=%s value=%s", key, payload)
    pipe.execute()
    logging.info("[basic_information_page] wrote %d hash entries to Valkey", len(metrics))


def run() -> None:
    """Public entry point for scheduler."""
    try:
        metrics = _fetch_page_metrics()
        _write_valkey(metrics)
    except Exception:
        logging.exception("[basic_information_page] failed to sync")


__all__ = ["run"]
