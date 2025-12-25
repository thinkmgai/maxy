from datetime import date

from pydantic import BaseModel, Field
from typing import Any


class BIDetailCCURequest(BaseModel):
    applicationId: int
    startDate: str

class BIDetailRequest(BaseModel):
    applicationId: int
    startDate: str
    endDate: str
    selectedDate: str | None = None
    
class BIDetailResponse(BaseModel):
    code: int = 200
    dailyAndroid: list[dict[str, Any]]
    dailyIOS: list[dict[str, Any]]
    selectedAndroid: dict[str, Any] | None = None
    selectedIOS: dict[str, Any] | None = None
    message: str | None = None
    
    

class BIDetailTop10Request(BaseModel):
    applicationId: int
    startDate: str
    endDate: str | None = None
    osType: str = "all"

class BIDetailTop10Response(BaseModel):
    code: int = 200
    androidTop10: list[dict[str, Any]] | None = None
    iosTop10: list[dict[str, Any]] | None = None
    message: str | None = None
