"""Pydantic models for the synthetic Waterfall API."""

from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field, ConfigDict, validator


class WaterfallDetailRequest(BaseModel):
    """Request payload for retrieving waterfall diagnostics."""

    applicationId: str = Field(..., alias="packageNm", description="애플리케이션 ID 혹은 패키지명")
    deviceId: Optional[str] = Field(None, description="장치 식별자")
    osType: Optional[str] = Field(None, description="OS 타입 (Android, iOS 등)")
    reqUrl: Optional[str] = Field(None, description="요청 URL")
    mxPageId: Optional[str] = Field(None, description="MX 페이지 ID")
    logTm: Optional[int] = Field(None, description="로그 타임스탬프 (ms)")
    pageStartTm: Optional[int] = Field(None, description="페이지 시작 타임스탬프 (ms)")
    pageEndTm: Optional[int] = Field(None, description="페이지 종료 타임스탬프 (ms)")
    limit: int = Field(
        60,
        ge=10,
        le=200,
        description="생성할 리소스 레코드 수 (디폴트 60, 최대 200)",
    )

    model_config = ConfigDict(populate_by_name=True)

    @validator("applicationId", pre=True)
    def _stringify_application_id(cls, value: object) -> str:  # noqa: N805
        if value is None:
            raise ValueError("applicationId/packageNm is required")
        return str(value)

    @validator("limit", pre=True, always=True)
    def _clamp_limit(cls, value: Optional[int]) -> int:  # noqa: N805
        if value is None:
            return 60
        return max(10, min(int(value), 200))


class WaterfallPerformanceSpan(BaseModel):
    label: str
    start: float
    duration: float


class WaterfallPerformanceData(BaseModel):
    resource: List[WaterfallPerformanceSpan]
    longTask: List[WaterfallPerformanceSpan]
    clickAction: List[WaterfallPerformanceSpan]


class WaterfallTimingEntry(BaseModel):
    key: str
    label: str
    value: float
    unit: str


class WaterfallResourceEntry(BaseModel):
    id: str
    name: str
    entryType: str
    initiatorType: str
    startTime: float
    duration: float
    transferSize: int
    encodedBodySize: int
    decodedBodySize: int
    status: int
    domain: str
    resourceType: str
    sizeLabel: str
    timelineLabel: str
    markers: List[str] = Field(default_factory=list)


class WaterfallErrorEntry(BaseModel):
    id: str
    logTm: int
    waterfallTm: float
    name: str
    message: str
    status: int
    initiatorType: str


class WaterfallDetailResponse(BaseModel):
    code: int = 200
    message: str = "Success"
    resourceInfoData: List[WaterfallResourceEntry]
    performanceData: WaterfallPerformanceData
    timingData: List[WaterfallTimingEntry]
    errorData: List[WaterfallErrorEntry]
