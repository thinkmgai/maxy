"""
Fetch device statistics from ClickHouse and store them in Valkey.
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
            "[basic_information_device] skip row with missing dimensions pkg=%s server=%s os=%s row=%s",
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


def _fetch_bitmap_metrics() -> Dict[Tuple[str, str, str], dict]:
    """Return dau/revisit/mau keyed by (package_nm, server_type, os_type)."""
    client = _get_click_client()
    sql = SQL.render("metrics.selectBITodayStatiistic2")
    logging.info("[basic_information_device] metrics.selectBITodayStatiistic2 SQL (bitmap): %s", sql)
    result = client.query(sql)
    metrics: Dict[Tuple[str, str, str], dict] = {}
    for row in _rows_to_dicts(result):
        key = _normalize_dimensions(row)
        if key is None:
            continue
        metrics[key] = {
            "dau": int(row.get("dau") or 0),
            "revisit_7d": int(row.get("revisit_7d") or 0),
            "mau": int(row.get("mau") or 0),
        }
    return metrics


def _fetch_visit_metrics() -> Dict[Tuple[str, str, str], dict]:
    """Return visit/install/login counts keyed by (package_nm, server_type, os_type)."""
    client = _get_click_client()
    sql = SQL.render("metrics.selectBITodayStatiistic1")
    logging.info("[basic_information_device] metrics.selectBITodayStatiistic1 SQL (visit): %s", sql)
    result = client.query(sql)
    metrics: Dict[Tuple[str, str, str], dict] = {}
    for row in _rows_to_dicts(result):
        key = _normalize_dimensions(row)
        if key is None:
            continue
        metrics[key] = {
            "visit": int(row.get("total_visit") or 0),
            "install": int(row.get("total_install") or 0),
            "login": int(row.get("total_login") or 0),
        }
    return metrics


def _merge_metrics() -> Dict[Tuple[str, str, str], dict]:
    """Merge bitmap and visit metrics into a single dict keyed by dimensions."""
    combined: Dict[Tuple[str, str, str], dict] = {}
    bitmap = _fetch_bitmap_metrics()
    visits = _fetch_visit_metrics()

    for key, vals in bitmap.items():
        combined[key] = dict(vals)

    for key, vals in visits.items():
        if key not in combined:
            combined[key] = {}
        combined[key].update(vals)

    now_iso = datetime.utcnow().isoformat() + "Z"
    for key, vals in combined.items():
        vals.setdefault("dau", 0)
        vals.setdefault("revisit_7d", 0)
        vals.setdefault("mau", 0)
        vals.setdefault("visit", 0)
        vals.setdefault("install", 0)
        vals.setdefault("login", 0)
        vals["updated_at"] = now_iso
    return combined


def _write_valkey(metrics: Dict[Tuple[str, str, str], dict]) -> None:
    """Write metrics to Valkey/Redis as hashes."""
    client = _get_valkey_client()
    pipe = client.pipeline()
    for (pkg, server, os_type), vals in metrics.items():
        key = f"{SETTINGS.valkey_prefix}:{pkg}:{server}:{os_type}"
        payload = {
            "package_nm": pkg,
            "server_type": server,
            "os_type": os_type,
            "visit": vals.get("visit", 0),
            "install": vals.get("install", 0),
            "login": vals.get("login", 0),
            "dau": vals.get("dau", 0),
            "revisit_7d": vals.get("revisit_7d", 0),
            "mau": vals.get("mau", 0),
            "updated_at": vals.get("updated_at"),
        }
        pipe.hset(key, mapping=payload)
        logging.info(
            "[basic_information_device] write key=%s value=%s",
            key,
            payload,
        )
    pipe.execute()
    logging.info("[basic_information_device] wrote %d hash entries to Valkey", len(metrics))


# def _fetch_valkey(keys: Iterable[str]) -> Dict[str, dict]:
#     """Fetch stored hashes from Valkey for verification or reuse."""
#     client = _get_valkey_client()
#     pipe = client.pipeline()
#     for key in keys:
#         pipe.hgetall(key)
#     results = pipe.execute()
#     data: Dict[str, dict] = {}
#     for key, payload in zip(keys, results):
#         if payload:
#             data[key] = payload
#     logging.info("[basic_information_device] fetched %d hash entries from Valkey", len(data))
#     return data


def run() -> None:
    """Public entry point for scheduler."""
    try:
        metrics = _merge_metrics()
        _write_valkey(metrics)
        # # Optional readback for logging/verification; keep lightweight.
        # sample_keys = [f"{SETTINGS.valkey_prefix}:{pkg}:{srv}:{os_type}" for (pkg, srv, os_type) in list(metrics.keys())[:5]]
        # if sample_keys:
        #     _fetch_valkey(sample_keys)
        # logging.info("[basic_information_device] synced %d keys", len(metrics))
    except Exception as exc:
        logging.exception("[basic_information_device] failed to sync: %s", exc)


__all__ = ["run"]
