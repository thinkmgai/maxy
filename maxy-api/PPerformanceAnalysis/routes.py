from __future__ import annotations

from fastapi import HTTPException

from apiserver import app
from models.performanceModels import (
    ApiErrorChartApiResponse,
    ApiErrorChartRequest,
    ApiErrorListRequest,
    ApiErrorListResponse,
    ApiHitmapRequest,
    CoreVitalApiResponse,
    CoreVitalRequest,
    HitmapApiResponse,
    LogListByTimeRequest,
    LogListResponse,
    PageLogDetailRequest,
    PageLogDetailResponse,
    VitalListRequest,
    VitalListResponse,
)
from playload import performancePayload


@app.post(
    "/PPerformanceAnalysis/CoreVital",
    response_model=CoreVitalApiResponse,
    summary="[PerformanceAnalysis] CoreVital 통계",
)
async def PPerformanceAnalysisCoreVital(request: CoreVitalRequest) -> CoreVitalApiResponse:
    """ CoreVital 통계정보를 가져온다.

    Args:
        request (CoreVitalRequest): CoreVitalRequest
        
        {
            "from_ts": "from timestamp",
            "to_ts": "to timestamp",
            "os_type": "OS type",
            "app_id": "Application ID",
            "tmzutc": 540
        }

        - tmzutc (필수): 조회 기준 타임존의 UTC 오프셋(분). 예) 한국(+9)은 540, 뉴욕(-5)은 -300

    Raises:
        HTTPException: from이 to보다 이전이어야 한다.

    Returns:
        CoreVitalApiResponse: CoreVitalApiResponse
        
        {
            "code": "code",
            "core": "core",
            "chart": "chart"
        }
    """
    if request.from_ts >= request.to_ts:
        raise HTTPException(status_code=400, detail="`from` must be earlier than `to`.")
    payload = performancePayload.build_core_vital_response(request)
    return CoreVitalApiResponse(code=200, core=payload.core, chart=payload.chart)


@app.post(
    "/PPerformanceAnalysis/VitalList",
    response_model=VitalListResponse,
    summary="[PerformanceAnalysis] VitalList",
)
async def PPerformanceAnalysisVitalList(request: VitalListRequest) -> VitalListResponse:
    """ VitalList를 가져온다.

    Args:
        request (VitalListRequest): VitalListRequest
        
        {
            "from_ts": "from timestamp",
            "to_ts": "to timestamp",
            "os_type": "OS type",
            "app_id": "Application ID",
            "tmzutc": 540
        }

        - tmzutc (필수): 조회 기준 타임존의 UTC 오프셋(분). 예) 한국(+9)은 540, 뉴욕(-5)은 -300

    Raises:
        HTTPException: from이 to보다 이전이어야 한다.

    Returns:
        VitalListResponse: VitalListResponse
        
        {
            "code": "code",
            "core": "core",
            "chart": "chart"
        }
    """
    if request.from_ts >= request.to_ts:
        raise HTTPException(status_code=400, detail="`from` must be earlier than `to`.")
    return performancePayload.build_vital_list_response(request)


@app.post(
    "/PPerformanceAnalysis/Hitmap",
    response_model=HitmapApiResponse,
    summary="[PerformanceAnalysis] Heatmap dataset",
)
async def PPerformanceAnalysisHitmap(request: ApiHitmapRequest) -> HitmapApiResponse:
    """ Heatmap dataset을 가져온다.

    Args:
        request (ApiHitmapRequest): ApiHitmapRequest
        
        {
            "from_ts": "from timestamp",
            "to_ts": "to timestamp",
            "os_type": "OS type",
            "app_id": "Application ID",
            "tmzutc": 540
        }

        - tmzutc (필수): 조회 기준 타임존의 UTC 오프셋(분). 예) 한국(+9)은 540, 뉴욕(-5)은 -300

    Raises:
        HTTPException: from이 to보다 이전이어야 한다.

    Returns:
        HitmapApiResponse: HitmapApiResponse
        
        {
            "code": "code",
            "core": "core",
            "chart": "chart"
        }
    """
    if request.from_ts >= request.to_ts:
        raise HTTPException(status_code=400, detail="`from` must be earlier than `to`.")
    return performancePayload.build_hitmap_response(request)


@app.post(
    "/PPerformanceAnalysis/LogListByTime",
    response_model=LogListResponse,
    summary="[PerformanceAnalysis] LogListByTime Aggregated log list filtered by time window",
)
async def PPerformanceAnalysisLogListByTime(request: LogListByTimeRequest) -> LogListResponse:
    """ Aggregated log list filtered by time window를 가져온다.

    Args:
        request (LogListByTimeRequest): LogListByTimeRequest
        
        {
            "from_ts": "from timestamp",
            "to_ts": "to timestamp",
            "os_type": "OS type",
            "app_id": "Application ID",
            "tmzutc": 540
        }

        - tmzutc (필수): 조회 기준 타임존의 UTC 오프셋(분). 예) 한국(+9)은 540, 뉴욕(-5)은 -300

    Raises:
        HTTPException: from이 to보다 이전이어야 한다.

    Returns:
        LogListResponse: LogListResponse
        
        {
            "code": "code",
            "core": "core",
            "chart": "chart"
        }
    """
    if request.from_ts >= request.to_ts:
        raise HTTPException(status_code=400, detail="`from` must be earlier than `to`.")
    return performancePayload.build_log_list_response(request)


@app.post(
    "/PPerformanceAnalysis/PageLogDetail",
    response_model=PageLogDetailResponse,
    summary="[PerformanceAnalysis] Detailed page log entries and related diagnostics",
)
async def PPerformanceAnalysisPageLogDetail(request: PageLogDetailRequest) -> PageLogDetailResponse:
    """ Detailed page log entries and related diagnostics를 가져온다.

    Args:
        request (PageLogDetailRequest): PageLogDetailRequest
        
        {
            "from_ts": "from timestamp",
            "to_ts": "to timestamp",
            "os_type": "OS type",
            "app_id": "Application ID",
            "tmzutc": 540
        }

        - tmzutc (필수): 조회 기준 타임존의 UTC 오프셋(분). 예) 한국(+9)은 540, 뉴욕(-5)은 -300

    Raises:
        HTTPException: from이 to보다 이전이어야 한다.

    Returns:
        PageLogDetailResponse: PageLogDetailResponse
        
        {
            "code": "code",
            "core": "core",
            "chart": "chart"
        }
    """
    if request.from_ts >= request.to_ts:
        raise HTTPException(status_code=400, detail="`from` must be earlier than `to`.")
    return performancePayload.build_page_log_detail_response(request)


@app.post(
    "/PPerformanceAnalysis/ApiErrorChart",
    response_model=ApiErrorChartApiResponse,
    summary="[PerformanceAnalysis] API error chart data",
)
async def PPerformanceAnalysisApiErrorChart(request: ApiErrorChartRequest) -> ApiErrorChartApiResponse:
    """ API error chart data를 가져온다.

    Args:
        request (ApiErrorChartRequest): ApiErrorChartRequest
        
        {
            "from_ts": "from timestamp",
            "to_ts": "to timestamp",
            "os_type": "OS type",
            "app_id": "Application ID",
            "tmzutc": 540
        }

        - tmzutc (필수): 조회 기준 타임존의 UTC 오프셋(분). 예) 한국(+9)은 540, 뉴욕(-5)은 -300

    Raises:
        HTTPException: from이 to보다 이전이어야 한다.

    Returns:
        ApiErrorChartApiResponse: ApiErrorChartApiResponse
        
        {
            "code": "code",
            "core": "core",
            "chart": "chart"
        }
    """
    if request.from_ts >= request.to_ts:
        raise HTTPException(status_code=400, detail="`from` must be earlier than `to`.")
    return performancePayload.build_api_error_chart_response(request)


@app.post(
    "/PPerformanceAnalysis/ApiErrorList",
    response_model=ApiErrorListResponse,
    summary="[PerformanceAnalysis] API error table dataset",
)
async def PPerformanceAnalysisApiErrorList(request: ApiErrorListRequest) -> ApiErrorListResponse:
    """ API error table dataset을 가져온다.

    Args:
        request (ApiErrorListRequest): ApiErrorListRequest
        
        {
            "from_ts": "from timestamp",
            "to_ts": "to timestamp",
            "os_type": "OS type",
            "app_id": "Application ID",
            "tmzutc": 540
        }

        - tmzutc (필수): 조회 기준 타임존의 UTC 오프셋(분). 예) 한국(+9)은 540, 뉴욕(-5)은 -300

    Raises:
        HTTPException: from이 to보다 이전이어야 한다.

    Returns:
        ApiErrorListResponse: ApiErrorListResponse
        
        {
            "code": "code",
            "core": "core",
            "chart": "chart"
        }
    """
    if request.from_ts >= request.to_ts:
        raise HTTPException(status_code=400, detail="`from` must be earlier than `to`.")
    return performancePayload.build_api_error_list_response(request)
