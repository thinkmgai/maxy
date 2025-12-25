"""FastAPI routes for the Device Distribution dashboard widget."""

from __future__ import annotations

import csv
import json
import logging
import os
from datetime import date, datetime, timedelta, timezone
from functools import lru_cache
from pathlib import Path
from typing import Dict, Iterable, Literal, Optional, Tuple

from fastapi import HTTPException
from pydantic import BaseModel, Field, ConfigDict, root_validator, validator

from apiserver import app
from .clickhouse import SQL, get_client as get_clickhouse_client

try:
    import redis  # type: ignore
except ImportError:  # pragma: no cover
    redis = None  # type: ignore

logger = logging.getLogger(__name__)

VALKEY_KEY_SUFFIX = "devicedistribution"
MAX_ITEMS = 100
CRASH_LOG_TYPE = 2097152


def _normalise_os_type(value: Optional[str]) -> Optional[str]:
    """Clean OS type strings to the canonical values used in Valkey keys."""
    if value is None:
        return None
    cleaned = value.strip()
    if not cleaned:
        return None
    lowered = cleaned.lower()
    if lowered in {"all", "전체", "a"}:
        return None
    if lowered.startswith("android"):
        return "Android"
    if lowered in {"ios", "iphone"}:
        return "iOS"
    return cleaned


def _safe_int(value: object, *, default: int = 0) -> int:
    """Forgiving integer parser used for Redis/JSON payloads."""
    if value is None:
        return default
    try:
        return int(value)
    except Exception:
        try:
            return int(float(value))
        except Exception:
            return default


def _parse_ts_ms(value: object) -> int:
    """Convert various timestamp shapes (ISO string/number) to epoch milliseconds."""
    if value is None:
        return 0
    if isinstance(value, (int, float)):
        numeric = int(value)
        return numeric if numeric >= 0 else 0
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return 0
        try:
            numeric = float(text)
            if numeric == numeric:
                return int(numeric)
        except Exception:
            pass
        try:
            parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=timezone.utc)
            return int(parsed.timestamp() * 1000)
        except Exception:
            return 0
    return 0


def _parse_items(raw: str | None) -> list[dict]:
    """Parse JSON payload from Valkey hash into a list of device dicts."""
    if not raw:
        return []
    try:
        parsed = json.loads(raw)
    except Exception:
        return []
    if not isinstance(parsed, list):
        return []
    cleaned: list[dict] = []
    for entry in parsed:
        if not isinstance(entry, dict):
            continue
        model = str(entry.get("deviceModel") or "").strip()
        if not model:
            continue
        os_type = str(entry.get("osType") or "").strip() or "unknown"
        cleaned.append(
            {
                "deviceModel": model,
                "osType": os_type,
                "deviceCount": _safe_int(entry.get("deviceCount")),
                "viewCount": _safe_int(entry.get("viewCount")),
                "errorCount": _safe_int(entry.get("errorCount")),
                "crashCount": _safe_int(entry.get("crashCount")),
            }
        )
    return cleaned


def _parse_totals(raw: str | None) -> dict:
    """Parse totals JSON; fall back to empty counters on any error."""
    defaults = {"totalDevices": 0, "totalViews": 0, "totalErrors": 0, "totalCrashes": 0}
    if not raw:
        return defaults
    try:
        parsed = json.loads(raw)
    except Exception:
        return defaults
    if not isinstance(parsed, dict):
        return defaults
    return {
        "totalDevices": _safe_int(parsed.get("totalDevices")),
        "totalViews": _safe_int(parsed.get("totalViews")),
        "totalErrors": _safe_int(parsed.get("totalErrors")),
        "totalCrashes": _safe_int(parsed.get("totalCrashes")),
    }


def _clickhouse_rows(result) -> Iterable[dict]:
    cols = result.column_names
    for row in result.result_rows:
        yield dict(zip(cols, row))


def _resolve_date_range(date_type: str) -> Tuple[date, date]:
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


def _get_valkey():
    """Return a live Valkey client or raise HTTP 500 if unavailable."""
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


@lru_cache(maxsize=1)
def _find_data_dir() -> Path:
    """Locate the shared Data directory (contains application.csv)."""
    current = Path(__file__).resolve()
    for parent in current.parents:
        candidate = parent / "Data"
        if candidate.exists():
            return candidate
    return current.parent / "Data"


def _load_application_map() -> Dict[str, Dict[str, str]]:
    mapping: Dict[str, Dict[str, str]] = {}
    data_dir = _find_data_dir()
    csv_path = data_dir / "application.csv"
    if not csv_path.exists():
        return mapping
    with csv_path.open("r", newline="", encoding="utf-8") as fp:
        reader = csv.DictReader(fp)
        for row in reader:
            app_id = str(row.get("applicationId") or "").strip()
            if not app_id:
                continue
            mapping[app_id] = row
    return mapping


def _resolve_pkg_server(application_id: int, server_type_override: Optional[int]) -> tuple[str, str] | None:
    """
    Map applicationId to (packageNm, serverType) using CSV, with optional server override.
    """
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


def _fetch_distribution_from_valkey(
    *,
    package_nm: str,
    server_type: str,
    os_type: Optional[str],
    size: int,
) -> dict:
    """
    Retrieve cached device distribution payloads from Valkey and merge per-OS entries.
    """
    client = _get_valkey()
    prefix = os.getenv("VALKEY_PREFIX", "stats:realtime")
    key_prefix = f"{prefix}:{VALKEY_KEY_SUFFIX}:{package_nm}:{server_type}"

    target_keys = [f"{key_prefix}:{os_type}"] if os_type else client.keys(f"{key_prefix}:*")

    merged_items: list[dict] = []
    totals = {"totalDevices": 0, "totalViews": 0, "totalErrors": 0, "totalCrashes": 0}
    last_updated = 0
    window_start = None
    window_end = None

    for key in target_keys:
        payload = client.hgetall(key) or {}
        merged_items.extend(_parse_items(payload.get("items")))

        totals_part = _parse_totals(payload.get("totals"))
        totals["totalDevices"] += totals_part["totalDevices"]
        totals["totalViews"] += totals_part["totalViews"]
        totals["totalErrors"] += totals_part["totalErrors"]
        totals["totalCrashes"] += totals_part["totalCrashes"]

        updated_ms = _parse_ts_ms(payload.get("updated_at"))
        last_updated = max(last_updated, updated_ms)

        start_ms = _parse_ts_ms(payload.get("window_start"))
        end_ms = _parse_ts_ms(payload.get("window_end"))
        if start_ms > 0:
            window_start = start_ms if window_start is None else min(window_start, start_ms)
        if end_ms > 0:
            window_end = end_ms if window_end is None else max(window_end, end_ms)

    # Fallback totals when Valkey payloads don't contain aggregate counters.
    totals["totalDevices"] = totals["totalDevices"] or sum(item["deviceCount"] for item in merged_items)
    totals["totalViews"] = totals["totalViews"] or sum(item["viewCount"] for item in merged_items)
    totals["totalErrors"] = totals["totalErrors"] or sum(item["errorCount"] for item in merged_items)
    totals["totalCrashes"] = totals["totalCrashes"] or sum(item["crashCount"] for item in merged_items)

    total_error = totals["totalErrors"]
    total_crash = totals["totalCrashes"]

    merged_items.sort(
        key=lambda item: (item.get("viewCount", 0), item.get("errorCount", 0), item.get("crashCount", 0)),
        reverse=True,
    )

    items_with_rates = []
    for item in merged_items[:size]:
        error_rate = (item["errorCount"] / total_error * 100) if total_error > 0 else 0.0
        crash_rate = (item["crashCount"] / total_crash * 100) if total_crash > 0 else 0.0
        items_with_rates.append(
            {
                **item,
                "errorRate": round(error_rate, 2),
                "crashRate": round(crash_rate, 2),
            }
        )

    last_updated_ms = max(filter(lambda v: v is not None, [last_updated, window_end, window_start] + [0]))

    return {
        "items": items_with_rates,
        "totals": totals,
        "lastUpdated": last_updated_ms if last_updated_ms else 0,
        "windowStart": window_start or 0,
        "windowEnd": window_end or 0,
    }


def _fetch_device_distribution_trouble_list_clickhouse(
    *,
    package_nm: str,
    server_type: int,
    os_type: Optional[str],
    date_type: str,
    device_model: str,
    trouble_type: str,
    limit: int,
    offset: int,
) -> tuple[list[dict], Optional[dict]]:
    start_date, end_date = _resolve_date_range(date_type)
    start_ts = datetime.combine(start_date, datetime.min.time()).strftime("%Y-%m-%d %H:%M:%S")
    end_ts = datetime.combine(end_date, datetime.min.time()).strftime("%Y-%m-%d %H:%M:%S")

    os_filter = _normalise_os_type(os_type) or ""
    trouble = (trouble_type or "error").lower()
    if trouble not in {"error", "crash"}:
        raise HTTPException(status_code=400, detail="troubleType이 올바르지 않습니다.")

    params = {
        "from_ts": start_ts,
        "to_ts": end_ts,
        "package_nm": package_nm,
        "server_type": int(server_type),
        "os_type": os_filter,
        "device_model": device_model,
        "trouble_type": CRASH_LOG_TYPE if trouble == "crash" else 0,
        "crash_log_type": CRASH_LOG_TYPE,
        "limit_plus_one": int(limit) + 1,
        "offset": int(offset),
    }

    sql = SQL.render("devicedistribution.selectDeviceDistributionTroubleList", params)
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


def _fetch_device_distribution_trouble_detail_clickhouse(
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
    sql = SQL.render("devicedistribution.selectDeviceDistributionTroubleDetail", params)
    result = get_clickhouse_client().query(sql, params)
    for row in _clickhouse_rows(result):
        return row
    return None


def _fetch_device_distribution_all_info_list_clickhouse(
    *,
    package_id: str,
    server_type: int,
    os_type: Optional[str],
    date_type: str,
    limit: int,
    offset: int,
) -> tuple[list[dict], dict, bool]:
    start_date, end_date = _resolve_date_range(date_type)
    start_ts = datetime.combine(start_date, datetime.min.time()).strftime("%Y-%m-%d %H:%M:%S")
    end_ts = datetime.combine(end_date, datetime.min.time()).strftime("%Y-%m-%d %H:%M:%S")
    os_filter = _normalise_os_type(os_type) or ""

    params = {
        "from_ts": start_ts,
        "to_ts": end_ts,
        "package_id": package_id,
        "server_type": int(server_type),
        "os_type": os_filter,
        "limit_plus_one": int(limit) + 1,
        "offset": int(offset),
    }

    sql = SQL.render("devicedistribution.selectDeviceDistributionAllInfoList", params)
    result = get_clickhouse_client().query(sql, params)

    rows: list[dict] = []
    for row in _clickhouse_rows(result):
        device_model = str(row.get("deviceModel") or "").strip()
        if not device_model:
            continue
        rows.append(
            {
                "osType": row.get("osType") or "unknown",
                "deviceModel": device_model,
                "userCount": _safe_int(row.get("userCount")),
                "errorCount": _safe_int(row.get("errorCount")),
                "crashCount": _safe_int(row.get("crashCount")),
            }
        )

    has_more = len(rows) > limit
    rows = rows[:limit]

    totals_params = {
        "from_ts": start_ts,
        "to_ts": end_ts,
        "package_id": package_id,
        "server_type": int(server_type),
        "os_type": os_filter,
    }
    totals_sql = SQL.render("devicedistribution.selectDeviceDistributionAllInfoTotals", totals_params)
    totals_result = get_clickhouse_client().query(totals_sql, totals_params)
    totals_row = next(_clickhouse_rows(totals_result), {})

    totals = {
        "totalUsers": _safe_int(totals_row.get("totalUsers")),
        "totalErrors": _safe_int(totals_row.get("totalErrors")),
        "totalCrashes": _safe_int(totals_row.get("totalCrashes")),
    }

    return rows, totals, has_more


def _fetch_device_distribution_all_row_info_clickhouse(
    *,
    package_id: str,
    server_type: int,
    os_type: Optional[str],
    date_type: str,
    device_model: str,
) -> dict:
    upper = (date_type or "DAY").upper()
    start_date, end_date = _resolve_date_range(upper)
    buckets = _expected_time_buckets_ms(upper, start_date, end_date)
    start_ts = datetime.combine(start_date, datetime.min.time()).strftime("%Y-%m-%d %H:%M:%S")
    end_ts = datetime.combine(end_date, datetime.min.time()).strftime("%Y-%m-%d %H:%M:%S")
    os_filter = _normalise_os_type(os_type) or ""

    params = {
        "from_ts": start_ts,
        "to_ts": end_ts,
        "package_id": package_id,
        "server_type": int(server_type),
        "device_model": device_model,
        "os_type": os_filter,
    }

    sql_key = (
        "devicedistribution.selectDeviceDistributionAllRowInfoDay"
        if upper == "DAY"
        else "devicedistribution.selectDeviceDistributionAllRowInfoRange"
    )
    sql = SQL.render(sql_key, params)
    result = get_clickhouse_client().query(sql, params)

    series_by_ts: dict[int, dict] = {}
    for row in _clickhouse_rows(result):
        ts = _safe_int(row.get("ts"))
        series_by_ts[ts] = {
            "user": _safe_int(row.get("userCount")),
            "error": _safe_int(row.get("errorCount")),
            "crash": _safe_int(row.get("crashCount")),
        }

    user_series: list[list[int]] = []
    error_series: list[list[int]] = []
    crash_series: list[list[int]] = []
    for ts in buckets:
        values = series_by_ts.get(ts) or {}
        user_series.append([ts, _safe_int(values.get("user"))])
        error_series.append([ts, _safe_int(values.get("error"))])
        crash_series.append([ts, _safe_int(values.get("crash"))])

    return {
        "user": user_series,
        "error": error_series,
        "crash": crash_series,
    }


class DeviceDistributionDataRequest(BaseModel):
    """Request payload for Device Distribution data."""

    applicationId: int = Field(..., alias="packageNm", ge=1, description="패키지/애플리케이션 ID")
    serverType: Optional[int] = Field(None, description="서버 타입 (미지정 시 CSV 매핑 사용)")
    osType: Optional[str] = Field(None, description="OS 타입 (Android/iOS/all)")
    size: int = Field(30, ge=1, le=MAX_ITEMS, description="가져올 최대 디바이스 개수")
    tmzutc: int = Field(..., description="타임존의 UTC 오프셋(분). 예: 한국(+9)은 540")

    model_config = ConfigDict(populate_by_name=True)

    @root_validator(pre=True)
    def _backfill_application_id(cls, values: dict) -> dict:  # noqa: N805
        if "applicationId" in values and "packageNm" not in values:
            values["packageNm"] = values["applicationId"]
        return values

    @validator("osType", pre=True, always=True)
    def _clean_os_type(cls, value: Optional[str]) -> Optional[str]:  # noqa: N805
        return _normalise_os_type(value)

    @validator("size", pre=True, always=True)
    def _clamp_size(cls, value: Optional[int]) -> int:  # noqa: N805
        if value is None:
            return 30
        try:
            numeric = int(value)
        except Exception:
            return 30
        return max(1, min(numeric, MAX_ITEMS))


class DeviceDistributionRow(BaseModel):
    deviceModel: str
    osType: str
    deviceCount: int
    viewCount: int
    errorCount: int
    crashCount: int
    errorRate: float
    crashRate: float


class DeviceDistributionTotals(BaseModel):
    totalDevices: int
    totalViews: int
    totalErrors: int
    totalCrashes: int
    lastUpdated: int
    windowStart: Optional[int] = None
    windowEnd: Optional[int] = None


class DeviceDistributionResult(BaseModel):
    items: list[DeviceDistributionRow]
    totals: DeviceDistributionTotals


class DeviceDistributionResponse(BaseModel):
    code: int = 200
    message: str = "Success"
    result: DeviceDistributionResult


class DeviceDistributionAllInfoListRequest(BaseModel):
    """Request payload for Device Distribution > All popup table (ClickHouse)."""

    applicationId: int = Field(..., ge=0, description="Application identifier")
    osType: Optional[str] = Field(None, max_length=32, description="Filter by OS; omit for all")
    dateType: Literal["DAY", "WEEK", "MONTH"] = Field("DAY", description="Aggregation window")
    limit: int = Field(100, ge=1, le=500, description="Page size")
    offset: int = Field(0, ge=0, le=1_000_000, description="Offset for pagination")
    tmzutc: int = Field(..., description="조회 기준 타임존의 UTC 오프셋(분)")

    model_config = ConfigDict(populate_by_name=True)

    @validator("osType", pre=True, always=True)
    def _clean_os_type(cls, value: Optional[str]) -> Optional[str]:  # noqa: N805
        return _normalise_os_type(value)


class DeviceDistributionAllInfoListItem(BaseModel):
    osType: str
    deviceModel: str
    userCount: int
    errorCount: int
    crashCount: int


class DeviceDistributionAllInfoTotals(BaseModel):
    totalUsers: int
    totalErrors: int
    totalCrashes: int


class DeviceDistributionAllInfoListResponse(BaseModel):
    code: int = 200
    message: str = "Success"
    offset: int
    limit: int
    hasMore: bool
    totals: DeviceDistributionAllInfoTotals
    list: list[DeviceDistributionAllInfoListItem]


class DeviceDistributionAllRowInfoRequest(BaseModel):
    """Request payload for Device Distribution > All popup row detail (ClickHouse)."""

    applicationId: int = Field(..., ge=0, description="Application identifier")
    deviceModel: str = Field(..., min_length=1, max_length=128, description="Device model name")
    osType: Optional[str] = Field(None, max_length=32, description="Filter by OS; omit for all")
    dateType: Literal["DAY", "WEEK", "MONTH"] = Field("DAY", description="Aggregation window")
    tmzutc: int = Field(..., description="조회 기준 타임존의 UTC 오프셋(분)")

    model_config = ConfigDict(populate_by_name=True)

    @validator("deviceModel", pre=True, always=True)
    def _clean_device_model(cls, value: Optional[str]) -> str:  # noqa: N805
        cleaned = str(value or "").strip()
        if not cleaned:
            raise ValueError("deviceModel is required.")
        return cleaned

    @validator("osType", pre=True, always=True)
    def _clean_row_os_type(cls, value: Optional[str]) -> Optional[str]:  # noqa: N805
        return _normalise_os_type(value)


class DeviceDistributionAllRowInfoResponse(BaseModel):
    code: int = 200
    message: str = "Success"
    user: list[list[int]]
    error: list[list[int]]
    crash: list[list[int]]


@app.post(
    "/widget/DeviceDistribution/Data",
    response_model=DeviceDistributionResponse,
    summary="[위젯] Device Distribution 데이터",
)
async def DeviceDistributionData(
    request: DeviceDistributionDataRequest,
) -> DeviceDistributionResponse:
    """Return device-level error/crash distribution for the widget."""

    if request.applicationId <= 0:
        empty_totals = DeviceDistributionTotals(
            totalDevices=0,
            totalViews=0,
            totalErrors=0,
            totalCrashes=0,
            lastUpdated=0,
            windowStart=0,
            windowEnd=0,
        )
        return DeviceDistributionResponse(
            message="applicationId가 없어 빈 결과를 반환합니다.",
            result=DeviceDistributionResult(items=[], totals=empty_totals),
        )

    resolved = _resolve_pkg_server(request.applicationId, request.serverType)
    if not resolved:
        empty_totals = DeviceDistributionTotals(
            totalDevices=0,
            totalViews=0,
            totalErrors=0,
            totalCrashes=0,
            lastUpdated=0,
            windowStart=0,
            windowEnd=0,
        )
        return DeviceDistributionResponse(
            message="application/package 정보를 찾을 수 없습니다.",
            result=DeviceDistributionResult(items=[], totals=empty_totals),
        )

    package_nm, server_type = resolved

    try:
        dataset = _fetch_distribution_from_valkey(
            package_nm=package_nm,
            server_type=server_type,
            os_type=request.osType,
            size=request.size,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("DeviceDistribution Data 조회 실패 (Valkey)")
        dataset = {
            "items": [],
            "totals": {"totalDevices": 0, "totalViews": 0, "totalErrors": 0, "totalCrashes": 0},
            "lastUpdated": 0,
            "windowStart": 0,
            "windowEnd": 0,
        }

    items = [DeviceDistributionRow(**item) for item in dataset.get("items", [])]
    totals_map = dataset.get("totals", {}) or {}

    totals = DeviceDistributionTotals(
        totalDevices=_safe_int(totals_map.get("totalDevices")),
        totalViews=_safe_int(totals_map.get("totalViews")),
        totalErrors=_safe_int(totals_map.get("totalErrors")),
        totalCrashes=_safe_int(totals_map.get("totalCrashes")),
        lastUpdated=_safe_int(dataset.get("lastUpdated")),
        windowStart=_safe_int(dataset.get("windowStart")),
        windowEnd=_safe_int(dataset.get("windowEnd")),
    )

    return DeviceDistributionResponse(
        result=DeviceDistributionResult(
            items=items,
            totals=totals,
        )
    )


@app.post(
    "/widget/DeviceDistribution/All/InfoList",
    response_model=DeviceDistributionAllInfoListResponse,
    summary="[위젯] Device Distribution All 팝업 테이블 (ClickHouse)",
)
async def DeviceDistributionAllInfoList(
    request: DeviceDistributionAllInfoListRequest,
) -> DeviceDistributionAllInfoListResponse:
    if request.applicationId <= 0:
        return DeviceDistributionAllInfoListResponse(
            message="applicationId가 없어 빈 결과를 반환합니다.",
            offset=request.offset,
            limit=request.limit,
            hasMore=False,
            totals=DeviceDistributionAllInfoTotals(totalUsers=0, totalErrors=0, totalCrashes=0),
            list=[],
        )

    resolved = _resolve_pkg_server(request.applicationId, None)
    if not resolved:
        return DeviceDistributionAllInfoListResponse(
            message="application/package 정보를 찾을 수 없습니다.",
            offset=request.offset,
            limit=request.limit,
            hasMore=False,
            totals=DeviceDistributionAllInfoTotals(totalUsers=0, totalErrors=0, totalCrashes=0),
            list=[],
        )

    package_id, server_type_raw = resolved
    try:
        server_type = int(server_type_raw)
    except Exception:
        raise HTTPException(status_code=400, detail="serverType이 올바르지 않습니다.")

    try:
        records, totals, has_more = _fetch_device_distribution_all_info_list_clickhouse(
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
        logger.exception("DeviceDistribution All InfoList 조회 실패 (ClickHouse)")
        return DeviceDistributionAllInfoListResponse(
            message="ClickHouse 조회 실패",
            offset=request.offset,
            limit=request.limit,
            hasMore=False,
            totals=DeviceDistributionAllInfoTotals(totalUsers=0, totalErrors=0, totalCrashes=0),
            list=[],
        )

    items = [DeviceDistributionAllInfoListItem(**record) for record in records]
    totals_obj = DeviceDistributionAllInfoTotals(
        totalUsers=_safe_int(totals.get("totalUsers")),
        totalErrors=_safe_int(totals.get("totalErrors")),
        totalCrashes=_safe_int(totals.get("totalCrashes")),
    )
    return DeviceDistributionAllInfoListResponse(
        offset=request.offset,
        limit=request.limit,
        hasMore=has_more,
        totals=totals_obj,
        list=items,
    )


@app.post(
    "/widget/DeviceDistribution/All/RowInfo",
    response_model=DeviceDistributionAllRowInfoResponse,
    summary="[위젯] Device Distribution All 팝업 상세 (ClickHouse)",
)
async def DeviceDistributionAllRowInfo(
    request: DeviceDistributionAllRowInfoRequest,
) -> DeviceDistributionAllRowInfoResponse:
    if request.applicationId <= 0:
        return DeviceDistributionAllRowInfoResponse(
            message="applicationId가 없어 빈 결과를 반환합니다.",
            user=[],
            error=[],
            crash=[],
        )

    resolved = _resolve_pkg_server(request.applicationId, None)
    if not resolved:
        return DeviceDistributionAllRowInfoResponse(
            message="application/package 정보를 찾을 수 없습니다.",
            user=[],
            error=[],
            crash=[],
        )

    package_id, server_type_raw = resolved
    try:
        server_type = int(server_type_raw)
    except Exception:
        raise HTTPException(status_code=400, detail="serverType이 올바르지 않습니다.")

    try:
        series = _fetch_device_distribution_all_row_info_clickhouse(
            package_id=package_id,
            server_type=server_type,
            os_type=request.osType,
            date_type=request.dateType,
            device_model=request.deviceModel,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("DeviceDistribution All RowInfo 조회 실패 (ClickHouse)")
        return DeviceDistributionAllRowInfoResponse(
            message="ClickHouse 조회 실패",
            user=[],
            error=[],
            crash=[],
        )

    return DeviceDistributionAllRowInfoResponse(**series)


class DeviceDistributionTroubleCursor(BaseModel):
    logTm: int
    deviceId: str
    memUsage: int


class DeviceDistributionTroubleListRequest(BaseModel):
    applicationId: int = Field(..., ge=0, description="Application identifier")
    deviceModel: str = Field(..., min_length=1, max_length=128, description="Device model name")
    osType: Optional[str] = Field(None, max_length=32, description="Filter by OS; omit for all")
    dateType: Literal["DAY", "WEEK", "MONTH"] = Field("DAY", description="Aggregation window")
    troubleType: Literal["error", "crash"] = Field("error", description="Trouble log type")
    limit: int = Field(100, ge=1, le=500, description="Page size")
    offset: int = Field(0, ge=0, le=1_000_000, description="Offset for pagination")
    cursor: Optional[DeviceDistributionTroubleCursor] = Field(None, description="Search-after cursor for pagination")
    tmzutc: int = Field(..., description="조회 기준 타임존의 UTC 오프셋(분)")

    model_config = ConfigDict(populate_by_name=True)

    @validator("deviceModel", pre=True, always=True)
    def _clean_device_model(cls, value: Optional[str]) -> str:  # noqa: N805
        cleaned = str(value or "").strip()
        if not cleaned:
            raise ValueError("deviceModel is required.")
        return cleaned

    @validator("osType", pre=True, always=True)
    def _clean_os_type(cls, value: Optional[str]) -> Optional[str]:  # noqa: N805
        return _normalise_os_type(value)


class DeviceDistributionTroubleListItem(BaseModel):
    logTm: int
    deviceId: str
    userId: Optional[str] = None
    logType: int
    osType: Optional[str] = None
    appVer: Optional[str] = None
    logName: Optional[str] = None
    deviceModel: Optional[str] = None
    memUsage: int


class DeviceDistributionTroubleListResponse(BaseModel):
    code: int = 200
    message: str = "Success"
    list: list[DeviceDistributionTroubleListItem]
    hasMore: bool = False
    nextCursor: Optional[DeviceDistributionTroubleCursor] = None


class DeviceDistributionTroubleDetailRequest(BaseModel):
    applicationId: int = Field(..., ge=0, description="Application identifier")
    logTm: int = Field(..., ge=0, description="Log timestamp (ms)")
    deviceId: str = Field(..., min_length=1, max_length=128, description="Device identifier")
    memUsage: int = Field(..., ge=0, description="Memory usage (for uniqueness)")
    tmzutc: int = Field(..., description="조회 기준 타임존의 UTC 오프셋(분)")

    model_config = ConfigDict(populate_by_name=True)


class DeviceDistributionTroubleDetailItem(BaseModel):
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


class DeviceDistributionTroubleDetailResponse(BaseModel):
    code: int = 200
    message: str = "Success"
    item: Optional[DeviceDistributionTroubleDetailItem] = None


@app.post(
    "/widget/DeviceDistribution/TroubleList",
    response_model=DeviceDistributionTroubleListResponse,
    summary="[위젯] Device Distribution Error/Crash 로그 목록 (ClickHouse)",
)
async def DeviceDistributionTroubleList(
    request: DeviceDistributionTroubleListRequest,
) -> DeviceDistributionTroubleListResponse:
    if request.applicationId <= 0:
        return DeviceDistributionTroubleListResponse(
            message="applicationId가 없어 빈 결과를 반환합니다.",
            list=[],
        )

    resolved = _resolve_pkg_server(request.applicationId, None)
    if not resolved:
        return DeviceDistributionTroubleListResponse(
            message="application/package 정보를 찾을 수 없습니다.",
            list=[],
        )

    package_nm, server_type_raw = resolved
    try:
        server_type = int(server_type_raw)
    except Exception:
        raise HTTPException(status_code=400, detail="serverType이 올바르지 않습니다.")

    try:
        records, next_cursor = _fetch_device_distribution_trouble_list_clickhouse(
            package_nm=package_nm,
            server_type=server_type,
            os_type=request.osType,
            date_type=request.dateType,
            device_model=request.deviceModel,
            trouble_type=request.troubleType,
            limit=request.limit,
            offset=request.offset,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("DeviceDistribution TroubleList 조회 실패 (ClickHouse)")
        return DeviceDistributionTroubleListResponse(message="ClickHouse 조회 실패", list=[])

    items = [DeviceDistributionTroubleListItem(**record) for record in records]
    return DeviceDistributionTroubleListResponse(
        list=items,
        hasMore=next_cursor is not None,
        nextCursor=None,
    )


@app.post(
    "/widget/DeviceDistribution/TroubleDetail",
    response_model=DeviceDistributionTroubleDetailResponse,
    summary="[위젯] Device Distribution Error/Crash 로그 상세 (ClickHouse)",
)
async def DeviceDistributionTroubleDetail(
    request: DeviceDistributionTroubleDetailRequest,
) -> DeviceDistributionTroubleDetailResponse:
    if request.applicationId <= 0:
        return DeviceDistributionTroubleDetailResponse(
            message="applicationId가 없어 빈 결과를 반환합니다.",
            item=None,
        )

    resolved = _resolve_pkg_server(request.applicationId, None)
    if not resolved:
        return DeviceDistributionTroubleDetailResponse(
            message="application/package 정보를 찾을 수 없습니다.",
            item=None,
        )

    package_nm, server_type_raw = resolved
    try:
        server_type = int(server_type_raw)
    except Exception:
        raise HTTPException(status_code=400, detail="serverType이 올바르지 않습니다.")

    try:
        row = _fetch_device_distribution_trouble_detail_clickhouse(
            package_nm=package_nm,
            server_type=server_type,
            log_tm=request.logTm,
            device_id=request.deviceId,
            mem_usage=request.memUsage,
        )
    except Exception:
        logger.exception("DeviceDistribution TroubleDetail 조회 실패 (ClickHouse)")
        return DeviceDistributionTroubleDetailResponse(message="ClickHouse 조회 실패", item=None)

    if not row:
        return DeviceDistributionTroubleDetailResponse(message="데이터가 없습니다.", item=None)

    return DeviceDistributionTroubleDetailResponse(item=DeviceDistributionTroubleDetailItem(**row))
