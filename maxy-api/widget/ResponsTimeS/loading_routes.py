"""FastAPI routes for the Loading Time (S) dashboard widget."""

from __future__ import annotations

import json
import logging
import os
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Union

from fastapi import HTTPException
from pydantic import BaseModel, Field, ConfigDict, validator

from apiserver import app

try:
    import redis  # type: ignore
except ImportError:  # pragma: no cover
    redis = None  # type: ignore

logger = logging.getLogger(__name__)

# stale guard: ignore cache older than this
STALE_THRESHOLD = timedelta(seconds=90)


def _parse_iso(value: str | None) -> datetime | None:
    if not value:
        return None
    cleaned = value.rstrip("Z")
    try:
        return datetime.fromisoformat(cleaned)
    except Exception:
        return None


def _find_data_dir():
    current = os.path.abspath(__file__)
    path = os.path.dirname(current)
    while True:
        candidate = os.path.join(path, "Data")
        if os.path.exists(candidate):
            return candidate
        parent = os.path.dirname(path)
        if parent == path:
            break
        path = parent
    return os.path.join(os.path.dirname(current), "Data")


def _load_application_map() -> Dict[str, Dict[str, str]]:
    mapping: Dict[str, Dict[str, str]] = {}
    csv_path = os.path.join(_find_data_dir(), "application.csv")
    if not os.path.exists(csv_path):
        return mapping
    try:
        import csv

        with open(csv_path, "r", newline="", encoding="utf-8") as fp:
            reader = csv.DictReader(fp)
            for row in reader:
                app_id = str(row.get("applicationId") or "").strip()
                if not app_id:
                    continue
                mapping[app_id] = row
    except Exception:
        logger.exception("Failed to load application.csv")
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


def _fetch_from_valkey(
    package_nm: str,
    server_type: str,
    from_ts: int,
    os_filter: Optional[str],
) -> tuple[List[dict], Optional[int]]:
    prefix = os.getenv("VALKEY_PREFIX", "stats:realtime")
    key_prefix = f"{prefix}:loadingtime:{package_nm}:{server_type}"
    client = _get_valkey()

    # 키는 stats:realtime:loadingtime:pkg:server:timestamp 형태
    keys = client.keys(f"{key_prefix}:*")
    if not keys:
        return [], None

    # 첫 요청(from_ts <=0)이면 가장 오래된 것부터 모두 읽고, 이후 요청이면 ts가 from_ts 이후인 것만 사용
    keys_int = []
    for k in keys:
        try:
            ts_part = str(k).split(":")[-1]
            ts_val = int(ts_part)
            keys_int.append((ts_val, k))
        except Exception:
            continue

    if not keys_int:
        if from_ts > 0:
            return [], from_ts
        return [], None

    if from_ts <= 0:
        # 전체 구간 조회
        selected_keys = [k for ts, k in sorted(keys_int)]
    else:
        # from_ts보다 큰 구간만 조회
        selected_keys = [k for ts, k in sorted(keys_int) if ts > from_ts]
    


    raw_items: list[str] = []
    for k in selected_keys:
        try:
            val = client.get(k)
            if val:
                raw_items.append(val)
        except Exception:
            logger.exception("Valkey 조회 실패: key=%s", k)
            continue
        
    last_ts: Optional[int] = None
    if len(raw_items) == 0:
        last_ts = from_ts
        
    items: List[dict] = []
    for raw in raw_items:
        try:
            records = json.loads(raw)
        except Exception:
            continue
        if isinstance(records, dict):
            records = [records]
        for rec in records:
            if not isinstance(rec, dict):
                continue
            # 필수 필터 체크 (snake_case 그대로 사용)
            if rec.get("intervaltime") is None or rec.get("loading_time") is None:
                continue
            if os_filter and rec.get("os_type") not in (os_filter, None, ""):
                continue
            if rec.get("userId") in (None, "", 0):
                candidate = rec.get("user_id")
                if candidate not in (None, "", 0):
                    rec["userId"] = str(candidate)
            # page_id는 frontend에서 mxPageId로 사용
            if rec.get("mxPageId") in (None, "", 0):
                candidate = rec.get("page_id") or rec.get("pageId") or rec.get("mx_page_id")
                if candidate not in (None, "", 0):
                    rec["mxPageId"] = str(candidate)
            if "_id" not in rec:
                rec["_id"] = (
                    rec.get("id")
                    or f"{rec.get('package_nm','')}:{rec.get('server_type','')}:{rec.get('device_id','')}:{rec.get('mxPageId','')}:{rec.get('page_start_tm','')}"
                )
            items.append(rec)

    
    if selected_keys:
        try:
            last_ts = max(int(str(k).split(":")[-1]) for k in selected_keys)
        except Exception:
            last_ts = None
    
    # nowb5 = datetime.now().timestamp() * 1000 - 1000*60*5
    # for item in items:
    #     try:
    #         x = datetime.fromtimestamp(item["page_start_tm"] / 1000).strftime("%Y-%m-%d %H:%M:%S")
    #         if item["page_start_tm"] <= nowb5:
    #             logger.info("[loadingtime] 5분 전 page_start_tm_str=%s", x)
    #         else:
    #             logger.info("[loadingtime] 5분 후 page_start_tm_str=%s", x)
    #     except Exception:
    #         pass
    

    logger.info("[loadingtime] read %d records keys=%d (filtered)", len(items), len(selected_keys))
    return items, last_ts


class LoadingTimeScatterRequest(BaseModel):
    """Request payload for the Loading Time (S) scatter widget."""

    applicationId: int = Field(..., description="Application identifier")
    osType: Optional[str] = Field(None, description="OS filter; use None for all")
    from_ts: int = Field(..., alias="from", description="Start timestamp (ms)")
    to_ts: int = Field(..., alias="to", description="End timestamp (ms)")
    limit: int = Field(1200, gt=0, le=20000, description="Warning threshold in milliseconds")
    size: int = Field(120, ge=10, le=500, description="Number of scatter samples to synthesise")
    tmzutc: int = Field(..., description="조회 기준 타임존의 UTC 오프셋(분, 예: 한국 +9시는 540)")
    model_config = ConfigDict(populate_by_name=True)

    @validator("to_ts")
    def _ensure_positive(cls, value: int) -> int:  # noqa: N805 (pydantic validator signature)
        if value <= 0:
            raise ValueError("to must be a positive timestamp")
        return value

class LoadingTimeScatterItem(BaseModel):
    """Loading Time item; snake_case 필드로 통일."""

    log_type: Optional[Union[str, int]] = None
    log_tm: Optional[int] = None
    intervaltime: float
    loading_time: float
    device_model: str
    device_id: str
    req_url: str
    com_type: Optional[str] = None
    avg_com_sensitivity: Optional[float] = None
    avg_cpu_usage: Optional[float] = None
    sim_operator_nm: Optional[str] = None
    app_ver: Optional[str] = None
    userId: Optional[str] = None
    userNm: Optional[str] = None
    birthDay: Optional[str] = None
    clientNm: Optional[str] = None
    page_end_tm: Optional[int] = None
    page_start_tm: Optional[int] = None
    wtf_flag: Optional[bool] = None
    os_type: Optional[str] = None
    mxPageId: Optional[str] = None
    _id: str

    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    @validator("wtf_flag", pre=True)
    def _normalize_wtf_flag(cls, value):
        if isinstance(value, str):
            lowered = value.strip().lower()
            if lowered == "y":
                return True
            if lowered == "n":
                return False
        return value

    @validator("log_type", pre=True)
    def _normalize_log_type(cls, value):
        # 숫자/문자 모두 허용; 숫자는 문자열로 변환
        if value is None:
            return value
        if isinstance(value, (int, float)):
            return str(int(value))
        return value


class LoadingTimeScatterResponse(BaseModel):
    code: int = 200
    list: List[LoadingTimeScatterItem]
    afterKey: Optional[Dict[str, int]] = None
    message: str = "Success"


@app.post(
    "/widget/LoadingTimeS/List",
    response_model=LoadingTimeScatterResponse,
    summary="[위젯] Loading Time (S)",
)
async def LoadingTimeSList(request: LoadingTimeScatterRequest) -> LoadingTimeScatterResponse:
    """LoadingTimeS 스캐터 API.

    - Valkey에 저장된 `stats:realtime:loadingtime:{pkg}:{srv}:{ts}` JSON 리스트를 읽어와 반환한다.
    - `from`이 0 이하이면 전체 키를, 그렇지 않으면 `from` 이후 타임스탬프 키만 조회한다. `to`가 양수면 상한으로 사용한다.
    - 응답은 snake_case 필드(`loading_time`, `intervaltime` 등) 그대로 전달하며, 최대 `size`개로 제한한다.
    - afterKey.ts에는 마지막으로 읽은 키 타임스탬프를 내려주며, 다음 요청의 `from` 값으로 사용한다.

    Request 예시:
    {
        "applicationId": 1,
        "osType": "iOS",
        "from": 0 # 처음 요청시는 0, 그다음 요청시는 afterKey 이후
        "tmzutc": 540
    }

    Response 예시:
    {
        "code": 200,
        "message": "Success",
        "list": [
            {
                "_id": "maxy:0:device:1765438480709",
                "log_type": "NETWORK",
                "log_tm": 2,
                "intervaltime": 1560,
                "loading_time": 634,
                "device_model": "iPhone13,3",
                "device_id": "47cacf1f-c39e-44b7-8ea3-8106983b14b1",
                "req_url": "http://127.0.0.1:8013/course/view",
                "com_type": "4",
                "avg_com_sensitivity": 94,
                "avg_cpu_usage": 0,
                "sim_operator_nm": "skt",
                "app_ver": "1.7",
                "page_start_tm": 1765438480709,
                "page_end_tm": 1765438482269,
                "wtf_flag": false,
                "os_type": "iOS"
            }
        ],
        "afterKey": null
    }
    """
   

    if request.applicationId <= 0:
        return LoadingTimeScatterResponse(
            list=[],
            afterKey=None,
            message="applicationId가 없어 빈 결과를 반환합니다.",
        )

    if request.from_ts >= request.to_ts:
        raise HTTPException(status_code=400, detail="`from` must be earlier than `to`.")

    resolved = _resolve_pkg_server(request.applicationId, None)
    if not resolved:
        return LoadingTimeScatterResponse(
            list=[],
            afterKey=None,
            message="applicationId에 매핑된 package/server 정보를 찾을 수 없습니다.",
        )

    pkg, server_type = resolved
    # osType이 비어있거나 A/All이면 필터 없이 전체 조회
    os_filter = request.osType
    if not os_filter or str(os_filter).lower() in {"a", "all"}:
        os_filter = None
    try:
        dataset, last_ts = _fetch_from_valkey(pkg, server_type, request.from_ts, os_filter)
    except HTTPException:
        raise
    except Exception:
        logger.exception("LoadingTimeSList: Valkey 조회 실패")
        raise HTTPException(status_code=500, detail="Valkey 조회 실패")

    if not dataset:
        return LoadingTimeScatterResponse(
            list=[],
            afterKey=None,
            message="요청 구간에 해당하는 데이터가 없습니다.",
        )

    items: List[LoadingTimeScatterItem] = []
    for rec in dataset:
        try:
            items.append(LoadingTimeScatterItem.model_validate(rec))
        except Exception:
            logger.exception("LoadingTime item validation 실패 rec=%s", rec)
            continue

    if not items:
        return LoadingTimeScatterResponse(
            list=[],
            afterKey=None,
            message="유효한 데이터가 없습니다.",
        )

    after_key = {"ts": last_ts} if last_ts is not None else None
    return LoadingTimeScatterResponse(list=items, afterKey=after_key, message="Success")
