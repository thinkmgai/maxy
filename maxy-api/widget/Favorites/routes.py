"""FastAPI routes for the Favorites dashboard widget."""

from __future__ import annotations

import csv
import json
import logging
import os
from datetime import date, datetime, timedelta
from functools import lru_cache
from pathlib import Path
from typing import Dict, Iterable, Literal, Optional, Tuple

from fastapi import HTTPException
from pydantic import BaseModel, Field, ConfigDict, validator

from apiserver import app
from .clickhouse import SQL, get_client as get_clickhouse_client
from playload.favoritesPayload import (
    FavoritesInfoListConfig,
    FavoritesRowInfoConfig,
    build_favorites_info_list,
    build_favorites_row_info,
)

try:
    import redis  # type: ignore
except ImportError:  # pragma: no cover
    redis = None  # type: ignore

logger = logging.getLogger(__name__)

CRASH_LOG_TYPE = 2097152


@lru_cache(maxsize=1)
def _find_data_dir() -> Path:
    current = Path(__file__).resolve()
    for parent in current.parents:
        candidate = parent / "Data"
        if candidate.exists():
            return candidate
    return current.parent / "Data"


DATA_DIR = _find_data_dir()
APPLICATION_CSV = DATA_DIR / "application.csv"


# @lru_cache(maxsize=1)
def _load_application_map() -> Dict[str, Dict[str, str]]:
    mapping: Dict[str, Dict[str, str]] = {}
    if not APPLICATION_CSV.exists():
        return mapping
    with APPLICATION_CSV.open("r", newline="", encoding="utf-8") as fp:
        reader = csv.DictReader(fp)
        for row in reader:
            app_id = str(row.get("applicationId") or "").strip()
            if not app_id:
                continue
            mapping[app_id] = row
    return mapping


def _resolve_pkg_server(application_id: int, server_type_override: Optional[int] = None) -> tuple[str, str] | None:
    app_info = _load_application_map().get(str(application_id))
    if not app_info:
        return None
    package_nm = str(app_info.get("packageId") or "").strip()
    server_type = (
        str(server_type_override)
        if server_type_override is not None
        else str(app_info.get("serverType") or "").strip()
    )
    if not package_nm or not server_type:
        return None
    return package_nm, server_type


def _get_valkey():
    if redis is None:
        raise HTTPException(status_code=500, detail="redis 패키지가 설치되어 있지 않습니다.")
    try:
        client = redis.Redis(
            host=os.getenv("VALKEY_HOST", "localhost"),
            port=int(os.getenv("VALKEY_PORT", "6379")),
            password=os.getenv("VALKEY_PASSWORD") or None,
            db=int(os.getenv("VALKEY_DB", "0")),
            ssl=os.getenv("VALKEY_SSL", "false").lower() in {"1", "true", "yes", "y", "on"},
            decode_responses=True,
            socket_timeout=5,
            socket_connect_timeout=5,
            retry_on_timeout=True,
        )
        client.ping()
        return client
    except Exception as exc:  # pragma: no cover
        logger.exception("Valkey 연결 실패: %s", exc)
        raise HTTPException(status_code=500, detail="Valkey 연결에 실패했습니다.")


def _normalize_os_type(os_type: Optional[str]) -> Optional[str]:
    if os_type is None:
        return None
    cleaned = os_type.strip()
    if not cleaned:
        return None
    lowered = cleaned.lower()
    if lowered in {"all", "전체", "a"}:
        return None
    if lowered in {"android", "and", "aos"}:
        return "Android"
    if lowered in {"ios", "iphone"}:
        return "iOS"
    return cleaned


def _valkey_os_type_variants(normalized_os: str) -> list[str]:
    if normalized_os == "Android":
        return ["Android"]
    if normalized_os == "iOS":
        return ["iOS"]
    return [normalized_os]


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


def _parse_items(raw: str | None) -> list[dict]:
    if not raw:
        return []
    try:
        parsed = json.loads(raw)
    except Exception:
        return []
    if not isinstance(parsed, list):
        return []
    return [item for item in parsed if isinstance(item, dict)]


def _valkey_hgetall_many(client, keys: list[str]) -> list[dict]:
    pipe = client.pipeline(transaction=False)
    for key in keys:
        pipe.hgetall(key)
    return pipe.execute()


def _clickhouse_rows(result) -> Iterable[dict]:
    cols = result.column_names
    for row in result.result_rows:
        yield dict(zip(cols, row))


def _resolve_date_range(date_type: str) -> Tuple[date, date]:
    #today = datetime.utcnow().date()
    today = datetime.now().date()
    upper = (date_type or "DAY").upper()
    if upper == "WEEK":
        start = today - timedelta(days=6)
        end = today + timedelta(days=1)
        return start, end
    if upper == "MONTH":
        start = today - timedelta(days=29)
        end = today + timedelta(days=1)
        return start, end
    return today, today + timedelta(days=1)


def _payloads_to_df(payloads: list[dict], pd):
    frames = []
    for payload in payloads:
        if not isinstance(payload, dict):
            continue
        items = _parse_items(payload.get("items"))
        if not items:
            continue
        frames.append(pd.DataFrame.from_records(items))
    if not frames:
        return pd.DataFrame()
    return pd.concat(frames, ignore_index=True)


def _finalize_favorites_stats(row) -> dict:
    count = _safe_int(row.get("count"))
    log_count = _safe_int(row.get("logCount"))
    uniq_device_count = _safe_int(row.get("uniqDeviceCount"))
    sum_cpu = _safe_int(row.get("sumCpuUsage"))
    sum_mem = _safe_int(row.get("sumMemUsage"))

    denom_count = count if count > 0 else 1
    denom_log = log_count if log_count > 0 else 1

    loading_weighted = _safe_int(row.get("loading_weighted"))
    response_weighted = _safe_int(row.get("response_weighted"))
    interval_weighted = _safe_int(row.get("interval_weighted"))

    return {
        "reqUrl": str(row.get("reqUrl") or "").strip(),
        "count": count,
        "logCount": log_count,
        "uniqDeviceCount": uniq_device_count,
        "sumCpuUsage": sum_cpu,
        "sumMemUsage": sum_mem,
        "loadingTime": int(round(loading_weighted / denom_count)) if count > 0 else 0,
        "responseTime": int(round(response_weighted / denom_count)) if count > 0 else 0,
        "intervaltime": int(round(interval_weighted / denom_count)) if count > 0 else 0,
        "errorCount": _safe_int(row.get("errorCount")),
        "crashCount": _safe_int(row.get("crashCount")),
        "cpuUsage": int(round(sum_cpu / denom_log)) if log_count > 0 else 0,
        "memUsage": int(round(sum_mem / denom_log)) if log_count > 0 else 0,
        "logType": None,
    }


def _merge_by_req_url(df) -> list[dict]:
    import pandas as pd  # type: ignore
    if df is None or df.empty:
        return []

    df = df.copy()
    if "reqUrl" not in df.columns:
        return []

    df["reqUrl"] = df["reqUrl"].astype(str).str.strip()
    df = df[df["reqUrl"] != ""]
    if df.empty:
        return []

    numeric_cols = [
        "count",
        "logCount",
        "uniqDeviceCount",
        "sumCpuUsage",
        "sumMemUsage",
        "loadingTime",
        "responseTime",
        "intervaltime",
        "errorCount",
        "crashCount",
    ]
    for col in numeric_cols:
        if col not in df.columns:
            df[col] = 0
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0).round().astype("int64")

    df["loading_weighted"] = df["loadingTime"] * df["count"]
    df["response_weighted"] = df["responseTime"] * df["count"]
    df["interval_weighted"] = df["intervaltime"] * df["count"]

    grouped = df.groupby("reqUrl", as_index=False, sort=False).agg(
        count=("count", "sum"),
        logCount=("logCount", "sum"),
        uniqDeviceCount=("uniqDeviceCount", "sum"),
        sumCpuUsage=("sumCpuUsage", "sum"),
        sumMemUsage=("sumMemUsage", "sum"),
        errorCount=("errorCount", "sum"),
        crashCount=("crashCount", "sum"),
        loading_weighted=("loading_weighted", "sum"),
        response_weighted=("response_weighted", "sum"),
        interval_weighted=("interval_weighted", "sum"),
    )

    finalized = grouped.apply(_finalize_favorites_stats, axis=1, result_type="expand")
    finalized = finalized.sort_values("count", ascending=False, kind="mergesort")
    return finalized.to_dict(orient="records")


def _fetch_favorites_today_from_valkey(
    package_nm: str,
    server_type: str,
    os_type: Optional[str],
    size: int,
) -> list[dict]:
    try:
        import pandas as pd  # type: ignore
    except ImportError:  # pragma: no cover
        raise HTTPException(status_code=500, detail="pandas 패키지가 설치되어 있지 않습니다.")

    prefix = os.getenv("VALKEY_PREFIX", "stats:realtime")
    key_prefix = f"{prefix}:favorites:infolist:{package_nm}:{server_type}"
    client = _get_valkey()

    normalized_os = _normalize_os_type(os_type)

    if normalized_os is not None:
        variants = _valkey_os_type_variants(normalized_os)
        keys = [f"{key_prefix}:{variant}" for variant in variants]
        df = _payloads_to_df(_valkey_hgetall_many(client, keys), pd)
        merged = _merge_by_req_url(df)
        if merged:
            return merged[:size]

        keys = list(client.scan_iter(match=f"{key_prefix}:*", count=50))
        if not keys:
            return []
        matched = [
            key
            for key in keys
            if key.rsplit(":", 1)[-1].strip() == normalized_os
        ]
        if not matched:
            return []
        df = _payloads_to_df(_valkey_hgetall_many(client, matched), pd)
        return _merge_by_req_url(df)[:size]

    # 2) osType=None이면 android/ios 먼저 읽고, 없으면 scan fallback
    keys = []
    for os_value in ("Android", "iOS"):
        for variant in _valkey_os_type_variants(os_value):
            keys.append(f"{key_prefix}:{variant}")
    keys = list(dict.fromkeys(keys))
    df = _payloads_to_df(_valkey_hgetall_many(client, keys), pd)
    merged = _merge_by_req_url(df)
    if merged:
        return merged[:size]

    keys = list(client.scan_iter(match=f"{key_prefix}:*", count=50))
    if not keys:
        return []
    df = _payloads_to_df(_valkey_hgetall_many(client, keys), pd)
    return _merge_by_req_url(df)[:size]


class FavoritesInfoListRequest(BaseModel):
    """Request payload for the Favorites overview list."""

    applicationId: int = Field(..., ge=0, description="Application identifier")
    osType: Optional[str] = Field(None, max_length=32, description="Filter by OS; omit for all")
    dateType: Literal["DAY", "WEEK", "MONTH"] = Field(
        "DAY", description="Aggregation window matching the legacy dashboard"
    )
    size: int = Field(12, ge=1, le=500, description="Maximum number of rows to return")
    tmzutc: int = Field(..., description="조회 기준 타임존의 UTC 오프셋(분, 예: 한국 +9시는 540)")

    model_config = ConfigDict(populate_by_name=True)


class FavoritesInfoListItem(BaseModel):
    reqUrl: str
    count: int
    logCount: int
    sumCpuUsage: int
    sumMemUsage: int
    loadingTime: int
    responseTime: int
    intervaltime: int
    errorCount: int
    crashCount: int
    cpuUsage: int
    memUsage: int
    logType: Optional[str] = None


class FavoritesInfoListResponse(BaseModel):
    code: int = 200
    message: str = "Success"
    list: list[FavoritesInfoListItem]


class FavoritesRowRequest(BaseModel):
    """Request payload for the Favorites drill-down series."""

    applicationId: int = Field(..., ge=0, description="Application identifier")
    reqUrl: str = Field(..., min_length=1, max_length=256, description="Page URL identifier")
    osType: Optional[str] = Field(None, max_length=32, description="Filter by OS; omit for all")
    dateType: Literal["DAY", "WEEK", "MONTH"] = Field(
        "DAY", description="Aggregation window matching the legacy dashboard"
    )
    tmzutc: int = Field(..., description="조회 기준 타임존의 UTC 오프셋(분, 예: 한국 +9시는 540)")

    model_config = ConfigDict(populate_by_name=True)

    @validator("reqUrl")
    def _req_url_not_blank(cls, value: str) -> str:  # noqa: N805
        if not value.strip():
            raise ValueError("reqUrl must not be blank.")
        return value


class FavoritesRowInfoResponse(BaseModel):
    code: int = 200
    message: str = "Success"
    count: list[list[int]]
    error: list[list[int]]
    crash: list[list[int]]
    loadingTime: list[list[int]]
    responseTime: list[list[int]]


class FavoritesAllInfoListRequest(BaseModel):
    """Request payload for Favorites > All popup table (ClickHouse)."""

    applicationId: int = Field(..., ge=0, description="Application identifier")
    osType: Optional[str] = Field(None, max_length=32, description="Filter by OS; omit for all")
    dateType: Literal["DAY", "WEEK", "MONTH"] = Field("DAY", description="Aggregation window")
    limit: int = Field(100, ge=1, le=500, description="Page size")
    offset: int = Field(0, ge=0, le=1_000_000, description="Offset for pagination")
    tmzutc: int = Field(..., description="조회 기준 타임존의 UTC 오프셋(분)")

    model_config = ConfigDict(populate_by_name=True)


class FavoritesAllInfoListResponse(BaseModel):
    code: int = 200
    message: str = "Success"
    offset: int
    limit: int
    hasMore: bool
    list: list[FavoritesInfoListItem]


def _fetch_favorites_all_info_list_clickhouse(
    *,
    package_id: str,
    server_type: int,
    os_type: Optional[str],
    date_type: str,
    limit: int,
    offset: int,
) -> tuple[list[dict], bool]:
    start_date, end_date = _resolve_date_range(date_type)
    os_filter = _normalize_os_type(os_type) or ""

    sql = """
    SELECT
        page_name AS reqUrl,
        countMerge(cnt) AS count,
        sumMerge(sum_log_count) AS logCount,
        sumMerge(sum_cpu_usage) AS sumCpuUsage,
        sumMerge(sum_mem_usage) AS sumMemUsage,
        avgMerge(avg_loading_tm) AS loadingTimeAvg,
        avgMerge(avg_interval_tm) AS intervaltimeAvg,
        sumMerge(sum_response_tm) AS sumResponseTm,
        sumMerge(sum_request_count) AS requestCount,
        sumMerge(sum_error_count) AS errorCount,
        sumMerge(sum_crash_count) AS crashCount
    FROM maxy_page_daily
    WHERE log_date >= toDate(%(from_date)s)
      AND log_date <  toDate(%(to_date)s)
      AND package_id = %(package_id)s
      AND server_type = %(server_type)s
      AND page_name != ''
      AND (%(os_type)s = '' OR os_type = %(os_type)s)
    GROUP BY page_name
    ORDER BY count DESC, reqUrl ASC
    LIMIT %(limit_plus_one)s OFFSET %(offset)s
    """
    params = {
        "from_date": start_date.isoformat(),
        "to_date": end_date.isoformat(),
        "package_id": package_id,
        "server_type": int(server_type),
        "os_type": os_filter,
        "limit_plus_one": int(limit) + 1,
        "offset": int(offset),
    }

    result = get_clickhouse_client().query(sql, params)

    rows: list[dict] = []
    for row in _clickhouse_rows(result):
        req_url = str(row.get("reqUrl") or "")
        count = _safe_int(row.get("count"))
        log_count = _safe_int(row.get("logCount"))
        sum_cpu = _safe_int(row.get("sumCpuUsage"))
        sum_mem = _safe_int(row.get("sumMemUsage"))
        error_count = _safe_int(row.get("errorCount"))
        crash_count = _safe_int(row.get("crashCount"))

        request_count = _safe_int(row.get("requestCount"))
        sum_response = _safe_int(row.get("sumResponseTm"))

        response_time = int(round(sum_response / request_count)) if request_count > 0 else 0
        cpu_usage = int(round(sum_cpu / log_count)) if log_count > 0 else 0
        mem_usage = int(round(sum_mem / log_count)) if log_count > 0 else 0

        rows.append(
            {
                "reqUrl": req_url,
                "count": count,
                "logCount": log_count,
                "sumCpuUsage": sum_cpu,
                "sumMemUsage": sum_mem,
                "loadingTime": int(round(float(row.get("loadingTimeAvg") or 0))),
                "responseTime": response_time,
                "intervaltime": int(round(float(row.get("intervaltimeAvg") or 0))),
                "errorCount": error_count,
                "crashCount": crash_count,
                "cpuUsage": cpu_usage,
                "memUsage": mem_usage,
                "logType": None,
            }
        )

    has_more = len(rows) > limit
    return rows[:limit], has_more


def _expected_time_buckets_ms(date_type: str, start_date: date, end_date: date) -> list[int]:
    upper = (date_type or "DAY").upper()
    step = timedelta(hours=1) if upper == "DAY" else timedelta(days=1)
    start_dt = datetime.combine(start_date, datetime.min.time())
    end_dt = datetime.combine(end_date, datetime.min.time())
    buckets: list[int] = []
    cursor = start_dt
    while cursor < end_dt:
        buckets.append(int(cursor.timestamp() * 1000))
        cursor += step
    return buckets


def _fetch_favorites_all_row_info_clickhouse(
    *,
    package_id: str,
    server_type: int,
    os_type: Optional[str],
    date_type: str,
    req_url: str,
) -> dict:
    upper = (date_type or "DAY").upper()
    start_date, end_date = _resolve_date_range(upper)
    os_filter = _normalize_os_type(os_type) or ""
    buckets = _expected_time_buckets_ms(upper, start_date, end_date)

    series_by_ts: dict[int, dict] = {}
    client = get_clickhouse_client()

    if upper == "DAY":
        start_ts = datetime.combine(start_date, datetime.min.time()).strftime("%Y-%m-%d %H:%M:%S")
        end_ts = datetime.combine(end_date, datetime.min.time()).strftime("%Y-%m-%d %H:%M:%S")
        sql = """
        SELECT
            toUnixTimestamp(toStartOfHour(page_start_tm_dt)) * 1000 AS ts,
            count() AS count,
            sum(ifNull(error_count, 0)) AS errorCount,
            sum(ifNull(crash_count, 0)) AS crashCount,
            medianIf(toUInt32(loading_time), loading_time IS NOT NULL) AS loadingTime,
            avgIf(toUInt32(response_time), response_time IS NOT NULL) AS responseTime
        FROM maxy_device_page_flow
        WHERE page_start_tm_dt >= toDateTime(%(from_ts)s)
          AND page_start_tm_dt <  toDateTime(%(to_ts)s)
          AND package_nm = %(package_nm)s
          AND server_type = %(server_type)s
          AND page_name = %(page_name)s
          AND (%(os_type)s = '' OR os_type = %(os_type)s)
        GROUP BY ts
        ORDER BY ts
        """
        params = {
            "from_ts": start_ts,
            "to_ts": end_ts,
            "package_nm": package_id,
            "server_type": int(server_type),
            "page_name": req_url,
            "os_type": os_filter,
        }
        result = client.query(sql, params)
        for row in _clickhouse_rows(result):
            ts = _safe_int(row.get("ts"))
            series_by_ts[ts] = {
                "count": _safe_int(row.get("count")),
                "error": _safe_int(row.get("errorCount")),
                "crash": _safe_int(row.get("crashCount")),
                "loading": int(round(float(row.get("loadingTime") or 0))),
                "response": int(round(float(row.get("responseTime") or 0))),
            }
    else:
        sql = """
        SELECT
            toUnixTimestamp(toDateTime(log_date)) * 1000 AS ts,
            countMerge(cnt) AS count,
            sumMerge(sum_error_count) AS errorCount,
            sumMerge(sum_crash_count) AS crashCount,
            avgMerge(avg_loading_tm) AS loadingTimeAvg,
            sumMerge(sum_response_tm) AS sumResponseTm,
            sumMerge(sum_request_count) AS requestCount
        FROM maxy_page_daily
        WHERE log_date >= toDate(%(from_date)s)
          AND log_date <  toDate(%(to_date)s)
          AND package_id = %(package_id)s
          AND server_type = %(server_type)s
          AND page_name = %(page_name)s
          AND (%(os_type)s = '' OR os_type = %(os_type)s)
        GROUP BY log_date
        ORDER BY log_date
        """
        params = {
            "from_date": start_date.isoformat(),
            "to_date": end_date.isoformat(),
            "package_id": package_id,
            "server_type": int(server_type),
            "page_name": req_url,
            "os_type": os_filter,
        }
        result = client.query(sql, params)
        for row in _clickhouse_rows(result):
            ts = _safe_int(row.get("ts"))
            request_count = _safe_int(row.get("requestCount"))
            sum_response = _safe_int(row.get("sumResponseTm"))
            series_by_ts[ts] = {
                "count": _safe_int(row.get("count")),
                "error": _safe_int(row.get("errorCount")),
                "crash": _safe_int(row.get("crashCount")),
                "loading": int(round(float(row.get("loadingTimeAvg") or 0))),
                "response": int(round(sum_response / request_count)) if request_count > 0 else 0,
            }

    count_series: list[list[int]] = []
    error_series: list[list[int]] = []
    crash_series: list[list[int]] = []
    loading_series: list[list[int]] = []
    response_series: list[list[int]] = []
    for ts in buckets:
        values = series_by_ts.get(ts) or {}
        count_series.append([ts, _safe_int(values.get("count"))])
        error_series.append([ts, _safe_int(values.get("error"))])
        crash_series.append([ts, _safe_int(values.get("crash"))])
        loading_series.append([ts, _safe_int(values.get("loading"))])
        response_series.append([ts, _safe_int(values.get("response"))])

    return {
        "count": count_series,
        "error": error_series,
        "crash": crash_series,
        "loadingTime": loading_series,
        "responseTime": response_series,
    }


def _fetch_favorites_trouble_list_clickhouse(
    *,
    package_nm: str,
    server_type: int,
    os_type: Optional[str],
    date_type: str,
    req_url: str,
    trouble_type: str,
    limit: int,
    offset: int,
) -> tuple[list[dict], Optional[dict]]:
    start_date, end_date = _resolve_date_range(date_type)
    start_ts = datetime.combine(start_date, datetime.min.time()).strftime("%Y-%m-%d %H:%M:%S")
    end_ts = datetime.combine(end_date, datetime.min.time()).strftime("%Y-%m-%d %H:%M:%S")

    os_filter = _normalize_os_type(os_type) or ""
    trouble = (trouble_type or "error").lower()
    if trouble not in {"error", "crash"}:
        raise HTTPException(status_code=400, detail="troubleType이 올바르지 않습니다.")

    params = {
        "from_ts": start_ts,
        "to_ts": end_ts,
        "package_nm": package_nm,
        "server_type": int(server_type),
        "os_type": os_filter,
        "req_url": req_url,
        "trouble_type": CRASH_LOG_TYPE if trouble == "crash" else 0,
        "crash_log_type": CRASH_LOG_TYPE,
        "limit_plus_one": int(limit) + 1,
        "offset": int(offset),
    }

    sql = SQL.render("favorites.selectFavoritesTroubleList", params)
    result = get_clickhouse_client().query(sql, params)
    rows: list[dict] = []
    for row in _clickhouse_rows(result):
        device_id = str(row.get("deviceId") or "").strip()
        if not device_id:
            continue
        rows.append(
            {
                "logTm": _safe_int(row.get("logTm")),
                "deviceId": device_id,
                "userId": row.get("userId"),
                "logType": _safe_int(row.get("logType")),
                "osType": row.get("osType"),
                "appVer": row.get("appVer"),
                "logName": row.get("logName"),
                "deviceModel": row.get("deviceModel"),
                "memUsage": _safe_int(row.get("memUsage")),
            }
        )

    has_more = len(rows) > limit
    return rows[:limit], {"offset": int(offset) + int(limit)} if has_more else None


def _fetch_favorites_trouble_detail_clickhouse(
    *,
    package_nm: str,
    server_type: int,
    log_tm: int,
    device_id: str,
    mem_usage: int,
) -> Optional[dict]:
    params = {
        "package_nm": package_nm,
        "server_type": int(server_type),
        "log_tm": int(log_tm),
        "device_id": device_id,
        "mem_usage": int(mem_usage),
    }
    sql = SQL.render("favorites.selectFavoritesTroubleDetail", params)
    result = get_clickhouse_client().query(sql, params)
    for row in _clickhouse_rows(result):
        return row
    return None


@app.post(
    "/widget/Favorites/All/InfoList",
    response_model=FavoritesAllInfoListResponse,
    summary="[위젯] Favorites All 팝업 테이블 (ClickHouse)",
)
async def FavoritesAllInfoList(request: FavoritesAllInfoListRequest) -> FavoritesAllInfoListResponse:
    if request.applicationId <= 0:
        return FavoritesAllInfoListResponse(
            message="applicationId가 없어 빈 결과를 반환합니다.",
            offset=request.offset,
            limit=request.limit,
            hasMore=False,
            list=[],
        )

    resolved = _resolve_pkg_server(request.applicationId)
    if not resolved:
        return FavoritesAllInfoListResponse(
            message="application/package 정보를 찾을 수 없습니다.",
            offset=request.offset,
            limit=request.limit,
            hasMore=False,
            list=[],
        )

    package_id, server_type_raw = resolved
    try:
        server_type = int(server_type_raw)
    except Exception:
        raise HTTPException(status_code=400, detail="serverType이 올바르지 않습니다.")

    try:
        records, has_more = _fetch_favorites_all_info_list_clickhouse(
            package_id=package_id,
            server_type=server_type,
            os_type=request.osType,
            date_type=request.dateType,
            limit=request.limit,
            offset=request.offset,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Favorites All InfoList 조회 실패 (ClickHouse)")
        return FavoritesAllInfoListResponse(
            message="ClickHouse 조회 실패",
            offset=request.offset,
            limit=request.limit,
            hasMore=False,
            list=[],
        )

    items = [FavoritesInfoListItem(**record) for record in records]
    return FavoritesAllInfoListResponse(
        offset=request.offset,
        limit=request.limit,
        hasMore=has_more,
        list=items,
    )


@app.post(
    "/widget/Favorites/All/RowInfo",
    response_model=FavoritesRowInfoResponse,
    summary="[위젯] Favorites All 팝업 상세 (ClickHouse)",
)
async def FavoritesAllRowInfo(request: FavoritesRowRequest) -> FavoritesRowInfoResponse:
    if request.applicationId <= 0:
        return FavoritesRowInfoResponse(
            message="applicationId가 없어 빈 결과를 반환합니다.",
            count=[],
            error=[],
            crash=[],
            loadingTime=[],
            responseTime=[],
        )

    if not request.reqUrl:
        raise HTTPException(status_code=400, detail="reqUrl is required.")

    resolved = _resolve_pkg_server(request.applicationId)
    if not resolved:
        return FavoritesRowInfoResponse(
            message="application/package 정보를 찾을 수 없습니다.",
            count=[],
            error=[],
            crash=[],
            loadingTime=[],
            responseTime=[],
        )

    package_id, server_type_raw = resolved
    try:
        server_type = int(server_type_raw)
    except Exception:
        raise HTTPException(status_code=400, detail="serverType이 올바르지 않습니다.")

    try:
        series = _fetch_favorites_all_row_info_clickhouse(
            package_id=package_id,
            server_type=server_type,
            os_type=request.osType,
            date_type=request.dateType,
            req_url=request.reqUrl,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Favorites All RowInfo 조회 실패 (ClickHouse)")
        return FavoritesRowInfoResponse(
            message="ClickHouse 조회 실패",
            count=[],
            error=[],
            crash=[],
            loadingTime=[],
            responseTime=[],
        )

    return FavoritesRowInfoResponse(**series)


class FavoritesTroubleCursor(BaseModel):
    logTm: int
    deviceId: str
    memUsage: int


class FavoritesTroubleListRequest(BaseModel):
    applicationId: int = Field(..., ge=0, description="Application identifier")
    reqUrl: str = Field(..., min_length=1, max_length=256, description="Page URL identifier")
    osType: Optional[str] = Field(None, max_length=32, description="Filter by OS; omit for all")
    dateType: Literal["DAY", "WEEK", "MONTH"] = Field("DAY", description="Aggregation window")
    troubleType: Literal["error", "crash"] = Field("error", description="Trouble log type")
    limit: int = Field(100, ge=1, le=500, description="Page size")
    offset: int = Field(0, ge=0, le=1_000_000, description="Offset for pagination")
    cursor: Optional[FavoritesTroubleCursor] = Field(None, description="Search-after cursor for pagination")
    tmzutc: int = Field(..., description="조회 기준 타임존의 UTC 오프셋(분)")

    model_config = ConfigDict(populate_by_name=True)


class FavoritesTroubleListItem(BaseModel):
    logTm: int
    deviceId: str
    userId: Optional[str] = None
    logType: int
    osType: Optional[str] = None
    appVer: Optional[str] = None
    logName: Optional[str] = None
    deviceModel: Optional[str] = None
    memUsage: int


class FavoritesTroubleListResponse(BaseModel):
    code: int = 200
    message: str = "Success"
    list: list[FavoritesTroubleListItem]
    hasMore: bool = False
    nextCursor: Optional[FavoritesTroubleCursor] = None


class FavoritesTroubleDetailRequest(BaseModel):
    applicationId: int = Field(..., ge=0, description="Application identifier")
    logTm: int = Field(..., ge=0, description="Log timestamp (ms)")
    deviceId: str = Field(..., min_length=1, max_length=128, description="Device identifier")
    memUsage: int = Field(..., ge=0, description="Memory usage (for uniqueness)")
    tmzutc: int = Field(..., description="조회 기준 타임존의 UTC 오프셋(분)")

    model_config = ConfigDict(populate_by_name=True)


class FavoritesTroubleDetailItem(BaseModel):
    logTm: int
    deviceId: str
    userId: Optional[str] = None
    logType: int
    osType: Optional[str] = None
    osVer: Optional[str] = None
    appVer: Optional[str] = None
    deviceModel: Optional[str] = None
    comType: Optional[str] = None
    comSensitivity: Optional[str] = None
    cpuUsage: Optional[int] = None
    memUsage: int
    batteryLvl: Optional[str] = None
    webviewVer: Optional[str] = None
    appBuildNum: Optional[str] = None
    reqUrl: Optional[str] = None
    resMsg: Optional[str] = None
    intervaltime: Optional[int] = None
    storageUsage: Optional[int] = None
    storageTotal: Optional[int] = None
    timezone: Optional[str] = None
    simOperatorNm: Optional[str] = None
    ip: Optional[str] = None
    pageId: Optional[str] = None


class FavoritesTroubleDetailResponse(BaseModel):
    code: int = 200
    message: str = "Success"
    item: Optional[FavoritesTroubleDetailItem] = None


@app.post(
    "/widget/Favorites/TroubleList",
    response_model=FavoritesTroubleListResponse,
    summary="[위젯] Favorites Error/Crash 로그 목록 (ClickHouse)",
)
async def FavoritesTroubleList(request: FavoritesTroubleListRequest) -> FavoritesTroubleListResponse:
    if request.applicationId <= 0:
        return FavoritesTroubleListResponse(message="applicationId가 없어 빈 결과를 반환합니다.", list=[])

    resolved = _resolve_pkg_server(request.applicationId)
    if not resolved:
        return FavoritesTroubleListResponse(message="application/package 정보를 찾을 수 없습니다.", list=[])

    package_nm, server_type_raw = resolved
    try:
        server_type = int(server_type_raw)
    except Exception:
        raise HTTPException(status_code=400, detail="serverType이 올바르지 않습니다.")

    try:
        records, next_cursor = _fetch_favorites_trouble_list_clickhouse(
            package_nm=package_nm,
            server_type=server_type,
            os_type=request.osType,
            date_type=request.dateType,
            req_url=request.reqUrl,
            trouble_type=request.troubleType,
            limit=request.limit,
            offset=request.offset,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Favorites TroubleList 조회 실패 (ClickHouse)")
        return FavoritesTroubleListResponse(message="ClickHouse 조회 실패", list=[])

    items = [FavoritesTroubleListItem(**record) for record in records]
    return FavoritesTroubleListResponse(
        list=items,
        hasMore=next_cursor is not None,
        nextCursor=None,
    )


@app.post(
    "/widget/Favorites/TroubleDetail",
    response_model=FavoritesTroubleDetailResponse,
    summary="[위젯] Favorites Error/Crash 로그 상세 (ClickHouse)",
)
async def FavoritesTroubleDetail(request: FavoritesTroubleDetailRequest) -> FavoritesTroubleDetailResponse:
    if request.applicationId <= 0:
        return FavoritesTroubleDetailResponse(message="applicationId가 없어 빈 결과를 반환합니다.", item=None)

    resolved = _resolve_pkg_server(request.applicationId)
    if not resolved:
        return FavoritesTroubleDetailResponse(message="application/package 정보를 찾을 수 없습니다.", item=None)

    package_nm, server_type_raw = resolved
    try:
        server_type = int(server_type_raw)
    except Exception:
        raise HTTPException(status_code=400, detail="serverType이 올바르지 않습니다.")

    try:
        row = _fetch_favorites_trouble_detail_clickhouse(
            package_nm=package_nm,
            server_type=server_type,
            log_tm=request.logTm,
            device_id=request.deviceId,
            mem_usage=request.memUsage,
        )
    except Exception:
        logger.exception("Favorites TroubleDetail 조회 실패 (ClickHouse)")
        return FavoritesTroubleDetailResponse(message="ClickHouse 조회 실패", item=None)

    if not row:
        return FavoritesTroubleDetailResponse(message="데이터가 없습니다.", item=None)

    return FavoritesTroubleDetailResponse(item=FavoritesTroubleDetailItem(**row))


@app.post(
    "/widget/Favorites/InfoList",
    response_model=FavoritesInfoListResponse,
    summary="[위젯] Favorites 컴포넌트 데이터",
)
async def FavoritesInfoList(
    request: FavoritesInfoListRequest,
) -> FavoritesInfoListResponse:
    """위젯 Favorites 컴포넌트 데이터와 클릭하면 리스트에서 사용된다.

    Args:
        request (FavoritesInfoListRequest): FavoritesInfoListRequest
        
        {
            "applicationId": "string",
            "osType": "string",
            "dateType": "DAY",
            "size": 0,
            "tmzutc": 540
        }

        - tmzutc (필수): 조회 기준 타임존의 UTC 오프셋(분). 예) 한국(+9)은 540, 뉴욕(-5)은 -300

    Returns:
        FavoritesInfoListResponse: FavoritesInfoListResponse

        {
            "code": 200,
            "message": "string",
            "list": [
                {
                    "reqUrl": "string",
                    "count": 0,
                    "logCount": 0,
                    "sumCpuUsage": 0,
                    "sumMemUsage": 0,
                    "loadingTime": 0,
                    "responseTime": 0,
                    "intervaltime": 0,
                    "errorCount": 0,
                    "crashCount": 0,
                    "cpuUsage": 0,
                    "memUsage": 0,
                    "logType": "string"
                }
            ]
        }
    """
   

    if request.applicationId <= 0:
        return FavoritesInfoListResponse(
            message="applicationId가 없어 빈 결과를 반환합니다.",
            list=[],
        )

    if request.dateType != "DAY":
        records = build_favorites_info_list(
            FavoritesInfoListConfig(
                application_id=request.applicationId,
                os_type=request.osType,
                date_type=request.dateType,
                size=request.size,
                tmzutc=request.tmzutc,
            )
        )
    else:
        resolved = _resolve_pkg_server(request.applicationId)
        if not resolved:
            return FavoritesInfoListResponse(message="application/package 정보를 찾을 수 없습니다.", list=[])
        package_nm, server_type = resolved
        try:
            records = _fetch_favorites_today_from_valkey(
                package_nm=package_nm,
                server_type=server_type,
                os_type=request.osType,
                size=request.size,
            )
        except HTTPException:
            raise
        except Exception:
            logger.exception("Favorites InfoList 조회 실패 (Valkey)")
            return FavoritesInfoListResponse(message="Valkey 조회 실패", list=[])

    items = [FavoritesInfoListItem(**record) for record in records]
    return FavoritesInfoListResponse(list=items)


@app.post(
    "/widget/Favorites/RowInfo",
    response_model=FavoritesRowInfoResponse,
    summary="[위젯] Favorites 상세",
)
async def FavoritesRowInfo(request: FavoritesRowRequest) -> FavoritesRowInfoResponse:
    """
    [위젯] Favorites 목록의 행을 선택했을 때 필요한 시계열 데이터를 반환합니다.

    Args:
        request (FavoritesRowRequest): FavoritesRowRequest

        {
            "applicationId": "string",
            "reqUrl": "string",
            "osType": "string",
            "dateType": "DAY",
            "tmzutc": 540
        }

        - tmzutc (필수): 조회 기준 타임존의 UTC 오프셋(분). 예) 한국(+9)은 540, 뉴욕(-5)은 -300
        
    Returns:
        FavoritesRowInfoResponse: FavoritesRowInfoResponse

        {
            "code": 200,
            "message": "string",
            "count": [
                [
                    0
                ]
            ],
            "error": [
                [
                    0
                ]
            ],
            "crash": [
                [
                    0
                ]
            ],
            "loadingTime": [
                [
                    0
                ]
            ],
            "responseTime": [
                [
                    0
                ]
            ]
        }
    """

    if request.applicationId <= 0:
        return FavoritesRowInfoResponse(
            message="applicationId가 없어 빈 결과를 반환합니다.",
            count=[],
            error=[],
            crash=[],
            loadingTime=[],
            responseTime=[],
        )

    if not request.reqUrl:
        raise HTTPException(status_code=400, detail="reqUrl is required.")

    series = build_favorites_row_info(
        FavoritesRowInfoConfig(
            application_id=request.applicationId,
            req_url=request.reqUrl,
            os_type=request.osType,
            date_type=request.dateType,
            tmzutc=request.tmzutc,
        )
    )

    return FavoritesRowInfoResponse(**series)
