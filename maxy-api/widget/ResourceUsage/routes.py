"""FastAPI routes for the Resource Usage dashboard widget.

- Batch job(`maxy-batch/jobs/resource_usage.py`)에서 ClickHouse 집계를 Valkey에 저장
- API는 Valkey에 저장된 데이터를 조회하여 반환
"""

from __future__ import annotations

import csv
import json
import logging
import os
from datetime import date, datetime, timezone
from functools import lru_cache
from pathlib import Path
from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field, ConfigDict, root_validator, validator

from fastapi import HTTPException

from apiserver import app
from .clickhouse import SQL, get_client as get_clickhouse_client

try:
    import redis  # type: ignore
except ImportError:  # pragma: no cover
    redis = None  # type: ignore

logger = logging.getLogger(__name__)

VALKEY_POPUP_PREFIX_SUFFIX = "resourceusage:popup"
VALKEY_SERIES_PREFIX_SUFFIX = "resourceusage:series"
MAX_MODELS = 6


def _normalise_date_type(value: str) -> str:
    upper = value.upper()
    if upper not in {"DAY", "WEEK", "MONTH"}:
        return "DAY"
    return upper


def _normalise_os_type(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    cleaned = value.strip()
    if not cleaned:
        return None
    lowered = cleaned.lower()
    if lowered in {"all", "a"}:
        return None
    if lowered == "android":
        return "Android"
    if lowered in {"ios", "iphone"}:
        return "iOS"
    return cleaned


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
            socket_timeout=5,
            socket_connect_timeout=5,
            retry_on_timeout=True,
        )
        client.ping()
        return client
    except Exception as exc:  # pragma: no cover
        logger.exception("Valkey 연결 실패: %s", exc)
        raise HTTPException(status_code=500, detail="Valkey 연결에 실패했습니다.")


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


def _safe_float(value: object, *, default: float = 0.0) -> float:
    if value is None:
        return default
    try:
        num = float(value)
    except Exception:
        return default
    return num if num == num else default  # NaN guard


def _parse_json_list(raw: str | None) -> list[dict]:
    if not raw:
        return []
    try:
        parsed = json.loads(raw)
    except Exception:
        return []
    if not isinstance(parsed, list):
        return []
    return [item for item in parsed if isinstance(item, dict)]


def _parse_series(raw: str | None) -> dict:
    if not raw:
        return {}
    try:
        parsed = json.loads(raw)
    except Exception:
        return {}
    if not isinstance(parsed, dict):
        return {}
    return parsed


def _clickhouse_rows(result) -> list[dict]:
    cols = result.column_names
    return [dict(zip(cols, row)) for row in result.result_rows]


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


def _fetch_popup_items_from_clickhouse(
    *,
    package_nm: str,
    server_type: str,
    os_type: Optional[str],
    limit: int,
    offset: int,
) -> tuple[list[dict], bool]:
    os_filter = _normalise_os_type(os_type) or ""
    params = {
        "package_id": package_nm,
        "server_type": int(server_type),
        "os_type": os_filter,
        "limit_plus_one": int(limit) + 1,
        "offset": int(offset),
    }
    sql = SQL.render("resourceusage.selectModels", params)
    result = get_clickhouse_client().query(sql, params)
    rows = _clickhouse_rows(result)

    items: list[dict] = []
    for row in rows:
        device_model = str(row.get("device_model") or "").strip()
        os_value = str(row.get("os_type") or "").strip()
        if not device_model or not os_value:
            continue
        user_count = _safe_int(row.get("user_count_day"))
        log_count = _safe_int(row.get("log_count_day"))
        sum_cpu = _safe_int(row.get("sum_cpu_usage_day"))
        sum_mem = _safe_int(row.get("sum_mem_usage_day"))

        cpu_avg = round(sum_cpu / log_count, 1) if log_count > 0 else 0.0
        mem_avg = int(round(sum_mem / log_count)) if log_count > 0 else 0

        items.append(
            {
                "deviceModel": device_model,
                "count": user_count,
                "usageCount": log_count,
                "cpuUsage": cpu_avg,
                "memUsage": mem_avg,
                "osType": os_value,
            }
        )

    has_more = len(rows) > limit
    return items[:limit], has_more


def _fetch_popup_totals_from_clickhouse(
    *,
    package_nm: str,
    server_type: str,
    os_type: Optional[str],
) -> tuple[int, int, int]:
    os_filter = _normalise_os_type(os_type) or ""
    params = {
        "package_id": package_nm,
        "server_type": int(server_type),
        "os_type": os_filter,
    }
    sql = SQL.render("resourceusage.selectModelsTotals", params)
    result = get_clickhouse_client().query(sql, params)
    rows = _clickhouse_rows(result)
    if not rows:
        return 0, 0, 0
    row = rows[0]
    total_count = _safe_int(row.get("total_count"))
    total_log_count = _safe_int(row.get("total_log_count"))
    total_rows = _safe_int(row.get("total_rows"))
    return total_count, total_log_count, total_rows


def _fetch_model_series_from_clickhouse(
    *,
    package_nm: str,
    server_type: str,
    os_type: Optional[str],
    device_model: str,
) -> ResourceUsageModelSeries | None:
    os_filter = _normalise_os_type(os_type) or ""
    params = {
        "package_id": package_nm,
        "server_type": int(server_type),
        "os_type": os_filter,
        "device_model": device_model,
    }
    sql = SQL.render("resourceusage.selectModelSeries", params)
    result = get_clickhouse_client().query(sql, params)
    rows = _clickhouse_rows(result)

    cpu_points: list[tuple[int, float]] = []
    mem_points: list[tuple[int, int]] = []

    for row in rows:
        ts_ms = _to_ts_ms(row.get("hour_bucket"))
        if ts_ms <= 0:
            continue
        cpu_points.append((ts_ms, float(_safe_int(row.get("avg_cpu_usage")))))
        mem_points.append((ts_ms, _safe_int(row.get("avg_mem_usage"))))

    if not cpu_points and not mem_points:
        return None

    cpu_points.sort(key=lambda point: point[0])
    mem_points.sort(key=lambda point: point[0])

    return ResourceUsageModelSeries(
        deviceModel=device_model,
        osType=os_filter or "",
        cpu=cpu_points,
        memory=mem_points,
    )


def _fetch_popup_items_from_valkey(
    *,
    package_nm: str,
    server_type: str,
    os_type: Optional[str],
) -> list[dict]:
    prefix = os.getenv("VALKEY_PREFIX", "stats:realtime")
    key_prefix = f"{prefix}:{VALKEY_POPUP_PREFIX_SUFFIX}:{package_nm}:{server_type}"
    client = _get_valkey()

    normalized_os = _normalise_os_type(os_type)
    if normalized_os:
        keys = [f"{key_prefix}:{normalized_os}"]
    else:
        keys = client.keys(f"{key_prefix}:*")

    items: list[dict] = []
    for key in keys:
        try:
            items.extend(_parse_json_list(client.hget(key, "items")))
        except Exception:
            logger.exception("Valkey ResourceUsage popup read failed key=%s", key)
            continue

    for item in items:
        item["count"] = _safe_int(item.get("count"))
        item["usageCount"] = _safe_int(item.get("usageCount"))
        item["cpuUsage"] = _safe_float(item.get("cpuUsage"))
        item["memUsage"] = _safe_int(item.get("memUsage"))
        item["deviceModel"] = str(item.get("deviceModel") or "")
        item["osType"] = str(item.get("osType") or "")

    items.sort(key=lambda row: (row.get("count", 0), row.get("deviceModel", "")), reverse=True)
    return items


def _fetch_series_from_valkey(
    *,
    package_nm: str,
    server_type: str,
    os_type: Optional[str],
    device_model: str,
) -> dict:
    prefix = os.getenv("VALKEY_PREFIX", "stats:realtime")
    key_prefix = f"{prefix}:{VALKEY_SERIES_PREFIX_SUFFIX}:{package_nm}:{server_type}"
    client = _get_valkey()

    normalized_os = _normalise_os_type(os_type)
    if normalized_os:
        key = f"{key_prefix}:{normalized_os}"
        return _parse_series(client.hget(key, device_model))
    return {}


def _fetch_series_for_model(
    *,
    package_nm: str,
    server_type: str,
    os_type: Optional[str],
    device_model: str,
) -> tuple[dict, str]:
    normalized_os = _normalise_os_type(os_type)
    prefix = os.getenv("VALKEY_PREFIX", "stats:realtime")
    key_prefix = f"{prefix}:{VALKEY_SERIES_PREFIX_SUFFIX}:{package_nm}:{server_type}"
    client = _get_valkey()

    if normalized_os:
        key = f"{key_prefix}:{normalized_os}"
        return _parse_series(client.hget(key, device_model)), normalized_os

    keys = client.keys(f"{key_prefix}:*")
    for key in keys:
        try:
            series = _parse_series(client.hget(key, device_model))
        except Exception:
            logger.exception("Valkey ResourceUsage series read failed key=%s", key)
            continue
        if series:
            os_found = key.rsplit(":", 1)[-1]
            return series, os_found
    return {}, ""


def _coerce_points(raw_points: object) -> list[tuple[int, object]]:
    if not isinstance(raw_points, list):
        return []
    coerced: list[tuple[int, object]] = []
    for item in raw_points:
        if not isinstance(item, (list, tuple)) or len(item) < 2:
            continue
        ts = _safe_int(item[0])
        if ts <= 0:
            continue
        coerced.append((ts, item[1]))
    coerced.sort(key=lambda point: point[0])
    return coerced


def _tail(points: list[tuple[int, object]], limit: int) -> list[tuple[int, object]]:
    if limit <= 0:
        return []
    if len(points) <= limit:
        return points
    return points[-limit:]


def _build_series_response(
    *,
    device_model: str,
    os_type: str,
    series_map: dict,
    limit: int,
) -> ResourceUsageModelSeries | None:
    raw_cpu = _coerce_points(series_map.get("cpu"))
    raw_mem = _coerce_points(series_map.get("memory"))

    cpu_points = _tail(raw_cpu, limit)
    mem_points = _tail(raw_mem, limit)

    cpu_series = [(int(ts), float(_safe_float(value))) for ts, value in cpu_points]
    memory_series = [(int(ts), _safe_int(value)) for ts, value in mem_points]

    if not cpu_series and not memory_series:
        return None

    return ResourceUsageModelSeries(
        deviceModel=device_model,
        osType=os_type,
        cpu=cpu_series,
        memory=memory_series,
    )


class ResourceUsagePopupRequest(BaseModel):
    """Request payload for the Resource Usage popup list."""

    applicationId: int = Field(
        ..., alias="packageNm", ge=0, description="애플리케이션 ID (packageNm 호환)"
    )
    serverType: Optional[int] = Field(
        None, description="서버 구분 (선택, 미제공 시 기본 서버 사용)"
    )
    osType: Optional[str] = Field(None, description="OS 필터 (생략 시 전체)")
    dateType: Literal["DAY", "WEEK", "MONTH"] = Field(
        "DAY", description="집계 구간 (DAY, WEEK, MONTH)"
    )
    offset: int = Field(0, ge=0, description="조회 시작 위치")
    size: int = Field(6, ge=1, le=30, description="조회할 상위 디바이스 수")
    tmzutc: int = Field(..., description="조회 기준 타임존의 UTC 오프셋(분, 예: 한국 +9시는 540)")

    model_config = ConfigDict(populate_by_name=True)

    @validator("osType", pre=True, always=True)
    def _clean_os_type(cls, value: Optional[str]) -> Optional[str]:  # noqa: N805
        return _normalise_os_type(value)

    @root_validator(pre=True)
    def _backfill_application_id(cls, values: dict) -> dict:  # noqa: N805
        if "applicationId" in values and "packageNm" not in values:
            values["packageNm"] = values["applicationId"]
        return values


class ResourceUsagePopupRow(BaseModel):
    deviceModel: str
    count: int
    usageCount: int
    cpuUsage: float
    memUsage: int
    osType: str


class ResourceUsagePopupTotals(BaseModel):
    totalCount: int
    totalLogCount: int


class ResourceUsagePopupResult(BaseModel):
    popupData: List[ResourceUsagePopupRow]
    totalData: ResourceUsagePopupTotals
    totalRows: int = 0
    nextOffset: Optional[int] = None
    hasMore: bool = False


class ResourceUsagePopupResponse(BaseModel):
    code: int = 200
    message: str = "Success"
    result: ResourceUsagePopupResult


class ResourceUsageDataRequest(BaseModel):
    """Request payload for drill-down series per device model."""

    applicationId: int = Field(..., alias="packageNm", ge=0, description="애플리케이션 ID (packageNm 호환)")
    serverType: Optional[int] = Field(
        None, description="서버 구분 (선택, 미제공 시 기본 서버 사용)"
    )
    osType: Optional[str] = Field(None)
    deviceModel: Optional[str] = Field(None, min_length=1, max_length=128)
    tmzutc: int = Field(..., description="조회 기준 타임존의 UTC 오프셋(분, 예: 한국 +9시는 540)")

    model_config = ConfigDict(populate_by_name=True)

    @validator("osType", pre=True, always=True)
    def _clean_os_type(cls, value: Optional[str]) -> Optional[str]:  # noqa: N805
        return _normalise_os_type(value)

    @root_validator(pre=True)
    def _backfill_application_id(cls, values: dict) -> dict:  # noqa: N805
        if "applicationId" in values and "packageNm" not in values:
            values["packageNm"] = values["applicationId"]
        return values


class ResourceUsageModelSeries(BaseModel):
    deviceModel: str
    osType: str
    cpu: List[tuple[int, float]]
    memory: List[tuple[int, int]]


class ResourceUsageDataResponse(BaseModel):
    code: int = 200
    message: str = "Success"
    result: List[ResourceUsageModelSeries]


@app.post(
    "/widget/ResourceUsage/PopupData",
    response_model=ResourceUsagePopupResponse,
    summary="[위젯] Resource Usage 팝업 목록",
)
async def get_resource_usage_popup_data(
    request: ResourceUsagePopupRequest,
) -> ResourceUsagePopupResponse:
    """[위젯] Resource Usage 팝업에서 사용하는 상위 디바이스 목록과 합계 정보를 반환합니다.

    Args:
        request (ResourceUsagePopupRequest): Resource Usage 팝업에서 사용하는 상위 디바이스 목록과 합계 정보를 반환합니다.
        
        {
            "applicationId": "string",
            "osType": "string",
            "dateType": "DAY",
            "size": 0,
            "tmzutc": 540
        }

        - tmzutc (필수): 조회 기준 타임존의 UTC 오프셋(분). 예) 한국(+9)은 540, 뉴욕(-5)은 -300
    Returns:
        ResourceUsagePopupResponse: Resource Usage 팝업에서 사용하는 상위 디바이스 목록과 합계 정보
        
        {
            "code": 200,
            "message": "Success",
            "result": {
                "popupData": [
                    {
                        "deviceModel": "string",
                        "count": 0,
                        "usageCount": 0,
                        "cpuUsage": 0.0,
                        "memUsage": 0,
                        "osType": "string"
                    }
                ],
                "totalData": {
                    "totalCount": 0,
                    "totalLogCount": 0
                }
            }
        }
    """

    if request.applicationId <= 0:
        result = ResourceUsagePopupResult(
            popupData=[],
            totalData=ResourceUsagePopupTotals(totalCount=0, totalLogCount=0),
            totalRows=0,
        )
        return ResourceUsagePopupResponse(message="applicationId가 없어 빈 결과를 반환합니다.", result=result)

    resolved = _resolve_pkg_server(request.applicationId, request.serverType)
    if not resolved:
        result = ResourceUsagePopupResult(
            popupData=[],
            totalData=ResourceUsagePopupTotals(totalCount=0, totalLogCount=0),
            totalRows=0,
        )
        return ResourceUsagePopupResponse(message="application/package 정보를 찾을 수 없습니다.", result=result)

    package_nm, server_type = resolved
    offset = max(request.offset or 0, 0)
    limit = max(1, min(request.size or MAX_MODELS, 30))

    try:
        page_items, has_more = _fetch_popup_items_from_clickhouse(
            package_nm=package_nm,
            server_type=server_type,
            os_type=request.osType,
            limit=limit,
            offset=offset,
        )
        total_count, total_log_count, total_rows = _fetch_popup_totals_from_clickhouse(
            package_nm=package_nm,
            server_type=server_type,
            os_type=request.osType,
        )
    except Exception:
        logger.exception("ResourceUsage PopupData 조회 실패 (ClickHouse)")
        page_items = []
        has_more = False
        total_count = 0
        total_log_count = 0
        total_rows = 0

    if total_rows <= 0:
        total_rows = len(page_items)

    next_offset = offset + len(page_items) if has_more else None

    result = ResourceUsagePopupResult(
        popupData=[ResourceUsagePopupRow(**item) for item in page_items],
        totalData=ResourceUsagePopupTotals(totalCount=total_count, totalLogCount=total_log_count),
        totalRows=total_rows,
        nextOffset=next_offset,
        hasMore=has_more,
    )
    return ResourceUsagePopupResponse(result=result)


@app.post(
    "/widget/ResourceUsage/Data",
    response_model=ResourceUsageDataResponse,
    summary="[위젯] Resource Usage 데이터",
)
async def ResourceUsageData(
    request: ResourceUsageDataRequest,
) -> ResourceUsageDataResponse:
    """[위젯] Resource Usage 데이터를 반환합니다.

    Args:
        request (ResourceUsageDataRequest): Resource Usage 데이터를 반환합니다.
        
        {
            "applicationId": "string",
            "osType": "string",
            "tmzutc": 540
        }

        - tmzutc (필수): 조회 기준 타임존의 UTC 오프셋(분). 예) 한국(+9)은 540, 뉴욕(-5)은 -300

    Returns:
        ResourceUsageDataResponse: Resource Usage 데이터
        
        {
            "code": 200,
            "message": "Success",
            "result": {
                "user": [
                    {
                        "ts": 0,
                        "value": 0
                    }
                ],
                "cpu": [
                    {
                        "ts": 0,
                        "value": 0.0
                    }
                ],
                "memory": [
                    {
                        "ts": 0,
                        "value": 0
                    }
                ]
            }
        }
    """

    if request.applicationId <= 0:
        return ResourceUsageDataResponse(
            message="applicationId가 없어 빈 결과를 반환합니다.",
            result=[],
        )

    resolved = _resolve_pkg_server(request.applicationId, request.serverType)
    if not resolved:
        return ResourceUsageDataResponse(
            message="application/package 정보를 찾을 수 없습니다.",
            result=[],
        )
    package_nm, server_type = resolved

    limit = 24

    if request.deviceModel:
        device_model = request.deviceModel.strip()
        if not device_model:
            return ResourceUsageDataResponse(result=[])
        try:
            series = _fetch_model_series_from_clickhouse(
                package_nm=package_nm,
                server_type=server_type,
                os_type=request.osType,
                device_model=device_model,
            )
        except Exception:
            logger.exception("ResourceUsage Data 조회 실패 (ClickHouse)")
            series = None

        return ResourceUsageDataResponse(result=[series] if series else [])

    try:
        popup_items = _fetch_popup_items_from_valkey(
            package_nm=package_nm,
            server_type=server_type,
            os_type=request.osType,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("ResourceUsage PopupData 조회 실패 (Valkey)")
        popup_items = []

    series_list: list[ResourceUsageModelSeries] = []
    for item in popup_items[:MAX_MODELS]:
        device_model = str(item.get("deviceModel") or "")
        os_type = str(item.get("osType") or "")
        if not device_model:
            continue
        try:
            series_map = _fetch_series_from_valkey(
                package_nm=package_nm,
                server_type=server_type,
                os_type=os_type,
                device_model=device_model,
            )
        except HTTPException:
            raise
        except Exception:
            logger.exception("ResourceUsage Data 조회 실패 (Valkey)")
            series_map = {}

        series = _build_series_response(
            device_model=device_model,
            os_type=os_type,
            series_map=series_map,
            limit=limit,
        )
        if series:
            series_list.append(series)

    return ResourceUsageDataResponse(result=series_list)
