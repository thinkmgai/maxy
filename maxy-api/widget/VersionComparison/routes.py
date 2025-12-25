"""FastAPI routes for the Version Comparison dashboard widget."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import List, Optional, Tuple
import random

from pydantic import BaseModel, Field, ConfigDict, root_validator, validator

from apiserver import app
from playload.versionComparisonPayload import (
    VersionComparisonAllConfig,
    VersionComparisonConfig,
    VersionComparisonDataset,
    VersionComparisonEntry,
    VersionComparisonRowConfig,
    build_version_comparison_all_list,
    build_version_comparison_dataset,
    build_version_comparison_row_series,
)


def _yesterday_string() -> str:
    return (datetime.utcnow() - timedelta(days=1)).strftime("%Y%m%d")


def _generate_fallback_version(seed: Tuple[str, int]) -> Tuple[str, str]:
    application_id, index = seed
    rng = random.Random(hash((application_id, index, "version-comparison")))

    os_candidates = ["Android", "iOS", "HarmonyOS"]
    os_type = os_candidates[index % len(os_candidates)]
    if rng.random() > 0.65:
        os_type = rng.choice(os_candidates)

    major = rng.randint(3, 7)
    minor = rng.randint(0, 9)
    patch = rng.randint(0, 9)

    return os_type, f"{major}.{minor}.{patch}"


def _normalise_date_type(value: Optional[str]) -> str:
    if not value:
        return "DAY"
    upper = value.upper()
    if upper not in {"DAY", "WEEK", "MONTH"}:
        return "DAY"
    return upper


class VersionComparisonRequest(BaseModel):
    """Request payload for the Version Comparison widget."""

    applicationId: str = Field(..., min_length=1, max_length=128, description="앱 ID")
    accessDate: Optional[str] = Field(
        None, min_length=8, max_length=8, description="조회 기준일 (YYYYMMDD)"
    )
    osType1: Optional[str] = Field(None, description="첫 번째 비교 OS")
    appVer1: Optional[str] = Field(None, description="첫 번째 비교 앱 버전")
    osType2: Optional[str] = Field(None, description="두 번째 비교 OS")
    appVer2: Optional[str] = Field(None, description="두 번째 비교 앱 버전")
    tmzutc: int = Field(..., description="조회 기준 타임존의 UTC 오프셋(분, 예: 한국 +9시는 540)")

    model_config = ConfigDict(populate_by_name=True)

    @root_validator(pre=True)
    def _merge_legacy_keys(cls, values: dict) -> dict:  # noqa: N805 (pydantic signature)
        legacy_mappings = [
            ("osType1", ["osTypeA", "optOsTypeA"]),
            ("appVer1", ["appVerA", "optAppVerA"]),
            ("osType2", ["osTypeB", "optOsTypeB"]),
            ("appVer2", ["appVerB", "optAppVerB"]),
        ]

        for target_key, legacy_keys in legacy_mappings:
            if values.get(target_key):
                continue
            for legacy_key in legacy_keys:
                if legacy_key in values and values[legacy_key]:
                    values[target_key] = values[legacy_key]
                    break

        if not values.get("accessDate"):
            for key in ("baseDate", "date"):
                if key in values and values[key]:
                    values["accessDate"] = values[key]
                    break

        return values

    @validator("accessDate")
    def _validate_access_date(cls, value: Optional[str]) -> Optional[str]:  # noqa: N805
        if value is None:
            return value
        if len(value) != 8 or not value.isdigit():
            raise ValueError("accessDate must be in YYYYMMDD format.")
        return value

    def resolved_access_date(self) -> str:
        return self.accessDate or _yesterday_string()

    def _resolve_version(self, first: bool) -> Tuple[str, str]:
        os_type = self.osType1 if first else self.osType2
        app_ver = self.appVer1 if first else self.appVer2

        if os_type and app_ver:
            return os_type, app_ver

        os_default, ver_default = _generate_fallback_version(
            (self.applicationId, 0 if first else 1)
        )

        return os_type or os_default, app_ver or ver_default

    def resolved_versions(self) -> Tuple[Tuple[str, str], Tuple[str, str]]:
        primary = self._resolve_version(first=True)
        secondary = self._resolve_version(first=False)

        if primary == secondary:
            alt_os, alt_ver = _generate_fallback_version((self.applicationId, 2))
            if alt_os == primary[0]:
                alt_os = "iOS" if primary[0] != "iOS" else "Android"
            if alt_ver == primary[1]:
                try:
                    major, minor, patch = (int(part) for part in primary[1].split("."))
                    alt_ver = f"{major}.{minor}.{(patch + 1) % 10}"
                except ValueError:
                    alt_ver = primary[1] + ".1"
            secondary = (alt_os, alt_ver)

        return primary, secondary


class VersionComparisonRow(BaseModel):
    applicationId: str
    osType: str
    appVer: str
    install: int
    dau: int
    error: int
    crash: int
    loadingTime: int
    responseTime: int

    @classmethod
    def from_entry(cls, entry: VersionComparisonEntry) -> "VersionComparisonRow":
        return cls(**entry.__dict__)


class VersionComparisonTotals(BaseModel):
    install: int
    dau: int
    error: int
    crash: int
    loadingTime: int
    responseTime: int

    @classmethod
    def from_dataset(cls, dataset: VersionComparisonDataset) -> "VersionComparisonTotals":
        return cls(**dataset.totals)


class VersionComparisonResponse(BaseModel):
    code: int = 200
    message: str = "Success"
    versionData: list[VersionComparisonRow]
    totalVersionData: VersionComparisonTotals


class VersionComparisonAllRequest(BaseModel):
    applicationId: str = Field(..., min_length=1, max_length=128)
    dateType: Optional[str] = Field("DAY", description="집계 구간 (DAY, WEEK, MONTH)")
    size: int = Field(8, ge=2, le=20, description="행 수")
    tmzutc: int = Field(..., description="조회 기준 타임존의 UTC 오프셋(분, 예: 한국 +9시는 540)")

    model_config = ConfigDict(populate_by_name=True)

    @validator("dateType", pre=True, always=True)
    def _normalise_dt(cls, value: Optional[str]) -> str:  # noqa: N805
        return _normalise_date_type(value)


class VersionComparisonAllItem(BaseModel):
    applicationId: str
    osType: str
    appVer: str
    install: int
    dau: int
    error: int
    crash: int
    loadingTime: int
    responseTime: int


class VersionComparisonAllResponse(BaseModel):
    code: int = 200
    message: str = "Success"
    allVersionData: List[VersionComparisonAllItem]


class VersionComparisonRowSeriesRequest(BaseModel):
    applicationId: str = Field(..., min_length=1, max_length=128)
    osType: str = Field(..., min_length=1, max_length=32)
    appVer: str = Field(..., min_length=1, max_length=32)
    dateType: Optional[str] = Field("DAY")
    tmzutc: int = Field(..., description="조회 기준 타임존의 UTC 오프셋(분, 예: 한국 +9시는 540)")

    model_config = ConfigDict(populate_by_name=True)

    @validator("dateType", pre=True, always=True)
    def _normalise_dt(cls, value: Optional[str]) -> str:  # noqa: N805
        return _normalise_date_type(value)


class VersionComparisonRowSeries(BaseModel):
    install: List[List[int]]
    dau: List[List[int]]
    error: List[List[int]]
    crash: List[List[int]]
    loadingTime: List[List[int]]
    responseTime: List[List[int]]


class VersionComparisonRowSeriesResponse(BaseModel):
    code: int = 200
    message: str = "Success"
    series: VersionComparisonRowSeries


@app.post(
    "/widget/VersionComparison/Data",
    response_model=VersionComparisonResponse,
    summary="[위젯] Version Comparison",
)
async def VersionComparisonData(request: VersionComparisonRequest) -> VersionComparisonResponse:
    """[위젯] Version Comparison 레이더 차트 컴포넌트의 데이터를 반환합니다.

    Args:
        request (VersionComparisonRequest): Version Comparison widget request
        
        {
            "applicationId": "com.maxy.app",
            "accessDate": "20250101",
            "osType1": "Android",
            "appVer1": "1.0.0",
            "osType2": "iOS",
            "appVer2": "1.0.0",
            "tmzutc": 540
        }

        - tmzutc (필수): 조회 기준 타임존의 UTC 오프셋(분). 예) 한국(+9)은 540, 뉴욕(-5)은 -300

    Returns:
        VersionComparisonResponse: Version Comparison widget response
        
        {
            "versionData": [
                {
                    "applicationId": "com.maxy.app",
                    "osType": "Android",
                    "appVer": "1.0.0",
                    "install": 100,
                    "dau": 100,
                    "error": 100,
                    "crash": 100,
                    "loadingTime": 100,
                    "responseTime": 100
                }
            ],
            "totalVersionData": {
                "install": 100,
                "dau": 100,
                "error": 100,
                "crash": 100,
                "loadingTime": 100,
                "responseTime": 100
            }
        }
    """
    
    primary, secondary = request.resolved_versions()

    dataset = build_version_comparison_dataset(
        VersionComparisonConfig(
            application_id=request.applicationId,
            access_date=request.resolved_access_date(),
            os_type_a=primary[0],
            app_ver_a=primary[1],
            os_type_b=secondary[0],
            app_ver_b=secondary[1],
            tmzutc=request.tmzutc,
        )
    )

    rows = [VersionComparisonRow.from_entry(entry) for entry in dataset.rows]
    totals = VersionComparisonTotals.from_dataset(dataset)

    return VersionComparisonResponse(versionData=rows, totalVersionData=totals)


@app.post(
    "/widget/VersionComparison/AllData",
    response_model=VersionComparisonAllResponse,
    summary="[위젯] Version Comparison ALL 리스트",
)
async def VersionComparisonAllData(
    request: VersionComparisonAllRequest,
) -> VersionComparisonAllResponse:
    """
    Version Comparison ALL 리스트버튼 클릭시.
    
    Args:
        request (VersionComparisonAllRequest): Version Comparison ALL widget request
        
        {
            "applicationId": "com.maxy.app",
            "dateType": "DAY",
            "size": 8,
            "tmzutc": 540
        }

        - tmzutc (필수): 조회 기준 타임존의 UTC 오프셋(분). 예) 한국(+9)은 540, 뉴욕(-5)은 -300

    Returns:
        VersionComparisonAllResponse: Version Comparison ALL widget response
        
        {
           "code": 200,
           "message": "Success",
           "allVersionData": [
               {
                   "applicationId": "com.maxy.app",
                   "osType": "Android",
                   "appVer": "1.0.0",
                   "install": 100,
                   "dau": 100,
                   "error": 100,
                   "crash": 100,
                   "loadingTime": 100,
                   "responseTime": 100
               }
           ]
       }
       
    """
    records = build_version_comparison_all_list(
        VersionComparisonAllConfig(
            application_id=request.applicationId,
            date_type=request.dateType,
            size=request.size,
            tmzutc=request.tmzutc,
        )
    )
    items = [VersionComparisonAllItem(**record) for record in records]
    return VersionComparisonAllResponse(code=200, message="Success", allVersionData=items)


@app.post(
    "/widget/VersionComparison/RowData",
    response_model=VersionComparisonRowSeriesResponse,
    summary="[위젯] Version Comparison ALL 리스트 Row 상세",
)
async def VersionComparisonRowData(
    request: VersionComparisonRowSeriesRequest,
) -> VersionComparisonRowSeriesResponse:
    """Version Comparison ALL 리스트 Row 상세.

    Args:
        request (VersionComparisonRowSeriesRequest): Version Comparison ALL widget request
        
        {
            "applicationId": "com.maxy.app",
            "osType": "Android",
            "appVer": "1.0.0",
            "dateType": "DAY",
            "tmzutc": 540
        }

        - tmzutc (필수): 조회 기준 타임존의 UTC 오프셋(분). 예) 한국(+9)은 540, 뉴욕(-5)은 -300

    Returns:
        VersionComparisonRowSeriesResponse: Version Comparison ALL widget response
        
        {
            "code": 200,
            "message": "Success",
            "series": {
                "install": [
                    [
                        1666666666,
                        100
                    ]
                ],
                "dau": [
                    [
                        1666666666,
                        100
                    ]
                ],
                "error": [
                    [
                        1666666666,
                        100
                    ]
                ],
                "crash": [
                    [
                        1666666666,
                        100
                    ]
                ],
                "loadingTime": [
                    [
                        1666666666,
                        100
                    ]
                ],
                "responseTime": [
                    [
                        1666666666,
                        100
                    ]
                ]
            }
        }
    """
    series_map = build_version_comparison_row_series(
        VersionComparisonRowConfig(
            application_id=request.applicationId,
            os_type=request.osType,
            app_ver=request.appVer,
            date_type=request.dateType or "DAY",
            tmzutc=request.tmzutc,
        )
    )

    return VersionComparisonRowSeriesResponse(code=200, message="Success", series=VersionComparisonRowSeries(**series_map))
