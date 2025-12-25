
from pydantic import BaseModel
from typing import Any

class AppListRequest(BaseModel):
    userNo: int
    osType: str
    
class AppListResponse(BaseModel):
    code: int = 200
    applicationList: list[dict[str, Any]]
    message: str = "Success"


class BIInfomationsRequest(BaseModel):
    applicationId: int
    osType: str
    tmzutc: int
    
class BIInfomationsResponse(BaseModel):
    code: int = 200
    biInfomations: list[dict[str, Any]]
    message: str = "Success"
    

class DefaultResponse(BaseModel):
    code: int = 200
    message: str | None = None   
    
class LoginRequest(BaseModel):
    userId: str = "UserID"
    password: str = "Password"
    timezone: str | None = None
    
    
class LoginResponse(BaseModel):
    code: int = 200
    # language: str = "ko"
    # level: int = 0
    # projectId: int = 0
    message: str = "Success"
    
class OTPLoginRequest(BaseModel):
    otp: str = "OTP"
    timezone: str | None = None
    
class OTPLoginResponse(BaseModel):
    code: int = 200
    userNo: int
    userId: str
    language: str
    level: int
    projectId: int
    applicationId: int
    widgetIds: list[int]
    message: str | None = None


class UpdateUserInfoRequest(BaseModel):
    userNo: int
    widgets: list[int]


class UpdateUserInfoResponse(BaseModel):
    code: int = 200
    userNo: int
    widgets: list[int]
    message: str | None = "Success"
    

    
