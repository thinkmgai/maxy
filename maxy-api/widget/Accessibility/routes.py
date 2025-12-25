"""FastAPI routes for the Accessibility dashboard widget."""

from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, Field, ConfigDict, root_validator, validator

from apiserver import app
from playload.accessibilityPayload import AccessibilityConfig, build_accessibility_series


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


class AccessibilitySeriesRequest(BaseModel):
    """Request payload for the Accessibility widget."""

    applicationId: str = Field(
        ..., alias="packageNm", min_length=1, max_length=128, description="패키지 이름"
    )
    osType: Optional[str] = Field(None, description="OS 타입 (Android, iOS 등)")
    dateType: Literal["DAY", "WEEK", "MONTH"] = Field(
        "DAY", description="집계 구간 (DAY, WEEK, MONTH)"
    )
    tmzutc: int = Field(
        ...,
        ge=-12 * 60,
        le=14 * 60,
        description="조회 기준 타임존의 UTC 오프셋(분, 예: 한국 +9시는 540)",
    )

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


class AccessibilityPoint(BaseModel):
    key: int
    value: int


class AccessibilityTotals(BaseModel):
    login: int
    noLogin: int
    dau: int


class AccessibilitySeriesResult(BaseModel):
    login: List[AccessibilityPoint]
    noLogin: List[AccessibilityPoint]
    dau: List[AccessibilityPoint]
    dauAvg: int
    totals: AccessibilityTotals
    lastUpdated: int
    dateType: Literal["DAY", "WEEK", "MONTH"]


class AccessibilitySeriesResponse(BaseModel):
    code: int = 200
    message: str = "Success"
    result: AccessibilitySeriesResult


@app.post(
    "/widget/Accessibility/Series",
    response_model=AccessibilitySeriesResponse,
    summary="[위젯] Accessibility 시계열 데이터",
)
async def get_accessibility_series(
    request: AccessibilitySeriesRequest,
) -> AccessibilitySeriesResponse:
    """
    [위젯] Accessibility 위젯에서 사용하는 로그인/비로그인/DAU 시계열 데이터를 반환합니다.

    Args:
        request (AccessibilitySeriesRequest): AccessibilitySeriesRequest

        {
            "applicationId": "string",
            "osType": "string",
            "dateType": "DAY",
            "tmzutc": 540
        }

        - tmzutc (필수): 조회 기준 타임존의 UTC 오프셋(분). 예) 한국(+9)은 540, 뉴욕(-5)은 -300

    Returns:
        AccessibilitySeriesResponse: AccessibilitySeriesResponse

        {
            "code": 200,
            "message": "Success",
            "result": {
                "login": [{"key": 0, "value": 0}],
                "noLogin": [{"key": 0, "value": 0}],
                "dau": [{"key": 0, "value": 0}],
                "dauAvg": 0,
                "totals": {"login": 0, "noLogin": 0, "dau": 0},
                "lastUpdated": 0,
                "dateType": "DAY"
            }
        }
    """

    dataset = build_accessibility_series(
        AccessibilityConfig(
            application_id=request.applicationId,
            os_type=request.osType,
            date_type=request.dateType,
            tmzutc=request.tmzutc,
        )
    )

    result = AccessibilitySeriesResult(
        login=[AccessibilityPoint(**point) for point in dataset["login"]],
        noLogin=[AccessibilityPoint(**point) for point in dataset["noLogin"]],
        dau=[AccessibilityPoint(**point) for point in dataset["dau"]],
        dauAvg=dataset.get("dauAvg", 0),
        totals=AccessibilityTotals(**dataset.get("totals", {"login": 0, "noLogin": 0, "dau": 0})),
        lastUpdated=dataset.get("lastUpdated", 0),
        dateType=_normalise_date_type(dataset.get("dateType", request.dateType)),
    )

    return AccessibilitySeriesResponse(result=result)
