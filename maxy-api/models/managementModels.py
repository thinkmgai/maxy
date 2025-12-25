"""Pydantic models for the Management (관리) endpoints."""

from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


class ManagementMenuRequest(BaseModel):
    """Optional payload for filtering the 관리 좌측 메뉴."""

    user_id: Optional[str] = None
    lang: Optional[str] = None
    level: Optional[int] = None


class ManagementMenuItem(BaseModel):
    """Single menu leaf in the 관리 좌측 메뉴."""

    label: str
    menuId: int
    status: int = Field(default=1, description="1: 활성화, 0: 비활성화")
    route: Optional[str] = None


class ManagementMenuSection(BaseModel):
    """Top-level menu section which can contain nested items."""

    label: str
    items: List[ManagementMenuItem] = Field(default_factory=list)


class ManagementMenuResponse(BaseModel):
    """Response wrapper for the 좌측 메뉴 구성."""

    code: int = 200
    menu: List[ManagementMenuSection]
    message: str = "Success"


class ManagementUser(BaseModel):
    """관리 사용자 단일 항목."""

    userNo: int
    userId: str
    userName: str
    email: str
    level: int = Field(default=0, description="100: 수퍼관리자, 1: 관리자, 0: 일반 사용자")
    status: int = Field(default=1, description="1: 활성화, 0: 비활성화")
    createdAt: str
    updatedAt: str
    expiredAt: str
    groups: List["ManagementUserGroup"] = Field(default_factory=list)


class ManagementUserListRequest(BaseModel):
    """사용자 리스트 조회 요청."""

    keyword: Optional[str] = Field(default=None, description="userId, userName 검색 키워드")
    status: Optional[int] = Field(default=None, description="필터링할 상태 (1: 활성화, 0: 비활성화)")


class ManagementUserListResponse(BaseModel):
    code: int = 200
    users: List[ManagementUser]
    totalCount: int
    message: str = "Success"


class ManagementUserCreateRequest(BaseModel):
    userId: str
    userName: str
    email: str
    level: int = Field(default=0, description="100: 수퍼관리자, 1: 관리자, 0: 일반 사용자")
    status: int = Field(default=1, description="1: 활성화, 0: 비활성화")
    password: str


class ManagementUserUpdateRequest(BaseModel):
    userNo: int
    userName: Optional[str] = None
    email: Optional[str] = None
    level: Optional[int] = None
    status: Optional[int] = None


class ManagementUserDeleteRequest(BaseModel):
    userNos: List[int]


class ManagementUserMutationResponse(BaseModel):
    code: int = 200
    user: Optional[ManagementUser] = None
    affected: Optional[int] = None
    message: str = "Success"


class ManagementGroup(BaseModel):
    group: int
    groupName: str
    groupDescription: str = ""


class ManagementGroupDetail(BaseModel):
    group: int
    groupName: str
    groupDescription: str = ""
    userNos: List[int]
    applicationIds: List[int]


class ManagementGroupListRequest(BaseModel):
    keyword: Optional[str] = None
    applicationId: Optional[int] = None


class ManagementGroupListResponse(BaseModel):
    code: int = 200
    groups: List[ManagementGroup]
    totalCount: int
    message: str = "Success"


class ManagementGroupDetailRequest(BaseModel):
    group: int


class ManagementGroupDetailResponse(BaseModel):
    code: int = 200
    detail: Optional[ManagementGroupDetail] = None
    message: str = "Success"


class ManagementGroupCreateRequest(BaseModel):
    groupName: str
    groupDescription: Optional[str] = ""
    userNos: List[int]
    applicationIds: List[int]


class ManagementGroupUpdateRequest(BaseModel):
    group: int
    groupName: Optional[str] = None
    groupDescription: Optional[str] = None
    userNos: Optional[List[int]] = None
    applicationIds: Optional[List[int]] = None


class ManagementGroupDeleteRequest(BaseModel):
    groups: List[int]


class ManagementGroupMutationResponse(BaseModel):
    code: int = 200
    group: Optional[ManagementGroup] = None
    affected: Optional[int] = None
    message: str = "Success"


class AppSetting(BaseModel):
    applicationId: int
    appName: str
    packageId: str
    serverType: str = "0"
    fullMsg: bool = True
    pageLogPeriod: int
    loggingRate: float
    order: int


class AppSettingListResponse(BaseModel):
    code: int = 200
    appSettings: List[AppSetting]
    message: str = "Success"


class AppSettingCreateRequest(BaseModel):
    applicationId: Optional[int] = None
    appName: str
    packageId: str
    serverType: str = "0"
    fullMsg: bool = True
    pageLogPeriod: int = 7
    loggingRate: float = 1.0
    order: int = 1


class AppSettingUpdateRequest(BaseModel):
    applicationId: int
    appName: Optional[str] = None
    packageId: Optional[str] = None
    serverType: Optional[str] = None
    fullMsg: Optional[bool] = None
    pageLogPeriod: Optional[int] = None
    loggingRate: Optional[float] = None
    order: Optional[int] = None


class AppSettingDeleteRequest(BaseModel):
    applicationIds: List[int]


class AppSettingMutationResponse(BaseModel):
    code: int = 200
    appSetting: Optional[AppSetting] = None
    affected: Optional[int] = None
    message: str = "Success"


class ManagementUserGroupApplication(BaseModel):
    applicationId: int
    appName: str


class ManagementUserGroup(BaseModel):
    group: int
    groupName: str
    applications: List[ManagementUserGroupApplication] = Field(default_factory=list)
