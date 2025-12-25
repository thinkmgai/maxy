from __future__ import annotations

from typing import Dict, List, Optional

from pydantic import BaseModel, Field, ConfigDict


class TimeRangeRequest(BaseModel):
    applicationId: int
    osType: Optional[str] = None
    from_ts: int = Field(alias="from")
    to_ts: int = Field(alias="to")
    tmzutc: int = Field(..., description="Timezone offset from UTC in minutes")

    model_config = ConfigDict(populate_by_name=True)


class CoreVitalRequest(TimeRangeRequest):
    pass


class CoreVitalResponse(BaseModel):
    core: Dict[str, float]
    chart: Dict[str, List[List[float]]]


class CoreVitalApiResponse(CoreVitalResponse):
    code: int = 200


class VitalListRequest(TimeRangeRequest):
    pass


class VitalListItem(BaseModel):
    reqUrl: str
    mxPageId: str
    count: int
    loadingAvg: float
    lcp: Optional[float] = None
    fcp: Optional[float] = None
    inp: Optional[float] = None
    cls: Optional[float] = None


class VitalListResponse(BaseModel):
    code: int = 200
    list: List[VitalListItem]


class ApiHitmapRequest(TimeRangeRequest):
    type: str
    interval: int
    durationStep: Optional[int] = None


class HitmapResponse(BaseModel):
    datas: List[List[float]]
    maxCount: int
    maxDuration: int
    minTime: int
    maxTime: int
    durationStep: int


class HitmapApiResponse(HitmapResponse):
    code: int = 200


class LogListByTimeRequest(TimeRangeRequest):
    type: str
    durationFrom: Optional[int] = None
    durationTo: Optional[int] = None


class LogListItem(BaseModel):
    reqUrl: str
    durationAvg: float
    count: int
    errorCount: Optional[int] = 0
    mxPageId: Optional[str] = None
    docId: Optional[str] = None


class LogListResponse(BaseModel):
    code: int = 200
    list: List[LogListItem]


class PageLogDetailRequest(TimeRangeRequest):
    mxPageId: Optional[str] = None
    reqUrl: Optional[str] = None


class PageLogSummary(BaseModel):
    title: str
    alias: Optional[str] = None
    reqUrl: str
    count: int
    averageLoading: Optional[float] = None
    deviceName: Optional[str] = None
    appVersion: Optional[str] = None
    osVersion: Optional[str] = None
    networkType: Optional[str] = None
    simOperator: Optional[str] = None
    logType: Optional[str] = None
    userId: Optional[str] = None


class PageLogDetailItem(BaseModel):
    id: str
    loadingTime: float
    feeldex: Optional[float] = None
    deviceId: Optional[str] = None
    userId: Optional[str] = None
    timestamp: int
    networkStatus: Optional[str] = None
    lcp: Optional[float] = None
    fcp: Optional[float] = None
    inp: Optional[float] = None
    cls: Optional[float] = None
    wtfFlag: Optional[bool] = None


class PageLogVitalEntry(BaseModel):
    metric: str
    value: float
    unit: str
    status: str


class PageLogWaterfallEntry(BaseModel):
    name: str
    start: float
    duration: float


class PageLogTimelineEntry(BaseModel):
    label: str
    timestamp: int
    detail: str


class PageLogDetailPayload(BaseModel):
    summary: PageLogSummary
    list: List[PageLogDetailItem]
    vitals: List[PageLogVitalEntry]
    waterfall: List[PageLogWaterfallEntry]
    timeline: List[PageLogTimelineEntry]


class PageLogDetailResponse(PageLogDetailPayload):
    code: int = 200


class ApiErrorChartRequest(TimeRangeRequest):
    pass


class ApiErrorChartResponse(BaseModel):
    status_3xx: List[List[int]] = Field(default_factory=list, alias="3xx")
    status_4xx: List[List[int]] = Field(default_factory=list, alias="4xx")
    status_5xx: List[List[int]] = Field(default_factory=list, alias="5xx")

    model_config = ConfigDict(populate_by_name=True)


class ApiErrorChartApiResponse(ApiErrorChartResponse):
    code: int = 200


class ApiErrorListRequest(TimeRangeRequest):
    pass


class ApiErrorListItem(BaseModel):
    reqUrl: str
    count: int
    statusCode: int
    ratio: float


class ApiErrorListResponse(BaseModel):
    code: int = 200
    list: List[ApiErrorListItem]
