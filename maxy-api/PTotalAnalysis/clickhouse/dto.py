from typing import Optional
from pydantic import BaseModel


class TotalQuery(BaseModel):
    start_date: str
    end_date: str
    application_id: Optional[int] = None
    limit: int = 200


class TotalRow(BaseModel):
    date: str
    pv: int
    uv: int
    error_rate: float


class InstallSeriesQuery(BaseModel):
    start_date: str
    end_date: str
    package_nm: str
    server_type: int


class InstallSeriesRow(BaseModel):
    date: str
    os_type: str
    install: int


class MetricSeriesQuery(BaseModel):
    start_date: str
    end_date: str
    package_nm: str
    server_type: int


class MetricSeriesRow(BaseModel):
    date: str
    os_type: str
    install: int
    login: int
    dau: int
    revisit_7d: int
    mau: int
    pv: int
    intervaltime_avg: float
    log_count: int
    error_count: int
    js_error_count: int
    crash_count: int


class MauMonthlyQuery(BaseModel):
    start_date: str
    end_date: str
    package_nm: str
    server_type: int


class MauMonthlyRow(BaseModel):
    date: str
    os_type: str
    mau: int
