"""FastAPI routes for the Response Time (S) dashboard widget.

`loading_routes.py`와 동일한 접근을 사용해 Valkey에 캐시된 응답시간 스캐터 데이터를 반환한다.
"""

from __future__ import annotations

import json
import logging
import os
import math
from typing import Any, Dict, List, Optional, Union

from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, Field, validator

from apiserver import app
from .loading_routes import _get_valkey, _resolve_pkg_server
from .clickhouse import SQL, get_client

logger = logging.getLogger(__name__)


def _fetch_from_valkey(
    package_nm: str,
    server_type: str,
    from_ts: int,
    os_filter: Optional[str],
) -> tuple[List[dict], Optional[int]]:
    """
    Valkey에서 ResponseTime 스캐터 데이터를 읽어온다.
    키 형식: `{prefix}:responsetime:{package_nm}:{server_type}:{ts}`
    """
    prefix = os.getenv("VALKEY_PREFIX", "stats:realtime")
    key_prefix = f"{prefix}:responsetime:{package_nm}:{server_type}"
    client = _get_valkey()

    keys = client.keys(f"{key_prefix}:*")
    if not keys:
        return [], None

    keys_int: list[tuple[int, str]] = []
    for k in keys:
        try:
            ts_part = str(k).split(":")[-1]
            ts_val = int(ts_part)
            keys_int.append((ts_val, k))
        except Exception:
            continue

    if not keys_int:
        if from_ts > 0:
            return [], from_ts
        return [], None

    if from_ts <= 0:
        selected_keys = [k for ts, k in sorted(keys_int)]
    else:
        selected_keys = [k for ts, k in sorted(keys_int) if ts > from_ts]

    raw_items: list[str] = []
    for k in selected_keys:
        try:
            val = client.get(k)
            if val:
                raw_items.append(val)
        except Exception:
            logger.exception("Valkey 조회 실패: key=%s", k)
            continue

    last_ts: Optional[int] = None
    if len(raw_items) == 0:
        last_ts = from_ts

    items: List[dict] = []
    for raw in raw_items:
        try:
            records = json.loads(raw)
        except Exception:
            continue
        if isinstance(records, dict):
            records = [records]
        for rec in records:
            if not isinstance(rec, dict):
                continue
            if rec.get("intervaltime") is None:
                continue
            if os_filter and rec.get("os_type") not in (os_filter, None, ""):
                continue
            if "_id" not in rec:
                rec["_id"] = (
                    rec.get("id")
                    or f"{rec.get('package_nm','')}:{rec.get('server_type','')}:{rec.get('device_id','')}:{rec.get('log_tm','')}"
                )
            rec.setdefault("device_model", "")
            rec.setdefault("device_id", "")
            rec.setdefault("req_url", "")
            items.append(rec)

    if selected_keys:
        try:
            last_ts = max(int(str(k).split(":")[-1]) for k in selected_keys)
        except Exception:
            last_ts = None

    logger.info("[responsetime] read %d records keys=%d (from_ts=%d)", len(items), len(selected_keys),from_ts)
    return items, last_ts


class ResponseTimeScatterRequest(BaseModel):
    """Request payload for the Response Time (S) scatter widget."""

    applicationId: int = Field(..., description="Application identifier")
    osType: Optional[str] = Field(None, description="OS filter; use None for all")
    from_ts: int = Field(0, alias="from", description="Start timestamp (ms); first call can be 0")
    to_ts: int = Field(..., alias="to", description="End timestamp (ms)")
    tmzutc: int = Field(..., description="조회 기준 타임존의 UTC 오프셋(분, 예: 한국 +9시는 540)")
    model_config = ConfigDict(populate_by_name=True)

    @validator("to_ts")
    def _ensure_positive(cls, value: int) -> int:  # noqa: N805 (pydantic validator signature)
        if value <= 0:
            raise ValueError("to must be a positive timestamp")
        return value

    @validator("from_ts")
    def _clamp_from_ts(cls, value: int) -> int:  # noqa: N805
        if value is None or value < 0:
            return 0
        return value


class ResponseTimeScatterItem(BaseModel):
    """Response Time item; snake_case 필드로 통일."""

    log_type: Optional[Union[str, int]] = None
    log_tm: Optional[int] = None
    intervaltime: float
    device_model: str
    device_id: str
    req_url: str
    com_type: Optional[str] = None
    com_sensitivity: Optional[float] = None
    cpu_usage: Optional[float] = None
    sim_operator_nm: Optional[str] = None
    app_ver: Optional[str] = None
    package_nm: Optional[str] = None
    server_type: Optional[Union[str, int]] = None
    wait_time: Optional[int] = None
    download_time: Optional[int] = None
    response_size: Optional[int] = None
    request_size: Optional[int] = None
    os_type: Optional[str] = None
    _id: str

    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    @validator("log_type", pre=True)
    def _normalize_log_type(cls, value):
        if value is None:
            return value
        if isinstance(value, (int, float)):
            return str(int(value))
        return value

    @validator(
        "wait_time",
        "download_time",
        "response_size",
        "request_size",
        "cpu_usage",
        "com_sensitivity",
        pre=True,
    )
    def _normalize_optional_number(cls, value):
        if value is None:
            return None
        try:
            num = float(value)
            if not math.isfinite(num):
                return None
            return num
        except Exception:
            return None


class ResponseTimeScatterResponse(BaseModel):
    code: int = 200
    list: List[ResponseTimeScatterItem]
    afterKey: Optional[Dict[str, int]] = None
    message: str = "Success"


@app.post(
    "/widget/ResponsTimeS/List",
    response_model=ResponseTimeScatterResponse,
    summary="[위젯] Response Time (S)",
)
async def ResponsTimeSList(request: ResponseTimeScatterRequest) -> ResponseTimeScatterResponse:
    """
    LoadingTime과 동일한 방식으로 응답시간 스캐터 데이터를 조회한다.
    - Valkey에 저장된 `stats:realtime:responsetime:{pkg}:{srv}:{ts}` JSON 리스트를 읽어온다.
    - `from`이 0 이하이면 전체 키를, 그렇지 않으면 `from` 이후 타임스탬프 키만 조회한다. `to`가 양수면 상한으로 사용한다.
    - 응답은 snake_case 필드 그대로 전달하며, 최대 `size`개로 제한한다.
    - afterKey.ts에는 마지막으로 읽은 키 타임스탬프를 내려주며, 다음 요청의 `from` 값으로 사용한다.
    """
    if request.applicationId <= 0:
        return ResponseTimeScatterResponse(
            list=[],
            afterKey=None,
            message="applicationId가 없어 빈 결과를 반환합니다.",
        )

    if request.from_ts >= request.to_ts:
        raise HTTPException(status_code=400, detail="`from` must be earlier than `to`.")

    resolved = _resolve_pkg_server(request.applicationId, None)
    if not resolved:
        return ResponseTimeScatterResponse(
            list=[],
            afterKey=None,
            message="applicationId에 매핑된 package/server 정보를 찾을 수 없습니다.",
        )

    pkg, server_type = resolved
    os_filter = request.osType
    if not os_filter or str(os_filter).lower() in {"a", "all"}:
        os_filter = None

    try:
        dataset, last_ts = _fetch_from_valkey(pkg, server_type, request.from_ts, os_filter)
    except HTTPException:
        raise
    except Exception:
        logger.exception("ResponsTimeSList: Valkey 조회 실패")
        raise HTTPException(status_code=500, detail="Valkey 조회 실패")

    if not dataset:
        return ResponseTimeScatterResponse(
            list=[],
            afterKey=None,
            message="요청 구간에 해당하는 데이터가 없습니다.",
        )

    items: List[ResponseTimeScatterItem] = []
    for rec in dataset:
        try:
            items.append(ResponseTimeScatterItem.model_validate(rec))
        except Exception:
            logger.exception("ResponseTime item validation 실패 rec=%s", rec)
            continue

    if not items:
        return ResponseTimeScatterResponse(
            list=[],
            afterKey=None,
            message="유효한 데이터가 없습니다.",
        )

    # items.sort(key=lambda item: item.log_tm or 0, reverse=True)
    after_key = {"ts": last_ts} if last_ts is not None else None
    return ResponseTimeScatterResponse(list=items, afterKey=after_key, message="Success")


class ResponseTimeDetailRequest(BaseModel):
    """Request payload for a Response Time (S) detail lookup."""

    deviceId: str = Field(..., alias="device_id", description="Device identifier")
    logTm: int = Field(..., alias="log_tm", description="Log timestamp (ms)")

    model_config = ConfigDict(populate_by_name=True)

    @validator("deviceId")
    def _ensure_device_id(cls, value: str) -> str:  # noqa: N805 (pydantic validator signature)
        if not value or not str(value).strip():
            raise ValueError("deviceId is required")
        return str(value).strip()

    @validator("logTm")
    def _ensure_log_tm(cls, value: int) -> int:  # noqa: N805
        try:
            parsed = int(value)
        except Exception as exc:
            raise ValueError("logTm must be an integer") from exc
        if parsed <= 0:
            raise ValueError("logTm must be a positive timestamp")
        return parsed


class ResponseTimeDetailRecord(BaseModel):
    logTm: int
    deviceId: str
    logType: Optional[Union[str, int]] = None
    reqUrl: Optional[str] = None
    pageUrl: Optional[str] = None
    userId: Optional[str] = None
    resMsg: Optional[str] = None
    intervaltime: Optional[int] = None
    downloadTime: Optional[int] = None
    waitTime: Optional[int] = None
    responseSize: Optional[int] = None
    requestSize: Optional[int] = None
    webviewVer: Optional[str] = None
    appBuildNum: Optional[str] = None
    storageTotal: Optional[int] = None
    storageUsage: Optional[int] = None
    batteryLvl: Optional[str] = None
    memUsage: Optional[int] = None
    cpuUsage: Optional[int] = None
    comSensitivity: Optional[Union[str, float, int]] = None
    comType: Optional[str] = None
    simOperatorNm: Optional[str] = None
    osType: Optional[str] = None
    appVer: Optional[str] = None
    timezone: Optional[str] = None
    ip: Optional[str] = None
    statusCode: Optional[int] = None

    model_config = ConfigDict(populate_by_name=True, extra="ignore")


class ResponseTimeDetailResponse(BaseModel):
    code: int = 200
    detail: Optional[ResponseTimeDetailRecord] = None
    message: str = "Success"


@app.post(
    "/widget/ResponsTimeS/Detail",
    response_model=ResponseTimeDetailResponse,
    summary="[위젯] Response Time (S) 상세",
)
async def ResponsTimeSDetail(request: ResponseTimeDetailRequest) -> ResponseTimeDetailResponse:
    """Response Time (S) 상세 정보 조회.

    Valkey 스캐터 목록에는 포함되지 않는 상세 필드를 ClickHouse `maxy_app_total_log`에서 조회한다.
    조회 키: (device_id, log_tm)
    """

    params: dict[str, Any] = {"device_id": request.deviceId, "log_tm": request.logTm}
    sql = SQL.render("responsetime.selectResponseTimeDetail", params)
    try:
        result = get_client().query(sql, params)
    except Exception:
        logger.exception("ResponsTimeSDetail: ClickHouse 조회 실패 device_id=%s log_tm=%s", request.deviceId, request.logTm)
        raise HTTPException(status_code=500, detail="ClickHouse 조회 실패")

    if not getattr(result, "result_rows", None):
        return ResponseTimeDetailResponse(detail=None, message="Success")

    row = dict(zip(result.column_names, result.result_rows[0]))
    try:
        detail = ResponseTimeDetailRecord.model_validate(row)
    except Exception:
        logger.exception("ResponsTimeSDetail: 응답 변환 실패 row=%s", row)
        return ResponseTimeDetailResponse(detail=None, message="응답 데이터 변환에 실패했습니다.")

    return ResponseTimeDetailResponse(detail=detail, message="Success")
