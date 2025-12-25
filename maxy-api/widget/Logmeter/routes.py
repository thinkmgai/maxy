"""FastAPI routes for the Logmeter widget (Valkey + ClickHouse)."""

from __future__ import annotations

import csv
import logging
import os
from datetime import date, datetime, timedelta
from functools import lru_cache
from pathlib import Path
from typing import Dict, Iterable, Literal, Optional, Tuple

from fastapi import HTTPException
from pydantic import BaseModel, Field, ConfigDict

from apiserver import app
from .clickhouse import SQL, get_client as get_clickhouse_client

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
        )
        client.ping()
        return client
    except Exception as exc:  # pragma: no cover
        logging.exception("Valkey 연결 실패: %s", exc)
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


def _clickhouse_rows(result) -> Iterable[dict]:
    cols = result.column_names
    for row in result.result_rows:
        yield dict(zip(cols, row))


class LogmeterSnapshotRequest(BaseModel):
    """Valkey에 저장된 Logmeter 스냅샷 조회."""

    applicationId: int = Field(..., ge=0, description="Application identifier")
    serverType: Optional[int] = Field(None, description="서버 타입 override; 비우면 매핑 파일 사용")

    model_config = ConfigDict(populate_by_name=True)


class LogmeterSnapshotData(BaseModel):
    packageNm: str
    serverType: str
    logCount: int
    errorCount: int | None = 0
    jsErrorCount: int | None = 0
    crashCount: int | None = 0
    todayCrashCount: int | None = 0
    todayErrorCount: int | None = 0
    avgCrash7d: int | None = 0
    avgError7d: int | None = 0
    stackAvg: dict | None = None
    lastRegDt: str | None = None
    windowStart: str | None = None
    windowEnd: str | None = None
    updatedAt: str | None = None


class LogmeterSnapshotResponse(BaseModel):
    code: int = 200
    message: str = "Success"
    data: LogmeterSnapshotData


def _fetch_snapshot(package_nm: str, server_type: str) -> LogmeterSnapshotData:
    prefix = os.getenv("VALKEY_PREFIX", "stats:realtime")
    key = f"{prefix}:totallog:{package_nm}:{server_type}"
    client = _get_valkey()
    payload = client.hgetall(key) or {}
    avg_crash_7d = payload.get("avg_crash_7d")
    avg_error_7d = payload.get("avg_error_7d")
    stack_avg = {}
    if avg_error_7d is not None:
        try:
            stack_avg["error"] = float(avg_error_7d)
        except Exception:
            stack_avg["error"] = 0
    if avg_crash_7d is not None:
        try:
            stack_avg["crash"] = float(avg_crash_7d)
        except Exception:
            stack_avg["crash"] = 0
    return LogmeterSnapshotData(
        packageNm=package_nm,
        serverType=server_type,
        logCount=int(payload.get("log_count") or 0),
        errorCount=int(payload.get("error_count") or 0) if "error_count" in payload else None,
        jsErrorCount=int(payload.get("js_error_count") or 0) if "js_error_count" in payload else None,
        crashCount=int(payload.get("crash_count") or 0) if "crash_count" in payload else None,
        todayCrashCount=int(payload.get("today_crash_count") or 0)
        if "today_crash_count" in payload
        else None,
        todayErrorCount=int(payload.get("today_error_count") or 0)
        if "today_error_count" in payload
        else None,
        avgCrash7d=int(float(avg_crash_7d)) if avg_crash_7d is not None else None,
        avgError7d=int(float(avg_error_7d)) if avg_error_7d is not None else None,
        stackAvg=stack_avg or None,
        lastRegDt=payload.get("last_reg_dt"),
        windowStart=payload.get("window_start"),
        windowEnd=payload.get("window_end"),
        updatedAt=payload.get("updated_at"),
    )


def _empty_snapshot(message: str) -> LogmeterSnapshotResponse:
    return LogmeterSnapshotResponse(
        message=message,
        data=LogmeterSnapshotData(
            packageNm="",
            serverType="",
            logCount=0,
            errorCount=0,
            jsErrorCount=0,
            crashCount=0,
            lastRegDt=None,
            windowStart=None,
            windowEnd=None,
            updatedAt=None,
        ),
    )


@app.post(
    "/widget/Logmeter/Snapshot",
    response_model=LogmeterSnapshotResponse,
    summary="[위젯] Logmeter",
)
async def get_logmeter_snapshot(request: LogmeterSnapshotRequest) -> LogmeterSnapshotResponse:
    """
    Valkey에 저장된 Logmeter 스냅샷을 반환합니다.

    - `applicationId`: 조회 대상 앱 ID (필수)
    - `serverType`: 서버 타입 오버라이드 (선택, 없으면 매핑 파일의 serverType 사용)

    응답에는 실시간 로그/에러/크래시 건수, 금일 카운트, 7일 평균(weekly avg)이 포함됩니다.
    """
    resolved = _resolve_pkg_server(request.applicationId, request.serverType)
    if not resolved:
        return _empty_snapshot("application/package 정보를 찾을 수 없습니다.")
    package_nm, server_type = resolved
    try:
        data = _fetch_snapshot(package_nm, server_type)
    except HTTPException:
        raise
    except Exception:
        logging.exception("Logmeter snapshot 조회 실패 (Valkey)")
        return _empty_snapshot("Valkey 조회 실패")
    return LogmeterSnapshotResponse(data=data)


class LogmeterTroubleCursor(BaseModel):
    logTm: int
    deviceId: str
    memUsage: int


class LogmeterTroubleListRequest(BaseModel):
    applicationId: int = Field(..., ge=0, description="Application identifier")
    osType: Optional[str] = Field(None, max_length=32, description="Filter by OS; omit for all")
    dateType: Literal["DAY", "WEEK", "MONTH"] = Field("DAY", description="Aggregation window")
    troubleType: Literal["error", "crash"] = Field("error", description="Trouble log type")
    limit: int = Field(200, ge=1, le=500, description="Page size")
    offset: int = Field(0, ge=0, le=1_000_000, description="Offset for pagination")
    cursor: Optional[LogmeterTroubleCursor] = Field(None, description="Search-after cursor for pagination")
    tmzutc: int = Field(..., description="조회 기준 타임존의 UTC 오프셋(분)")

    model_config = ConfigDict(populate_by_name=True)


class LogmeterTroubleListItem(BaseModel):
    logTm: int
    deviceId: str
    userId: Optional[str] = None
    logType: int
    osType: Optional[str] = None
    appVer: Optional[str] = None
    logName: Optional[str] = None
    deviceModel: Optional[str] = None
    memUsage: int


class LogmeterTroubleListResponse(BaseModel):
    code: int = 200
    message: str = "Success"
    list: list[LogmeterTroubleListItem]
    hasMore: bool = False
    nextCursor: Optional[LogmeterTroubleCursor] = None


class LogmeterTroubleDetailRequest(BaseModel):
    applicationId: int = Field(..., ge=0, description="Application identifier")
    logTm: int = Field(..., ge=0, description="Log timestamp (ms)")
    deviceId: str = Field(..., min_length=1, max_length=128, description="Device identifier")
    memUsage: int = Field(..., ge=0, description="Memory usage (for uniqueness)")
    tmzutc: int = Field(..., description="조회 기준 타임존의 UTC 오프셋(분)")

    model_config = ConfigDict(populate_by_name=True)


class LogmeterTroubleDetailItem(BaseModel):
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


class LogmeterTroubleDetailResponse(BaseModel):
    code: int = 200
    message: str = "Success"
    item: Optional[LogmeterTroubleDetailItem] = None


def _fetch_logmeter_trouble_list_clickhouse(
    *,
    package_nm: str,
    server_type: int,
    os_type: Optional[str],
    date_type: str,
    trouble_type: str,
    limit: int,
    offset: int,
) -> tuple[list[dict], bool]:
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
        "trouble_type": CRASH_LOG_TYPE if trouble == "crash" else 0,
        "crash_log_type": CRASH_LOG_TYPE,
        "limit_plus_one": int(limit) + 1,
        "offset": int(offset),
    }

    sql = SQL.render("logmeter.selectLogmeterTroubleList", params)
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
    return rows[:limit], has_more


def _fetch_logmeter_trouble_detail_clickhouse(
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
    sql = SQL.render("logmeter.selectLogmeterTroubleDetail", params)
    result = get_clickhouse_client().query(sql, params)
    for row in _clickhouse_rows(result):
        return row
    return None


@app.post(
    "/widget/Logmeter/TroubleList",
    response_model=LogmeterTroubleListResponse,
    summary="[위젯] Logmeter Error/Crash 로그 목록 (ClickHouse)",
)
async def LogmeterTroubleList(request: LogmeterTroubleListRequest) -> LogmeterTroubleListResponse:
    if request.applicationId <= 0:
        return LogmeterTroubleListResponse(message="applicationId가 없어 빈 결과를 반환합니다.", list=[])

    resolved = _resolve_pkg_server(request.applicationId)
    if not resolved:
        return LogmeterTroubleListResponse(message="application/package 정보를 찾을 수 없습니다.", list=[])

    package_id, server_type_raw = resolved
    try:
        server_type = int(server_type_raw)
    except Exception:
        raise HTTPException(status_code=400, detail="serverType이 올바르지 않습니다.")

    try:
        records, has_more = _fetch_logmeter_trouble_list_clickhouse(
            package_nm=package_id,
            server_type=server_type,
            os_type=request.osType,
            date_type=request.dateType,
            trouble_type=request.troubleType,
            limit=request.limit,
            offset=request.offset,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Logmeter TroubleList 조회 실패 (ClickHouse)")
        return LogmeterTroubleListResponse(message="ClickHouse 조회 실패", list=[])

    items = [LogmeterTroubleListItem(**record) for record in records]
    return LogmeterTroubleListResponse(
        list=items,
        hasMore=has_more,
    )


@app.post(
    "/widget/Logmeter/TroubleDetail",
    response_model=LogmeterTroubleDetailResponse,
    summary="[위젯] Logmeter Error/Crash 상세 (ClickHouse)",
)
async def LogmeterTroubleDetail(request: LogmeterTroubleDetailRequest) -> LogmeterTroubleDetailResponse:
    if request.applicationId <= 0:
        return LogmeterTroubleDetailResponse(message="applicationId가 없어 빈 결과를 반환합니다.", item=None)

    resolved = _resolve_pkg_server(request.applicationId)
    if not resolved:
        return LogmeterTroubleDetailResponse(message="application/package 정보를 찾을 수 없습니다.", item=None)

    package_id, server_type_raw = resolved
    try:
        server_type = int(server_type_raw)
    except Exception:
        raise HTTPException(status_code=400, detail="serverType이 올바르지 않습니다.")

    try:
        row = _fetch_logmeter_trouble_detail_clickhouse(
            package_nm=package_id,
            server_type=server_type,
            log_tm=request.logTm,
            device_id=request.deviceId,
            mem_usage=request.memUsage,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Logmeter TroubleDetail 조회 실패 (ClickHouse)")
        return LogmeterTroubleDetailResponse(message="ClickHouse 조회 실패", item=None)

    if not row:
        return LogmeterTroubleDetailResponse(message="데이터가 없습니다.", item=None)
    return LogmeterTroubleDetailResponse(item=LogmeterTroubleDetailItem(**row))
