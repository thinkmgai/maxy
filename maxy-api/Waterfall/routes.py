"""FastAPI routes for the Waterfall diagnostics API."""

from __future__ import annotations

from fastapi import HTTPException

from apiserver import app
from models.eventTimeLineModels import EventTimeLineRequest, EventTimeLineResponse
from models.waterfallModels import WaterfallDetailRequest, WaterfallDetailResponse
from Waterfall.event_time_line import build_event_time_line_response
from Waterfall.service import build_waterfall_detail_response


@app.post(
    "/Waterfall/Detail",
    response_model=WaterfallDetailResponse,
    summary="[Waterfall] 페이지 로딩 Waterfall 정보",
)
async def get_waterfall_detail(request: WaterfallDetailRequest) -> WaterfallDetailResponse:
    """Return synthetic yet deterministic waterfall diagnostics for a page view.

    Args:
        request (WaterfallDetailRequest): WaterfallDetailRequest
        
        {
            "applicationId": "com.maxy.app",
            "deviceId": "device_id",
            "osType": "Android",
            "reqUrl": "https://example.com",
            "mxPageId": "mx_page_id",
            "logTm": 1633072800000,
            "pageStartTm": 1633072800000,
            "pageEndTm": 1633072800000,
            "limit": 60
        }

    Raises:
        HTTPException: pageStartTm must be earlier than pageEndTm

    Returns:
        WaterfallDetailResponse: WaterfallDetailResponse
        
        {
            "code": 200,
            "message": "Success",
            "resourceInfoData": [
                {
                    "id": "resource_id",
                    "name": "resource_name",
                    "entryType": "resource_entry_type",
                    "initiatorType": "resource_initiator_type",
                    "startTime": 1633072800000,
                    "duration": 1633072800000,
                    "transferSize": 1633072800000,
                    "encodedBodySize": 1633072800000,
                    "decodedBodySize": 1633072800000,
                    "status": 200,
                    "domain": "resource_domain",
                    "resourceType": "resource_resource_type",
                    "sizeLabel": "resource_size_label",
                    "timelineLabel": "resource_timeline_label",
                    "markers": ["marker_1", "marker_2"]
                }
            ],
            "performanceData": {
                "resource": [
                    {
                        "label": "resource_label",
                        "start": 1633072800000,
                        "duration": 1633072800000
                    }
                ],
                "longTask": [
                    {
                        "label": "long_task_label",
                        "start": 1633072800000,
                        "duration": 1633072800000
                    }
                ],
                "clickAction": [
                    {
                        "label": "click_action_label",
                        "start": 1633072800000,
                        "duration": 1633072800000
                    }
                ]
            },
            "timingData": [
                {
                    "key": "timing_key",
                    "label": "timing_label",
                    "value": 1633072800000,
                    "unit": "timing_unit"
                }
            ],
            "errorData": [
                {
                    "id": "error_id",
                    "logTm": 1633072800000,
                    "waterfallTm": 1633072800000,
                    "name": "error_name",
                    "message": "error_message",
                    "status": 200,
                    "initiatorType": "error_initiator_type"
                }
            ]
        }
    """

    if (
        request.pageStartTm is not None
        and request.pageEndTm is not None
        and request.pageStartTm > request.pageEndTm
    ):
        raise HTTPException(status_code=400, detail="pageStartTm must be earlier than pageEndTm")

    return build_waterfall_detail_response(request)


@app.post(
    "/Waterfall/EventTimeLine",
    response_model=EventTimeLineResponse,
    summary="[Waterfall] Native Event Time Line logs",
)
async def get_event_time_line(request: EventTimeLineRequest) -> EventTimeLineResponse:
    """Return native event timeline logList for the given page window."""

    return build_event_time_line_response(request)
