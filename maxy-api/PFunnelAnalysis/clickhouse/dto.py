from pydantic import BaseModel
from typing import Optional


class FunnelQuery(BaseModel):
    start_date: str
    end_date: str
    application_id: Optional[int] = None
    limit: int = 100


class FunnelRow(BaseModel):
    step: str
    users: int
    conversion_rate: float


class DiscoverGroupMetrics(BaseModel):
    findCount: int
    totalCount: int
    rate: float
