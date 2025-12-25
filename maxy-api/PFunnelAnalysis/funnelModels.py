from __future__ import annotations

from typing import Dict, List, Optional, Any

from pydantic import BaseModel, Field


class FunnelListRequest(BaseModel):
    """ 퍼널 목록 요청 """
    applicationId: int
    userId: str
    type: int
    

class FunnelListResponse(BaseModel):
    """ 퍼널 목록 응답 """
    code: int = 200
    list: List[Dict[str, Any]]


class FunnelDetailRequest(BaseModel):
    """ 퍼널 상세 요청 """
    id: int
    group: str
    period: Dict[str, Any]
    route: Optional[int] = Field(default=None)

class FunnelDetailResponse(BaseModel):
    """ 퍼널 상세 응답 """
    code: int = 200
    list: List[Dict[str, Any]]


class FunnelAddEditRequest(BaseModel):
    """ 퍼널 등록/수정 요청 """
    id: int
    name: str
    period: Dict[str, Any] 
    route: int
    group: List[Dict[str, Any]]
    step: List[Dict[str, Any]]
    chart: int
    userId: str

class FunnelAddEditResponse(BaseModel):
    """ 퍼널 등록/수정 응답 """
    code: int = 200
    msg: str = "success"


class FunnelListChangeOrderRequest(BaseModel):
    """ 퍼널 순서 변경 요청 """
    orgId: int
    orgOrder: int
    destId: int
    destOrder: int
    

class FunnelListChangeOrderResponse(BaseModel):
    """ 퍼널 순서 변경 응답 """
    code: int = 200
    msg: str = "success"

class FunnelDeleteRequest(BaseModel):
    """ 퍼널 삭제 요청 """
    id: int  

class FunnelDeleteResponse(BaseModel):
    """ 퍼널 삭제 응답 """
    code: int = 200
    msg: str = "success"

class GroupAddEditRequest(BaseModel):
    """ 그룹 등록/수정 요청 """
    id: int
    name: str
    description: str
    condition: List[Dict[str, Any]]
    userId: str
    
class GroupAddEditResponse(BaseModel):
    """ 그룹 등록/수정 응답 """
    code: int = 200
    msg: str = "success"

class GroupDeleteRequest(BaseModel):
    """ 그룹 삭제 요청 """
    id: int

class GroupDeleteResponse(BaseModel):
    """ 그룹 삭제 응답 """
    code: int = 200
    msg: str = "success"

class GroupListRequest(BaseModel):
    """ 그룹 목록 요청 """
    userId: str
    
class GroupListResponse(BaseModel):
    """ 그룹 목록 응답 """
    code: int = 200
    list: List[Dict[str, Any]]


class ConditionSubItem(BaseModel):
    order: int
    id: int
    name: str
    default: Optional[List[Any]] = Field(default_factory=list)


class ConditionCategory(BaseModel):
    order: int
    id: int
    name: str
    enable_step: Optional[bool] = None
    sub: List[ConditionSubItem] = Field(default_factory=list)


class ConditionCatalog(BaseModel):
    event: Optional[ConditionCategory] = None
    standard: List[ConditionCategory] = Field(default_factory=list)


class ConditionCatalogRequest(BaseModel):
    userId: str


class ConditionCatalogResponse(BaseModel):
    code: int = 200
    data: ConditionCatalog
    message: Optional[str] = None


class FilterOption(BaseModel):
    order: int
    id: int
    name: str


class FilterCatalog(BaseModel):
    options: List[FilterOption] = Field(default_factory=list)


class FilterCatalogRequest(BaseModel):
    userId: str


class FilterCatalogResponse(BaseModel):
    code: int = 200
    data: FilterCatalog
    message: Optional[str] = None

class DiscoverGroupRequest(BaseModel):
    """ 발견(그룹) 요청 """
    userId: str
    condition: List[Dict[str, Any]] = Field(default_factory=list)
    period: Optional[Dict[str, Any]] = None
    
class DiscoverGroupResponse(BaseModel):
    """ 발견(그룹) 응답 """
    code: int = 200
    data: Dict[str, Any]

class DiscoverStepRequest(BaseModel):
    """ 발견(단계) 요청 """
    userId: str
    condition: List[Dict[str, Any]] = Field(default_factory=list)
    period: Optional[Dict[str, Any]] = None
    
class DiscoverStepResponse(BaseModel):
    """ 발견(단계) 응답 """
    code: int = 200
    data: Dict[str, Any]
