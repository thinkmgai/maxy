"""FastAPI routes for the Area Distribution dashboard widget."""

from __future__ import annotations

from typing import Dict, Literal, Optional

from pydantic import BaseModel, Field, ConfigDict, root_validator, validator

from apiserver import app
from playload.areaDistributionPayload import (
    AreaDistributionConfig,
    AreaDistributionDetailConfig,
    build_area_distribution_detail_rows,
    build_area_distribution_map,
)


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


def _normalise_date_type(value: str) -> str:
    upper = value.upper()
    if upper not in {"DAY", "WEEK", "MONTH"}:
        return "DAY"
    return upper


class AreaDistributionSummaryRequest(BaseModel):
    """Request payload for Area Distribution map data."""

    applicationId: str = Field(
        ..., alias="packageNm", min_length=1, max_length=128, description="패키지 이름"
    )
    osType: Optional[str] = Field(None, description="OS 타입 (Android, iOS 등)")
    dateType: Literal["DAY", "WEEK", "MONTH"] = Field(
        "DAY", description="집계 구간 (DAY, WEEK, MONTH)"
    )
    tmzutc: int = Field(..., description="조회 기준 타임존의 UTC 오프셋(분, 예: 한국 +9시는 540)")

    model_config = ConfigDict(populate_by_name=True)

    @root_validator(pre=True)
    def _backfill_application_id(cls, values: dict) -> dict:  # noqa: N805
        if "applicationId" in values and "packageNm" not in values:
            values["packageNm"] = values["applicationId"]
        return values

    @validator("osType", pre=True, always=True)
    def _clean_os_type(cls, value: Optional[str]) -> Optional[str]:  # noqa: N805
        return _normalise_os_type(value)

    @validator("dateType", pre=True, always=True)
    def _clean_date_type(cls, value: Optional[str]) -> str:  # noqa: N805
        if not value:
            return "DAY"
        return _normalise_date_type(str(value))


class AreaDistributionRegionMetrics(BaseModel):
    dau: int = Field(..., ge=0)
    error: int = Field(..., ge=0)
    crash: int = Field(..., ge=0)


class AreaDistributionSummaryResult(BaseModel):
    byLocation: Dict[str, AreaDistributionRegionMetrics]
    totals: AreaDistributionRegionMetrics
    lastUpdated: int


class AreaDistributionSummaryResponse(BaseModel):
    code: int = 200
    message: str = "Success"
    result: AreaDistributionSummaryResult


class AreaDistributionDetailRequest(BaseModel):
    """Request payload for Area Distribution drill-down list."""

    applicationId: str = Field(..., alias="packageNm", min_length=1, max_length=128)
    osType: Optional[str] = Field(None)
    locationCode: str = Field(..., min_length=2, max_length=16)
    requestType: Literal["TOTAL", "ERROR", "CRASH"] = Field(
        "TOTAL", description="요청 타입 (TOTAL, ERROR, CRASH)"
    )
    next: int = Field(0, ge=0, description="다음 페이지를 위한 offset 값")
    size: int = Field(50, ge=1, le=100, description="한 번에 가져올 데이터 수")
    tmzutc: int = Field(..., description="조회 기준 타임존의 UTC 오프셋(분, 예: 한국 +9시는 540)")

    model_config = ConfigDict(populate_by_name=True)

    @root_validator(pre=True)
    def _backfill_application_id(cls, values: dict) -> dict:  # noqa: N805
        if "applicationId" in values and "packageNm" not in values:
            values["packageNm"] = values["applicationId"]
        return values
    @validator("osType", pre=True, always=True)
    def _clean_os_type(cls, value: Optional[str]) -> Optional[str]:  # noqa: N805
        return _normalise_os_type(value)

    @validator("requestType", pre=True, always=True)
    def _clean_request_type(cls, value: Optional[str]) -> str:  # noqa: N805
        if not value:
            return "TOTAL"
        upper = str(value).upper()
        if upper not in {"TOTAL", "ERROR", "CRASH"}:
            return "TOTAL"
        return upper


class AreaDistributionDetailRow(BaseModel):
    logTm: int
    deviceId: str
    deviceModel: str
    userId: str
    logType: str
    appVer: str
    applicationId: str
    osType: str
    reqUrl: str
    pageUrl: Optional[str]
    statusCode: int
    durationMs: int
    docId: str


class AreaDistributionDetailResult(BaseModel):
    rows: list[AreaDistributionDetailRow]
    next: int
    hasMore: bool


class AreaDistributionDetailResponse(BaseModel):
    code: int = 200
    message: str = "Success"
    result: AreaDistributionDetailResult


@app.post(
    "/widget/AreaDistribution/MapData",
    response_model=AreaDistributionSummaryResponse,
    summary="[위젯] Area Distribution 지도 데이터",
)
async def AreaDistributionMapData(
    request: AreaDistributionSummaryRequest,
) -> AreaDistributionSummaryResponse:
    """[위젯] Area Distribution 위젯에서 사용하는 지도 데이터를 반환합니다.

    Args:
        request (AreaDistributionSummaryRequest): AreaDistributionSummaryRequest
        
        {
            "applicationId": "string",
            "osType": "string",
            "dateType": "string",
            "tmzutc": 540
        }

        - tmzutc (필수): 조회 기준 타임존의 UTC 오프셋(분). 예) 한국(+9)은 540, 뉴욕(-5)은 -300

    Returns:
        AreaDistributionSummaryResponse: AreaDistributionSummaryResponse
        
        {
            "code": 200,
            "message": "string",
            "result": {
                "byLocation": {
                    "string": {
                        "dau": 0,
                        "error": 0,
                        "crash": 0
                    }
                },
                "totals": {
                    "dau": 0,
                    "error": 0,
                    "crash": 0
                },
                "lastUpdated": 0
            }
        }
    """

    dataset = build_area_distribution_map(
        AreaDistributionConfig(
            application_id=request.applicationId,
            os_type=request.osType,
            date_type=request.dateType,
            tmzutc=request.tmzutc,
        )
    )

    by_location = {
        code: AreaDistributionRegionMetrics(**metrics)
        for code, metrics in dataset["byLocation"].items()
    }
    totals = AreaDistributionRegionMetrics(**dataset["totals"])
    result = AreaDistributionSummaryResult(
        byLocation=by_location,
        totals=totals,
        lastUpdated=int(dataset["lastUpdated"]),
    )
    return AreaDistributionSummaryResponse(code=200, message="Success", result=result)


@app.post(
    "/widget/AreaDistribution/DetailList",
    response_model=AreaDistributionDetailResponse,
    summary="[위젯] Area Distribution 지역별 세부 로그 목록",
)
async def AreaDistributionDetailList(
    request: AreaDistributionDetailRequest,
) -> AreaDistributionDetailResponse:
    """Area Distribution 지도에서 특정 지역을 클릭했을 때 노출할 세부 로그 목록을 반환합니다.

    Args:
        request (AreaDistributionDetailRequest): AreaDistributionDetailRequest

        {
            "applicationId": "string",
            "osType": "string",
            "locationCode": "string",
            "requestType": "string",
            "next": 0,
            "size": 0,
            "tmzutc": 540
        }

        - tmzutc (필수): 조회 기준 타임존의 UTC 오프셋(분). 예) 한국(+9)은 540, 뉴욕(-5)은 -300

    Returns:
        AreaDistributionDetailResponse: AreaDistributionDetailResponse
        
        {
            "code": 200,
            "message": "string",
            "result": {
                "rows": [
                    {
                        "logTm": 0,
                        "deviceId": "string",
                        "deviceModel": "string",
                        "userId": "string",
                        "logType": "string",
                        "appVer": "string",
                        "applicationId": "string",
                        "osType": "string",
                        "reqUrl": "string",
                        "pageUrl": "string",
                        "statusCode": 0,
                        "durationMs": 0,
                        "docId": "string"
                    }
                ],
                "next": 0,
                "hasMore": true
            }
        }
    """
    
    dataset = build_area_distribution_detail_rows(
        AreaDistributionDetailConfig(
            application_id=request.applicationId,
            os_type=request.osType,
            location_code=request.locationCode,
            request_type=request.requestType,
            next_offset=request.next,
            size=request.size,
            tmzutc=request.tmzutc,
        )
    )

    rows = [AreaDistributionDetailRow(**row) for row in dataset["rows"]]
    result = AreaDistributionDetailResult(
        rows=rows,
        next=int(dataset["next"]),
        hasMore=bool(dataset["hasMore"]),
    )
    return AreaDistributionDetailResponse(code=200, message="Success", result=result)
