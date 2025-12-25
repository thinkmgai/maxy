"""
Daily (어제) device/page 통계를 ClickHouse에 적재하고 Valkey에 캐시합니다.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, date
from typing import Dict, Iterable, Tuple, List

import redis

from ClickHouseComm import get_client
from clickhouse import SQL
from settings import SETTINGS

_click_client = None
_valkey_client = None


def _rows_to_dicts(result) -> Iterable[dict]:
    cols = result.column_names
    for row in result.result_rows:
        yield dict(zip(cols, row))


def _normalize_dimensions(row: dict) -> tuple[str, str, str] | None:
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
            "[daily_device_page_summary] skip row with missing dimensions pkg=%s server=%s os=%s row=%s",
            pkg,
            server,
            os_type,
            row,
        )
        return None

    return (str(pkg), str(server), str(os_type))


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


def _fetch_device_metrics() -> Dict[Tuple[str, str, str], dict]:
    client = _get_click_client()
    sql1 = SQL.render("metrics.selectBIDailyStatiistic1")
    sql2 = SQL.render("metrics.selectBIDailyStatiistic2")
    logging.info("[daily_device_page_summary] metrics.selectBIDailyStatiistic1 SQL (visit/install/login): %s", sql1)
    logging.info("[daily_device_page_summary] metrics.selectBIDailyStatiistic2 SQL (dau/revisit/mau): %s", sql2)

    visit_res = client.query(sql1)
    bitmap_res = client.query(sql2)

    combined: Dict[Tuple[str, str, str], dict] = {}

    for row in _rows_to_dicts(visit_res):
        key = _normalize_dimensions(row)
        if key is None:
            continue
        combined.setdefault(key, {})
        combined[key].update(
            {
                "visit": int(row.get("total_visit") or 0),
                "install": int(row.get("total_install") or 0),
                "login": int(row.get("total_login") or 0),
            }
        )

    for row in _rows_to_dicts(bitmap_res):
        key = _normalize_dimensions(row)
        if key is None:
            continue
        combined.setdefault(key, {})
        combined[key].update(
            {
                "dau": int(row.get("dau") or 0),
                "revisit_7d": int(row.get("revisit_7d") or 0),
                "mau": int(row.get("mau") or 0),
            }
        )

    return combined


def _fetch_page_metrics() -> Dict[Tuple[str, str, str], dict]:
    client = _get_click_client()
    sql = SQL.render("metrics.selectBIDailyPageSummary")
    logging.info("[daily_device_page_summary] SQL (page): %s", sql)
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


def _merge(device: Dict[Tuple[str, str, str], dict], page: Dict[Tuple[str, str, str], dict]) -> Dict[Tuple[str, str, str], dict]:
    merged: Dict[Tuple[str, str, str], dict] = {}
    for key, vals in device.items():
        merged[key] = dict(vals)
    for key, vals in page.items():
        merged.setdefault(key, {})
        merged[key].update(vals)

    for vals in merged.values():
        vals.setdefault("visit", 0)
        vals.setdefault("install", 0)
        vals.setdefault("login", 0)
        vals.setdefault("dau", 0)
        vals.setdefault("revisit_7d", 0)
        vals.setdefault("mau", 0)
        vals.setdefault("crash_count", 0)
        vals.setdefault("error_count", 0)
        vals.setdefault("js_error_count", 0)
        vals.setdefault("log_count", 0)
        vals.setdefault("intervaltime_avg", 0.0)
        vals.setdefault("lcp_avg", 0.0)
        vals.setdefault("ttfb_avg", 0.0)
        vals.setdefault("fcp_avg", 0.0)
        vals.setdefault("inp_avg", 0.0)
        vals.setdefault("pv", 0)
    return merged


def _insert_clickhouse(stat_date: date, rows: List[dict]) -> None:
    client = _get_click_client()
    table = "maxy_device_statistic"
    columns = [
        "stat_date",
        "package_nm",
        "server_type",
        "os_type",
        "visit",
        "install",
        "login",
        "dau",
        "revisit_7d",
        "mau",
        "crash_count",
        "error_count",
        "js_error_count",
        "log_count",
        "intervaltime_avg",
        "lcp_avg",
        "ttfb_avg",
        "fcp_avg",
        "inp_avg",
        "pv",
        "updated_at",
    ]
    data = [
        [
            stat_date,
            row["package_nm"],
            int(row["server_type"]),
            row["os_type"],
            int(row["visit"]),
            int(row["install"]),
            int(row["login"]),
            int(row["dau"]),
            int(row["revisit_7d"]),
            int(row["mau"]),
            int(row["crash_count"]),
            int(row["error_count"]),
            int(row["js_error_count"]),
            int(row["log_count"]),
            float(row["intervaltime_avg"]),
            float(row["lcp_avg"]),
            float(row["ttfb_avg"]),
            float(row["fcp_avg"]),
            float(row["inp_avg"]),
            int(row["pv"]),
            datetime.utcnow(),
        ]
        for row in rows
    ]
    client.insert(table, data, column_names=columns)
    logging.info("[daily_device_page_summary] inserted %d rows into %s", len(rows), table)


def _write_valkey(stat_date: str, merged: Dict[Tuple[str, str, str], dict]) -> None:
    client = _get_valkey_client()
    pipe = client.pipeline()
    for (pkg, server, os_type), vals in merged.items():
        key = f"{SETTINGS.valkey_prefix}:daily:{stat_date}:{pkg}:{server}:{os_type}"
        payload = {
            "stat_date": stat_date,
            "package_nm": pkg,
            "server_type": server,
            "os_type": os_type,
            **vals,
            "updated_at": datetime.utcnow().isoformat() + "Z",
        }
        pipe.hset(key, mapping=payload)
        logging.info("[daily_device_page_summary] write key=%s value=%s", key, payload)
    pipe.execute()
    logging.info("[daily_device_page_summary] wrote %d hash entries to Valkey", len(merged))


def run() -> None:
    """어제 기준 집계 → ClickHouse 적재 → Valkey 캐시."""
    try:
        device = _fetch_device_metrics()
        page = _fetch_page_metrics()
        merged = _merge(device, page)

        stat_date_date = (datetime.utcnow() - timedelta(days=1)).date()
        stat_date_str = stat_date_date.isoformat()

        rows = []
        for (pkg, server, os_type), vals in merged.items():
            rows.append(
                {
                    "package_nm": pkg,
                    "server_type": server,
                    "os_type": os_type,
                    **vals,
                }
            )

        if rows:
            _insert_clickhouse(stat_date_date, rows)
            _write_valkey(stat_date_str, merged)
        else:
            logging.info("[daily_device_page_summary] no rows to insert/cache for %s", stat_date_str)
    except Exception:
        logging.exception("[daily_device_page_summary] failed to run")


__all__ = ["run"]
