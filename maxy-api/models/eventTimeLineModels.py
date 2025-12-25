"""Pydantic models for the Event Time Line API.

Used by maxy-admin Performance popup when the selected logType is native.
"""

from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field, ConfigDict, validator


class EventTimeLineRequest(BaseModel):
    """Request payload for retrieving native event timeline logs."""

    applicationId: str = Field(..., alias="packageNm", description="애플리케이션 ID 혹은 패키지명")
    serverType: Optional[int] = Field(None, description="서버 타입 (선택)")
    deviceId: str = Field(..., description="장치 식별자")
    mxPageId: Optional[str] = Field(None, description="MX 페이지 ID (선택)")
    from_ts: int = Field(..., alias="from", description="Start timestamp (ms)")
    to_ts: int = Field(..., alias="to", description="End timestamp (ms)")
    limit: int = Field(800, ge=1, le=5000, description="최대 조회 건수")

    model_config = ConfigDict(populate_by_name=True)

    @validator("applicationId", pre=True)
    def _stringify_application_id(cls, value: object) -> str:  # noqa: N805
        if value is None:
            raise ValueError("applicationId/packageNm is required")
        return str(value)

    @validator("limit", pre=True, always=True)
    def _clamp_limit(cls, value: Optional[int]) -> int:  # noqa: N805
        if value is None:
            return 800
        return max(1, min(int(value), 5000))


class EventTimeLineLog(BaseModel):
    logType: int
    logTm: int
    intervaltime: int = 0
    aliasValue: str = ""
    resMsg: str = ""


class EventTimeLineResponse(BaseModel):
    code: int = 200
    message: str = "Success"
    logList: List[EventTimeLineLog]

