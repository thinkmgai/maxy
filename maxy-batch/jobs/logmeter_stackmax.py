"""
일주일간의 crash/error 일 평균을 계산해 Logmeter 스택 최대값 후보를 Valkey에 기록한다.
"""

from __future__ import annotations

import logging
import math
from datetime import datetime
from typing import Dict, Iterable, Tuple

import redis

from ClickHouseComm import get_client
from clickhouse import SQL
from settings import SETTINGS

WINDOW_DAYS = 7
VALKEY_KEY_PREFIX = f"{SETTINGS.valkey_prefix}:logmeter:stackmax"

_valkey_client: redis.Redis | None = None


def _rows_to_dicts(result) -> Iterable[dict]:
    cols = result.column_names
    for row in result.result_rows:
        yield dict(zip(cols, row))


def _get_click_client():
    # 세션 충돌을 피하기 위해 매 호출마다 신규 클라이언트를 생성한다.
    return get_client(SETTINGS.clickhouse)


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


def _normalize_dimensions(row: dict) -> Tuple[str, str] | None:
    pkg = row.get("package_nm")
    server_type = row.get("server_type")
    if pkg in (None, "") or server_type in (None, ""):
        logging.warning("[stackmax] skip row with missing package/server_type: %s", row)
        return None
    return str(pkg), str(server_type)


def _fetch_weekly_averages() -> Dict[Tuple[str, str], dict]:
    """Select 7일 평균 crash/error 건수를 조회한다."""
    client = _get_click_client()
    sql = SQL.render("metrics.selectWeeklyTroubleAverages")
    logging.info("[stackmax] weekly averages SQL: %s", sql)
    result = client.query(sql)
    metrics: Dict[Tuple[str, str], dict] = {}
    for row in _rows_to_dicts(result):
        key = _normalize_dimensions(row)
        if key is None:
            continue
        # prefer new aliases; fallback kept for safety
        avg_crash = row.get("avg_crash_7d", row.get("avg_crash_per_day"))
        avg_error = row.get("avg_error_7d", row.get("avg_error_per_day"))
        metrics[key] = {
            "avg_crash_7d": float(avg_crash or 0),
            "avg_error_7d": float(avg_error or 0),
        }
    return metrics


def _compute_stack_max(avg_value: float) -> int:
    if not math.isfinite(avg_value):
        avg_value = 0.0
    return max(0, int(math.ceil(avg_value)))


def _write_valkey(metrics: Dict[Tuple[str, str], dict]) -> None:
    if not metrics:
        logging.info("[stackmax] no weekly averages to write")
        return

    client = _get_valkey_client()
    now_iso = datetime.utcnow().isoformat() + "Z"
    pipe = client.pipeline(transaction=True)

    for (pkg, server_type), vals in metrics.items():
        avg_crash = float(vals.get("avg_crash_7d") or 0)
        avg_error = float(vals.get("avg_error_7d") or 0)
        stack_max_crash = _compute_stack_max(avg_crash)
        stack_max_error = _compute_stack_max(avg_error)

        key = f"{VALKEY_KEY_PREFIX}:{pkg}:{server_type}"
        payload = {
            "package_nm": pkg,
            "server_type": server_type,
            "days": WINDOW_DAYS,
            "avg_crash_7d": round(avg_crash, 4),
            "avg_error_7d": round(avg_error, 4),
            "stack_max_crash": stack_max_crash,
            "stack_max_error": stack_max_error,
            "stackMaxCrash": stack_max_crash,
            "stackMaxError": stack_max_error,
            "avgCrash7d": round(avg_crash, 4),
            "avgError7d": round(avg_error, 4),
            "updated_at": now_iso,
        }
        pipe.hset(key, mapping=payload)
        logging.info("[stackmax] write key=%s payload=%s", key, payload)

    pipe.execute()
    logging.info("[stackmax] wrote %d weekly average rows", len(metrics))


def run() -> None:
    """7일 평균 trouble 건수를 계산해 스택 상한 후보를 Valkey에 적재한다."""
    try:
        metrics = _fetch_weekly_averages()
        _write_valkey(metrics)
    except Exception:
        logging.exception("[stackmax] failed to compute or write stack max values")


__all__ = ["run"]
