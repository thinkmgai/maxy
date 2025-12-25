"""FastAPI routes for the PV Equalizer dashboard widget."""

from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Literal, Optional

from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, Field, root_validator, validator

from apiserver import app
from widget.Favorites.routes import (  # type: ignore
    _fetch_favorites_today_from_valkey,
    _normalize_os_type,
    _resolve_pkg_server,
)

from .clickhouse import SQL, get_client as get_clickhouse_client


def _clean_os_type(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    cleaned = value.strip()
    if not cleaned:
        return None
    lower = cleaned.lower()
    if lower in {"all", "전체", "a"}:
        return "all"
    if lower in {"android", "and"}:
        return "Android"
    if lower in {"ios", "iphone"}:
        return "iOS"
    return cleaned


class PVEqualizerInfoListRequest(BaseModel):
    """Request payload for the PV Equalizer widget."""

    applicationId: int = Field(
        ..., alias="packageNm", ge=0, description="애플리케이션 ID (packageNm 호환)"
    )
    serverType: Optional[int] = Field(
        None, description="서버 구분 (선택, 미제공 시 기본 서버 사용)"
    )
    osType: Optional[str] = Field(None, description="OS 필터 (all, Android, iOS)")
    size: int = Field(12, ge=1, le=500, description="조회할 URL 최대 개수 (기본 12, 최대 500)")
    tmzutc: int = Field(..., description="조회 기준 타임존의 UTC 오프셋(분, 예: 한국 +9시는 540)")

    model_config = ConfigDict(populate_by_name=True)

    @root_validator(pre=True)
    def _backfill_application_id(cls, values: dict) -> dict:  # noqa: N805
        if "applicationId" in values and "packageNm" not in values:
            values["packageNm"] = values["applicationId"]
        return values

    @validator("osType", pre=True, always=True)
    def _normalise_os_type(cls, value: Optional[str]) -> Optional[str]:  # noqa: N805
        return _clean_os_type(value)


class PVEqualizerInfoListItem(BaseModel):
    reqUrl: str
    viewCount: int
    uniqDeviceCount: int = 0
    logType: Optional[str] = None


class PVEqualizerInfoListResponse(BaseModel):
    code: int = 200
    message: str = "Success"
    list: list[PVEqualizerInfoListItem]


@app.post(
    "/widget/PVEqualizer/InfoList",
    response_model=PVEqualizerInfoListResponse,
    summary="[위젯] PV Equalizer 목록 (Favorites 실시간 데이터 기반)",
)
async def get_pv_equalizer_info_list(
    request: PVEqualizerInfoListRequest,
) -> PVEqualizerInfoListResponse:
    """PV Equalizer 위젯에서 사용하는 상위 URL 목록을 반환합니다.

    - Favorites 실시간 Valkey 데이터를 재사용하며 viewCount는 logCount와 동일합니다.
    - Day/Week/Month 구분 없이 현재 실시간 스냅샷만 제공합니다.
    """

    if request.applicationId <= 0:
        return PVEqualizerInfoListResponse(
            message="applicationId가 없어 빈 결과를 반환합니다.",
            list=[],
        )

    resolved = _resolve_pkg_server(request.applicationId, request.serverType)
    if not resolved:
        return PVEqualizerInfoListResponse(message="application/package 정보를 찾을 수 없습니다.", list=[])

    package_nm, server_type = resolved

    try:
        records = _fetch_favorites_today_from_valkey(
            package_nm=package_nm,
            server_type=server_type,
            os_type=_normalize_os_type(request.osType),
            size=request.size,
        )
    except Exception:
        # 내부 함수가 HTTPException을 발생시킬 수 있으므로 별도로 처리하지 않고 전파
        raise

    items = [
        PVEqualizerInfoListItem(
            reqUrl=str(record.get("reqUrl") or "").strip(),
            viewCount=int(record.get("logCount") or 0),
            uniqDeviceCount=int(record.get("uniqDeviceCount") or 0),
            logType=record.get("logType"),
        )
        for record in records
        if record.get("reqUrl")
    ]

    return PVEqualizerInfoListResponse(list=items)


def _resolve_date_range(date_type: str) -> tuple[date, date]:
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


def _clickhouse_rows(result):
    cols = result.column_names
    for row in result.result_rows:
        yield dict(zip(cols, row))


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


class PVEqualizerAllInfoListRequest(BaseModel):
    """Request payload for PV Equalizer All popup list (ClickHouse)."""

    applicationId: int = Field(
        ..., alias="packageNm", ge=0, description="애플리케이션 ID (packageNm 호환)"
    )
    serverType: Optional[int] = Field(None, description="서버 구분 (선택, 미제공 시 기본 서버 사용)")
    osType: Optional[str] = Field(None, max_length=32, description="Filter by OS; omit for all")
    dateType: Literal["DAY", "WEEK", "MONTH"] = Field("DAY", description="Aggregation window")
    limit: int = Field(500, ge=1, le=500, description="Page size (max 500)")
    offset: int = Field(0, ge=0, le=1_000_000, description="Offset for pagination")
    tmzutc: int = Field(..., description="조회 기준 타임존의 UTC 오프셋(분)")

    model_config = ConfigDict(populate_by_name=True)

    @root_validator(pre=True)
    def _backfill_application_id(cls, values: dict) -> dict:  # noqa: N805
        if "applicationId" in values and "packageNm" not in values:
            values["packageNm"] = values["applicationId"]
        return values

    @validator("osType", pre=True, always=True)
    def _normalise_os_type(cls, value: Optional[str]) -> Optional[str]:  # noqa: N805
        return _clean_os_type(value)


class PVEqualizerAllInfoListItem(BaseModel):
    reqUrl: str
    viewCount: int
    uniqDeviceCount: int
    intervaltime: int


class PVEqualizerAllInfoListResponse(BaseModel):
    code: int = 200
    message: str = "Success"
    offset: int
    limit: int
    hasMore: bool
    list: list[PVEqualizerAllInfoListItem]


class PVEqualizerDetailRequest(BaseModel):
    """Request payload for PV Equalizer detail popup."""

    applicationId: int = Field(
        ..., alias="packageNm", ge=0, description="애플리케이션 ID (packageNm 호환)"
    )
    serverType: Optional[int] = Field(None, description="서버 구분 (선택, 미제공 시 기본 서버 사용)")
    osType: Optional[str] = Field(None, max_length=32, description="Filter by OS; omit for all")
    reqUrl: str = Field(..., min_length=1, max_length=512, description="대상 페이지명")
    dateType: Literal["DAY", "WEEK", "MONTH"] = Field("DAY", description="Aggregation window")
    limit: int = Field(100, ge=1, le=500, description="목록 크기 (max 500)")
    offset: int = Field(0, ge=0, le=1_000_000, description="Offset for pagination")
    tmzutc: int = Field(..., description="조회 기준 타임존의 UTC 오프셋(분)")
    includeChart: bool = Field(True, description="차트 데이터 포함 여부")

    model_config = ConfigDict(populate_by_name=True)

    @root_validator(pre=True)
    def _backfill_application_id(cls, values: dict) -> dict:  # noqa: N805
        if "applicationId" in values and "packageNm" not in values:
            values["packageNm"] = values["applicationId"]
        return values

    @validator("osType", pre=True, always=True)
    def _normalise_os_type(cls, value: Optional[str]) -> Optional[str]:  # noqa: N805
        return _clean_os_type(value)

    @validator("reqUrl")
    def _req_url_not_blank(cls, value: str) -> str:  # noqa: N805
        if not value.strip():
            raise ValueError("reqUrl must not be blank.")
        return value


class PVEqualizerDetailListItem(BaseModel):
    logTm: int
    deviceId: str
    userId: Optional[str] = None
    stayTime: int
    loadingTime: int


class PVEqualizerDetailChartItem(BaseModel):
    time: str
    stayTime: int
    loadingTime: int


class PVEqualizerDetailResponse(BaseModel):
    code: int = 200
    message: str = "Success"
    list: list[PVEqualizerDetailListItem]
    chart: list[PVEqualizerDetailChartItem]


def _fetch_pv_equalizer_all_info_list_clickhouse(
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

    params = {
        "from_date": start_date.isoformat(),
        "to_date": end_date.isoformat(),
        "package_id": package_id,
        "server_type": int(server_type),
        "os_type": os_filter,
        "limit": int(limit) + 1,
        "offset": int(offset),
    }

    sql = SQL.render("pvequalizer.selectPVEqualizerAllInfoList", params)

    result = get_clickhouse_client().query(sql, params)
    rows: list[dict] = []
    for row in _clickhouse_rows(result):
        rows.append(
            {
                "reqUrl": str(row.get("reqUrl") or "").strip(),
                "viewCount": _safe_int(row.get("viewCount")),
                "uniqDeviceCount": _safe_int(row.get("uniqDeviceCount")),
                "intervaltime": _safe_int(row.get("intervaltime")),
            }
        )

    has_more = len(rows) > limit
    return rows[:limit], has_more


def _fetch_pv_equalizer_detail_list_clickhouse(
    *,
    package_nm: str,
    server_type: int,
    os_type: Optional[str],
    req_url: str,
    date_type: str,
    limit: int,
    offset: int,
) -> list[dict]:
    start_date, end_date = _resolve_date_range(date_type)
    start_ts = datetime.combine(start_date, datetime.min.time()).strftime("%Y-%m-%d %H:%M:%S")
    end_ts = datetime.combine(end_date, datetime.min.time()).strftime("%Y-%m-%d %H:%M:%S")
    os_filter = _normalize_os_type(os_type) or ""

    params = {
        "from_ts": start_ts,
        "to_ts": end_ts,
        "package_nm": package_nm,
        "server_type": int(server_type),
        "os_type": os_filter,
        "page_name": req_url,
        "limit": int(limit),
        "offset": int(offset),
    }

    sql = SQL.render("pvequalizer.selectPVEqualizerDetailList", params)
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
                "stayTime": _safe_int(row.get("stayTime")),
                "loadingTime": _safe_int(row.get("loadingTime")),
            }
        )

    return rows


def _fetch_pv_equalizer_detail_chart_clickhouse(
    *,
    package_nm: str,
    server_type: int,
    os_type: Optional[str],
    req_url: str,
    date_type: str,
) -> list[dict]:
    start_date, end_date = _resolve_date_range(date_type)
    start_ts = datetime.combine(start_date, datetime.min.time()).strftime("%Y-%m-%d %H:%M:%S")
    end_ts = datetime.combine(end_date, datetime.min.time()).strftime("%Y-%m-%d %H:%M:%S")
    os_filter = _normalize_os_type(os_type) or ""

    params = {
        "from_ts": start_ts,
        "to_ts": end_ts,
        "package_nm": package_nm,
        "server_type": int(server_type),
        "os_type": os_filter,
        "page_name": req_url,
    }

    sql = SQL.render("pvequalizer.selectPVEqualizerDetailChart", params)
    result = get_clickhouse_client().query(sql, params)
    rows: list[dict] = []
    for row in _clickhouse_rows(result):
        rows.append(
            {
                "time": str(row.get("time") or "").strip(),
                "stayTime": _safe_int(row.get("stayTime")),
                "loadingTime": _safe_int(row.get("loadingTime")),
            }
        )

    return rows


@app.post(
    "/widget/PVEqualizer/All/InfoList",
    response_model=PVEqualizerAllInfoListResponse,
    summary="[위젯] PV Equalizer All 팝업 목록 (ClickHouse)",
)
async def get_pv_equalizer_all_info_list(
    request: PVEqualizerAllInfoListRequest,
) -> PVEqualizerAllInfoListResponse:
    if request.applicationId <= 0:
        return PVEqualizerAllInfoListResponse(
            message="applicationId가 없어 빈 결과를 반환합니다.",
            offset=request.offset,
            limit=request.limit,
            hasMore=False,
            list=[],
        )

    resolved = _resolve_pkg_server(request.applicationId, request.serverType)
    if not resolved:
        return PVEqualizerAllInfoListResponse(
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
        records, has_more = _fetch_pv_equalizer_all_info_list_clickhouse(
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
        raise HTTPException(status_code=500, detail="ClickHouse 조회 실패")

    items = [PVEqualizerAllInfoListItem(**record) for record in records]
    return PVEqualizerAllInfoListResponse(
        offset=request.offset,
        limit=request.limit,
        hasMore=has_more,
        list=items,
    )


@app.post(
    "/widget/PVEqualizer/InfoDetail",
    response_model=PVEqualizerDetailResponse,
    summary="[위젯] PV Equalizer 상세 (page flow 기반)",
)
async def get_pv_equalizer_detail(
    request: PVEqualizerDetailRequest,
) -> PVEqualizerDetailResponse:
    if request.applicationId <= 0:
        return PVEqualizerDetailResponse(
            message="applicationId가 없어 빈 결과를 반환합니다.",
            list=[],
            chart=[],
        )

    resolved = _resolve_pkg_server(request.applicationId, request.serverType)
    if not resolved:
        return PVEqualizerDetailResponse(
            message="application/package 정보를 찾을 수 없습니다.",
            list=[],
            chart=[],
        )

    package_nm, server_type_raw = resolved
    try:
        server_type = int(server_type_raw)
    except Exception:
        raise HTTPException(status_code=400, detail="serverType이 올바르지 않습니다.")

    req_url = request.reqUrl.strip()
    if not req_url:
        return PVEqualizerDetailResponse(message="reqUrl이 없어 빈 결과를 반환합니다.", list=[], chart=[])

    try:
        list_rows = _fetch_pv_equalizer_detail_list_clickhouse(
            package_nm=package_nm,
            server_type=server_type,
            os_type=request.osType,
            req_url=req_url,
            date_type=request.dateType,
            limit=request.limit,
            offset=request.offset,
        )
        chart_rows: list[dict] = []
        if request.includeChart:
            chart_rows = _fetch_pv_equalizer_detail_chart_clickhouse(
                package_nm=package_nm,
                server_type=server_type,
                os_type=request.osType,
                req_url=req_url,
                date_type=request.dateType,
            )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="ClickHouse 조회 실패")

    list_items = [PVEqualizerDetailListItem(**row) for row in list_rows]
    chart_items = [PVEqualizerDetailChartItem(**row) for row in chart_rows]
    return PVEqualizerDetailResponse(list=list_items, chart=chart_items)
