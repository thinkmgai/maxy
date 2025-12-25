"""FastAPI routes for the Page View dashboard widget."""

from __future__ import annotations

import csv
import json
import logging
import os
from functools import lru_cache
from pathlib import Path
from typing import Dict, Literal, Optional

from fastapi import HTTPException
from pydantic import BaseModel, Field, ConfigDict, root_validator, validator

from apiserver import app
from playload.pageViewPayload import (
    PageViewInfoDetailConfig,
    PageViewInfoListConfig,
    build_page_view_info_detail,
    build_page_view_info_list,
)

try:
    import redis  # type: ignore
except ImportError:  # pragma: no cover
    redis = None  # type: ignore

logger = logging.getLogger(__name__)


def _normalise_date_type(value: Optional[str]) -> str:
    if not value:
        return "DAY"
    upper = value.upper()
    if upper not in {"DAY", "WEEK", "MONTH"}:
        return "DAY"
    return upper


def _clean_os_type(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    cleaned = value.strip()
    if not cleaned:
        return None
    lower = cleaned.lower()
    if lower in {"all", "전체", "a"}:
        return None
    if lower in {"android", "and"}:
        return "Android"
    if lower in {"ios", "iphone"}:
        return "iOS"
    return cleaned


@lru_cache(maxsize=1)
def _find_data_dir() -> Path:
    current = Path(__file__).resolve()
    for parent in current.parents:
        candidate = parent / "Data"
        if candidate.exists():
            return candidate
    return current.parent / "Data"


DATA_DIR = _find_data_dir()
APPLICATION_CSV = DATA_DIR / "application.csv"


def _load_application_map() -> Dict[str, Dict[str, str]]:
    mapping: Dict[str, Dict[str, str]] = {}
    if not APPLICATION_CSV.exists():
        return mapping
    with APPLICATION_CSV.open("r", newline="", encoding="utf-8") as fp:
        reader = csv.DictReader(fp)
        for row in reader:
            app_id = str(row.get("applicationId") or "").strip()
            if not app_id:
                continue
            mapping[app_id] = row
    return mapping


def _resolve_pkg_server(application_id: int, server_type_override: Optional[int] = None) -> tuple[str, str] | None:
    app_info = _load_application_map().get(str(application_id))
    if not app_info:
        return None
    package_nm = str(app_info.get("packageId") or "").strip()
    server_type = (
        str(server_type_override)
        if server_type_override is not None
        else str(app_info.get("serverType") or "").strip()
    )
    if not package_nm or not server_type:
        return None
    return package_nm, server_type


def _get_valkey():
    if redis is None:
        raise HTTPException(status_code=500, detail="redis 패키지가 설치되어 있지 않습니다.")
    try:
        client = redis.Redis(
            host=os.getenv("VALKEY_HOST", "localhost"),
            port=int(os.getenv("VALKEY_PORT", "6379")),
            password=os.getenv("VALKEY_PASSWORD") or None,
            db=int(os.getenv("VALKEY_DB", "0")),
            ssl=os.getenv("VALKEY_SSL", "false").lower() in {"1", "true", "yes", "y", "on"},
            decode_responses=True,
            socket_timeout=5,
            socket_connect_timeout=5,
            retry_on_timeout=True,
        )
        client.ping()
        return client
    except Exception as exc:  # pragma: no cover
        logger.exception("Valkey 연결 실패: %s", exc)
        raise HTTPException(status_code=500, detail="Valkey 연결에 실패했습니다.")


def _safe_int(value: object, *, default: int = 0) -> int:
    if value is None:
        return default
    try:
        return int(value)
    except Exception:
        try:
            return int(float(value))
        except Exception:
            return default


def _parse_items(raw: str | None) -> list[dict]:
    if not raw:
        return []
    try:
        parsed = json.loads(raw)
    except Exception:
        return []
    if not isinstance(parsed, list):
        return []
    return [item for item in parsed if isinstance(item, dict)]


def _sorted_bucket(bucket: dict[str, int], type_value: int) -> list[dict]:
    ordered = sorted(bucket.items(), key=lambda item: (item[1], item[0]), reverse=True)
    return [
        {"pageURL": page_url, "count": count, "type": type_value}
        for page_url, count in ordered
    ]


def _build_priority_list(
    crash_items: list[dict],
    error_items: list[dict],
    log_items: list[dict],
    *,
    limit: int = 30,
) -> list[dict]:
    ordered = crash_items + error_items

    if log_items:
        if len(ordered) >= limit:
            ordered = ordered[: max(0, limit - 1)]
            ordered.append(log_items[0])
        else:
            ordered.extend(log_items)

    return ordered[:limit]


def _merge_items(items: list[dict], *, limit: int) -> list[dict]:
    buckets: dict[int, dict[str, int]] = {0: {}, 1: {}, 2: {}}
    for item in items:
        page_url = str(item.get("pageURL") or "").strip()
        if not page_url:
            continue
        type_value = _safe_int(item.get("type"), default=-1)
        if type_value not in buckets:
            continue
        count = _safe_int(item.get("count"))
        if count <= 0:
            continue
        buckets[type_value][page_url] = buckets[type_value].get(page_url, 0) + count

    crash_items = _sorted_bucket(buckets[2], 2)[:15]
    error_items = _sorted_bucket(buckets[1], 1)[:15]
    log_items = _sorted_bucket(buckets[0], 0)
    return _build_priority_list(crash_items, error_items, log_items, limit=limit)


def _fetch_page_view_from_valkey(
    *,
    package_nm: str,
    server_type: str,
    os_type: Optional[str],
    size: int,
) -> list[dict]:
    prefix = os.getenv("VALKEY_PREFIX", "stats:realtime")
    key_prefix = f"{prefix}:pageview:infolist:{package_nm}:{server_type}"
    client = _get_valkey()
    normalized_os = _clean_os_type(os_type)

    if normalized_os:
        keys = [f"{key_prefix}:{normalized_os}"]
    else:
        keys = client.keys(f"{key_prefix}:*")

    payloads = []
    for key in keys:
        payloads.append(client.hgetall(key) or {})

    items: list[dict] = []
    for payload in payloads:
        items.extend(_parse_items(payload.get("items")))

    limit = max(1, min(size or 30, 30))
    return _merge_items(items, limit=limit)


class PageViewInfoListRequest(BaseModel):
    """Request payload for the Page View equaliser overview."""

    applicationId: int = Field(
        ..., alias="packageNm", ge=0, description="애플리케이션 ID (packageNm 호환)"
    )
    serverType: Optional[int] = Field(
        None, description="서버 구분 (선택, 미제공 시 기본 서버 사용)"
    )
    osType: Optional[str] = Field(None, description="OS 필터 (생략 시 전체)")
    dateType: Literal["DAY", "WEEK", "MONTH"] = Field(
        "DAY", description="집계 구간 (DAY, WEEK, MONTH)"
    )
    size: int = Field(10, ge=1, le=60, description="조회할 최대 URL 수")
    tmzutc: int = Field(..., description="조회 기준 타임존의 UTC 오프셋(분, 예: 한국 +9시는 540)")

    model_config = ConfigDict(populate_by_name=True)

    @root_validator(pre=True)
    def _backfill_application_id(cls, values: dict) -> dict:  # noqa: N805
        if "applicationId" in values and "packageNm" not in values:
            values["packageNm"] = values["applicationId"]
        return values

    @validator("dateType", pre=True, always=True)
    def _normalise_date_type(cls, value: Optional[str]) -> str:  # noqa: N805
        return _normalise_date_type(value)

    @validator("osType", pre=True, always=True)
    def _normalise_os_type(cls, value: Optional[str]) -> Optional[str]:  # noqa: N805
        return _clean_os_type(value)


class PageViewInfoListItem(BaseModel):
    pageURL: str
    count: int
    type: int


class PageViewInfoListResponse(BaseModel):
    code: int = 200
    message: str = "Success"
    list: list[PageViewInfoListItem]


class PageViewInfoDetailRequest(BaseModel):
    """Request payload for the Page View detail chart."""

    applicationId: str = Field(
        ..., alias="packageNm", min_length=1, max_length=128, description="앱 ID"
    )
    osType: Optional[str] = Field(None, description="OS 필터 (생략 시 전체)")
    dateType: Literal["DAY", "WEEK", "MONTH"] = Field(
        "DAY", description="집계 구간 (DAY, WEEK, MONTH)"
    )
    reqUrl: str = Field(..., min_length=1, max_length=512, description="대상 URL")
    tmzutc: int = Field(..., description="조회 기준 타임존의 UTC 오프셋(분, 예: 한국 +9시는 540)")

    model_config = ConfigDict(populate_by_name=True)

    @root_validator(pre=True)
    def _backfill_application_id(cls, values: dict) -> dict:  # noqa: N805
        if "applicationId" in values and "packageNm" not in values:
            values["packageNm"] = values["applicationId"]
        return values

    @validator("dateType", pre=True, always=True)
    def _normalise_date_type(cls, value: Optional[str]) -> str:  # noqa: N805
        return _normalise_date_type(value)

    @validator("osType", pre=True, always=True)
    def _normalise_os_type(cls, value: Optional[str]) -> Optional[str]:  # noqa: N805
        return _clean_os_type(value)

    @validator("reqUrl")
    def _req_url_not_blank(cls, value: str) -> str:  # noqa: N805
        if not value.strip():
            raise ValueError("reqUrl must not be blank.")
        return value


class PageViewInfoDetailItem(BaseModel):
    time: str
    viewCount: int
    viewer: int


class PageViewInfoDetailResponse(BaseModel):
    code: int = 200
    message: str = "Success"
    list: list[PageViewInfoDetailItem]


@app.post(
    "/widget/PageView/InfoList",
    response_model=PageViewInfoListResponse,
    summary="[위젯] Page View 목록",
)
async def get_page_view_info_list(
    request: PageViewInfoListRequest,
) -> PageViewInfoListResponse:
    """[위젯] Page View Equalizer 위젯에서 사용하는 상위 URL 목록을 반환합니다.

    Args:
        request (PageViewInfoListRequest): Page View Equalizer 위젯에서 사용하는 상위 URL 목록을 반환합니다.
        
        {
            "applicationId": "string",
            "osType": "string",
            "dateType": "DAY",
            "size": 0,
            "tmzutc": 540
        }

        - tmzutc (필수): 조회 기준 타임존의 UTC 오프셋(분). 예) 한국(+9)은 540, 뉴욕(-5)은 -300

    Returns:
        PageViewInfoListResponse: Page View Equalizer 위젯에서 사용하는 상위 URL 목록
        
        {
            "code": 200,
            "message": "Success",
            "list": [
                {
                    "pageURL": "string",
                    "count": 0,
                    "type": 0
                }
            ]
        }
    """
    if request.applicationId <= 0:
        return PageViewInfoListResponse(
            message="applicationId가 없어 빈 결과를 반환합니다.",
            list=[],
        )

    if request.dateType != "DAY":
        records = build_page_view_info_list(
            PageViewInfoListConfig(
                application_id=request.applicationId,
                os_type=request.osType,
                date_type=request.dateType,
                size=request.size,
                tmzutc=request.tmzutc,
            )
        )
    else:
        resolved = _resolve_pkg_server(request.applicationId, request.serverType)
        if not resolved:
            return PageViewInfoListResponse(message="application/package 정보를 찾을 수 없습니다.", list=[])
        package_nm, server_type = resolved
        try:
            records = _fetch_page_view_from_valkey(
                package_nm=package_nm,
                server_type=server_type,
                os_type=request.osType,
                size=request.size,
            )
        except HTTPException:
            raise
        except Exception:
            logger.exception("PageView InfoList 조회 실패 (Valkey)")
            return PageViewInfoListResponse(message="Valkey 조회 실패", list=[])

    items = [PageViewInfoListItem(**record) for record in records]
    return PageViewInfoListResponse(list=items)


@app.post(
    "/widget/PageView/InfoDetail",
    response_model=PageViewInfoDetailResponse,
    summary="[위젯] Page View 상세 시계열",
)
async def get_page_view_info_detail(
    request: PageViewInfoDetailRequest,
) -> PageViewInfoDetailResponse:
    """[위젯] 특정 URL에 대한 Page View Equalizer 상세 데이터를 반환합니다.

    Args:
        request (PageViewInfoDetailRequest): 특정 URL에 대한 Page View Equalizer 상세 데이터를 반환합니다.
        
        {
            "applicationId": "string",
            "osType": "string",
            "dateType": "DAY",
            "reqUrl": "string",
            "tmzutc": 540
        }

        - tmzutc (필수): 조회 기준 타임존의 UTC 오프셋(분). 예) 한국(+9)은 540, 뉴욕(-5)은 -300

    Raises:
        HTTPException: reqUrl이 없을 경우

    Returns:
        PageViewInfoDetailResponse: 특정 URL에 대한 Page View Equalizer 상세 데이터
        
        {
            "code": 200,
            "message": "Success",
            "list": [
                {
                    "time": "string",
                    "viewCount": 0,
                    "viewer": 0
                }
            ]
        }
    """

    if not request.reqUrl:
        raise HTTPException(status_code=400, detail="reqUrl is required.")

    series = build_page_view_info_detail(
        PageViewInfoDetailConfig(
            application_id=request.applicationId,
            os_type=request.osType,
            date_type=request.dateType,
            req_url=request.reqUrl,
            tmzutc=request.tmzutc,
        )
    )

    items = [PageViewInfoDetailItem(**item) for item in series]
    return PageViewInfoDetailResponse(list=items)
