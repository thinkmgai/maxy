"""
최근 수집된 total-log를 5초 단위로 조회해 Valkey에 덮어쓴다.

- Cursor: `VALKEY_PREFIX:totallog:cursor` stores the latest processed reg_dt (UTC, ms precision).
- Data key: `VALKEY_PREFIX:totallog:{package_nm}:{server_type}`
  - Fields: package_nm, server_type, log_count (해당 윈도우 건수), updated_at, last_reg_dt, window_start, window_end
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Dict, Iterable, Tuple
import inspect

import redis

from ClickHouseComm import get_client
from clickhouse import SQL
from settings import SETTINGS

_valkey_client = None

VALKEY_CURSOR_KEY = f"{SETTINGS.valkey_prefix}:totallog:cursor"
VALKEY_KEY_PREFIX = f"{SETTINGS.valkey_prefix}:totallog"
STACKMAX_KEY_PREFIX = f"{SETTINGS.valkey_prefix}:logmeter:stackmax"
LOOKBACK_ON_EMPTY = timedelta(seconds=10)


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


def _parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        cleaned = value.rstrip("Z")
        return datetime.fromisoformat(cleaned)
    except Exception:
        logging.warning("[batch_logmeter] could not parse cursor dt '%s'", value)
        return None


def _format_dt(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]


def _caller_name() -> str:
    """Return the name of the function that called into this module."""
    frame = inspect.currentframe()
    if frame and frame.f_back and frame.f_back.f_back:
        return frame.f_back.f_back.f_code.co_name
    return "unknown"


def _load_cursor() -> datetime | None:
    client = _get_valkey_client()
    raw = client.get(VALKEY_CURSOR_KEY)
    return _parse_dt(raw)


def _determine_window(now: datetime) -> tuple[datetime, datetime]:
    last = _load_cursor()
    if last is None:
        start = now - LOOKBACK_ON_EMPTY
    else:
        start = last
    # Prevent zero/negative window if clock skew or identical cursor
    end = now if now > start else start + timedelta(seconds=1)
    return start, end


def _normalize_dimensions(row: dict) -> tuple[str, str] | None:
    pkg = row.get("package_nm")
    server_type = row.get("server_type")
    if pkg in (None, "") or server_type in (None, ""):
        logging.warning("[batch_logmeter] skip row with missing package/server_type: %s", row)
        return None
    return str(pkg), str(server_type)


def _fetch_deltas(start: datetime, end: datetime) -> tuple[Dict[Tuple[str, str], dict], datetime | None]:
    client = _get_click_client()
    params = {
        "start_iso": _format_dt(start),
    }
    sql = SQL.render("metrics.selectTotalLogIncremental", params)
    logging.info(
        "[batch_logmeter] caller=%s range %s -> open SQL: %s",
        _caller_name(),
        params["start_iso"],
        sql,
    )
    result = client.query(sql)

    metrics: Dict[Tuple[str, str], dict] = {}
    cursor: datetime | None = None

    for row in _rows_to_dicts(result):
        key = _normalize_dimensions(row)
        if key is None:
            continue
        metrics[key] = {
            "log_count": int(row.get("log_count") or 0),
        }
        last_dt = row.get("last_reg_dt")
        if isinstance(last_dt, datetime):
            pass
        else:
            last_dt = _parse_dt(str(last_dt)) if last_dt is not None else None
        if isinstance(last_dt, datetime):
            if cursor is None or last_dt > cursor:
                cursor = last_dt
    return metrics, cursor


def _fetch_today_trouble_counts() -> Dict[Tuple[str, str], dict]:
    client = _get_click_client()
    sql = SQL.render("metrics.selectTodayTroubleCounts")
    logging.info("[batch_logmeter] today trouble SQL: %s", sql)
    result = client.query(sql)
    counts: Dict[Tuple[str, str], dict] = {}
    for row in _rows_to_dicts(result):
        key = _normalize_dimensions(row)
        if key is None:
            continue
        counts[key] = {
            "today_crash_count": int(row.get("today_crash_count") or 0),
            "today_error_count": int(row.get("today_error_count") or 0),
        }
    return counts
def _fetch_stackmax_averages(keys: Iterable[Tuple[str, str]]) -> Dict[Tuple[str, str], dict]:
    key_list = list(keys)
    if not key_list:
        return {}
    client = _get_valkey_client()
    pipe = client.pipeline(transaction=False)
    valkey_keys: list[str] = []
    for pkg, server_type in key_list:
        redis_key = f"{STACKMAX_KEY_PREFIX}:{pkg}:{server_type}"
        valkey_keys.append(redis_key)
        pipe.hgetall(redis_key)
    raw_results = pipe.execute()

    averages: Dict[Tuple[str, str], dict] = {}
    for (pkg, server_type), raw in zip(key_list, raw_results):
        if not raw:
            continue
        try:
            avg_crash = float(raw.get("avgCrash7d") or 0)
            avg_error = float(raw.get("avgError7d") or 0)
        except Exception:
            avg_crash = 0.0
            avg_error = 0.0
        averages[(pkg, server_type)] = {
            "avg_crash_7d": avg_crash,
            "avg_error_7d": avg_error,
            "avgCrash7d": avg_crash,
            "avgError7d": avg_error,
        }
    return averages


def _write_valkey(metrics: Dict[Tuple[str, str], dict], cursor: datetime | None, window: tuple[datetime, datetime]) -> None:
    client = _get_valkey_client()
    now_iso = datetime.utcnow().isoformat() + "Z"
    cursor_iso = (_format_dt(cursor) + "Z") if cursor else None
    window_start_iso = _format_dt(window[0]) + "Z"
    window_end_iso = _format_dt(window[1]) + "Z"

    pipe = client.pipeline(transaction=True)
    for (pkg, server_type), vals in metrics.items():
        key = f"{VALKEY_KEY_PREFIX}:{pkg}:{server_type}"
        prev = client.hgetall(key) or {}
        prev_today_crash = int(prev.get("today_crash_count") or 0)
        prev_today_error = int(prev.get("today_error_count") or 0)
        today_crash = vals.get("today_crash_count", 0)
        today_error = vals.get("today_error_count", 0)
        crash_delta = max(0, today_crash - prev_today_crash)
        error_delta = max(0, today_error - prev_today_error)
        avg_crash = vals.get("avg_crash_7d")
        avg_error = vals.get("avg_error_7d")
        # 덮어쓰기(HSET)만 수행해 UI가 바로 최신 상태를 읽을 수 있도록 한다.
        pipe.hset(
            key,
            mapping={
                "package_nm": pkg,
                "server_type": server_type,
                "log_count": vals.get("log_count", 0),
                "today_crash_count": today_crash,
                "today_error_count": today_error,
                "crash_count": crash_delta,
                "error_count": error_delta,
                "avgCrash7d": avg_crash if avg_crash is not None else "",
                "avgError7d": avg_error if avg_error is not None else "",
                # Always record the write time even if we don't move the cursor (no new rows).
                "updated_at": now_iso,
                "last_reg_dt": cursor_iso or "",
                "window_start": window_start_iso,
                "window_end": window_end_iso,
            },
        )
        logging.info(
            "[batch_logmeter] write key=%s payload=%s",
            key,
            {
                "log_count": vals.get("log_count", 0),
                "today_crash_count": today_crash,
                "today_error_count": today_error,
                "crash_count": crash_delta,
                "error_count": error_delta,
                "server_type": server_type,
                "avg_crash_7d": avg_crash if avg_crash is not None else "",
                "avg_error_7d": avg_error if avg_error is not None else "",
                "updated_at": now_iso,
                "last_reg_dt": cursor_iso or "",
                "window_start": window_start_iso,
                "window_end": window_end_iso,
            },
        )

    if cursor_iso:
        pipe.set(VALKEY_CURSOR_KEY, cursor_iso)
    pipe.execute()
    logging.info("[batch_logmeter] wrote %d entries; cursor=%s", len(metrics), cursor_iso or "unchanged")


def run() -> None:
    """Fetch new total logs since last cursor and overwrite per package/log_type counts."""
    try:
        now = datetime.utcnow()
        start, end = _determine_window(now)
        metrics, cursor = _fetch_deltas(start, end)
        trouble_counts = _fetch_today_trouble_counts()
        averages = _fetch_stackmax_averages(trouble_counts.keys())
        for key, counts in trouble_counts.items():
            metrics.setdefault(key, {})
            metrics[key].update(counts)
            if key in averages:
                metrics[key].update(averages[key])
        if metrics:
            _write_valkey(metrics, cursor, (start, end))
        else:
            logging.info("[batch_logmeter] no rows or counts between %s and %s", _format_dt(start), _format_dt(end))
    except Exception as exc:
        logging.exception("[batch_logmeter] failed to run: %s", exc)


__all__ = ["run"]
