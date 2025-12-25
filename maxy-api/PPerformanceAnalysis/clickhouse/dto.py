from pydantic import BaseModel
from typing import Optional


class PerformanceQuery(BaseModel):
    start_date: str
    end_date: str
    application_id: Optional[int] = None
    limit: int = 200


class PerformanceRow(BaseModel):
    metric: str
    avg_value: float
    p95_value: float
