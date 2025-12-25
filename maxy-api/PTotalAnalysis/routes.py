from __future__ import annotations
from fastapi import HTTPException
from apiserver import app
from playload import commonPayload
from models import commonModels
from fastapi import Request, Response
from typing import Any, Dict
from datetime import datetime, timedelta, date
import models.biDetailModels as biDetailModels
import playload.biDetailPayload as playload
import os
import csv
import logging
from pathlib import Path
from functools import lru_cache
from PTotalAnalysis.clickhouse.repository import fetch_metric_series, fetch_mau_monthly_series
from PTotalAnalysis.clickhouse.dto import MetricSeriesQuery, MauMonthlyQuery

try:
    import redis  # type: ignore
except ImportError:
    redis = None  # type: ignore

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


# @lru_cache(maxsize=1)
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


def _parse_ymd(val: str) -> date:
    try:
        return datetime.strptime(val, "%Y-%m-%d").date()
    except Exception:
        raise HTTPException(status_code=400, detail="startDate/endDate 형식은 YYYY-MM-DD 이어야 합니다.")


def _parse_selected_date(val: str | None) -> date | None:
    """selectedDate는 차트 클릭 값이라 더 관대한 파싱을 허용한다."""
    if not val:
        return None
    val = str(val).strip()
    try:
        return datetime.strptime(val, "%Y-%m-%d").date()
    except Exception:
        pass
    try:
        normalized = val.replace("Z", "+00:00")
        return datetime.fromisoformat(normalized).date()
    except Exception:
        pass
    # epoch(ms|s) 형태도 지원
    if val.replace(".", "", 1).isdigit():
        try:
            ts = float(val)
            if ts > 1e12:  # ms
                ts = ts / 1000.0
            return datetime.utcfromtimestamp(ts).date()
        except Exception:
            pass
    # 최후 수단: 앞 10자리만 잘라 YYYY-MM-DD로 시도
    if len(val) >= 10:
        try:
            return datetime.strptime(val[:10], "%Y-%m-%d").date()
        except Exception:
            pass
    return None


def _get_pkg_server(application_id: int) -> tuple[str, int]:
    app_info = _load_application_map().get(str(application_id))
    if not app_info:
        raise HTTPException(status_code=400, detail="application 정보를 찾을 수 없습니다.")
    package_nm = str(app_info.get("packageId") or "").strip()
    if not package_nm:
        raise HTTPException(status_code=400, detail="package 정보를 찾을 수 없습니다.")
    try:
        server_type = int(app_info.get("serverType"))
    except Exception:
        raise HTTPException(status_code=400, detail="server_type 정보가 올바르지 않습니다.")
    return package_nm, server_type


def _date_iter(start: date, end: date):
    cur = start
    while cur <= end:
        yield cur
        cur += timedelta(days=1)


def _build_metric_response(
    application_id: int,
    start_date: str,
    end_date: str,
    metric_key: str,
    selected_date: str | None = None,
    context_path: str | None = None,
) -> biDetailModels.BIDetailResponse:
    requested_start = _parse_ymd(start_date)
    end_dt = _parse_ymd(end_date)
    if requested_start > end_dt:
        raise HTTPException(status_code=400, detail="startDate는 endDate보다 이후일 수 없습니다.")
    selected_dt: date | None = _parse_selected_date(selected_date)
    warn_selected = (
        f"selectedDate 값을 인식할 수 없습니다. YYYY-MM-DD로 보내주세요. (입력값: {selected_date})"
        if selected_date and selected_dt is None
        else None
    )

    package_nm, server_type = _get_pkg_server(application_id)
    is_mau_monthly = metric_key == "mau"

    if is_mau_monthly:
        query = MauMonthlyQuery(
            start_date=requested_start.isoformat(),
            end_date=end_dt.isoformat(),
            package_nm=package_nm,
            server_type=server_type,
        )
        rows = fetch_mau_monthly_series(query, context=context_path)
        android_map: dict[str, float] = {}
        ios_map: dict[str, float] = {}
        for row in rows:
            os_norm = (row.os_type or "").strip().lower()
            # 월 키는 YYYY-MM 형태로 응답
            try:
                month_dt = _parse_ymd(row.date)
                month_key = month_dt.strftime("%Y-%m")
            except Exception:
                month_key = row.date
            val = float(row.mau or 0)
            if os_norm == "android":
                android_map[month_key] = val
            elif os_norm == "ios":
                ios_map[month_key] = val

        data_months: set[date] = set()
        for d in set(android_map.keys()) | set(ios_map.keys()):
            try:
                parsed = datetime.strptime(d, "%Y-%m").date().replace(day=1)
                data_months.add(parsed)
            except Exception:
                try:
                    data_months.add(_parse_ymd(d).replace(day=1))
                except Exception:
                    continue

        def _month_start(dt: date) -> date:
            return dt.replace(day=1)

        requested_month = _month_start(requested_start)
        end_month = _month_start(end_dt)
        effective_start_month = requested_month
        if data_months:
            earliest = min(data_months)
            if earliest > effective_start_month:
                effective_start_month = earliest
        if effective_start_month > end_month:
            effective_start_month = end_month

        selected_android = None
        selected_ios = None
        if selected_dt:
            sel_month = selected_dt.replace(day=1)
            if sel_month < effective_start_month:
                sel_month = effective_start_month
            if sel_month > end_month:
                sel_month = end_month
            sel_key = sel_month.strftime("%Y-%m")
            selected_android = {"date": sel_key, "value": android_map.get(sel_key, 0)}
            selected_ios = {"date": sel_key, "value": ios_map.get(sel_key, 0)}

        def _month_iter(start: date, end: date):
            cur = start
            while cur <= end:
                yield cur
                if cur.month == 12:
                    cur = cur.replace(year=cur.year + 1, month=1, day=1)
                else:
                    cur = cur.replace(month=cur.month + 1, day=1)

        def _series_month(data: dict[str, float]) -> list[dict[str, float | str]]:
            series = []
            for m in _month_iter(effective_start_month, end_month):
                key = m.strftime("%Y-%m")
                series.append({"date": key, "value": data.get(key, 0)})
            return series

        return biDetailModels.BIDetailResponse(
            code=200,
            dailyAndroid=_series_month(android_map),
            dailyIOS=_series_month(ios_map),
            selectedAndroid=selected_android,
            selectedIOS=selected_ios,
            message="Success" if warn_selected is None else warn_selected,
        )

    # 일별 메트릭
    query = MetricSeriesQuery(
        start_date=requested_start.isoformat(),
        end_date=end_dt.isoformat(),
        package_nm=package_nm,
        server_type=server_type,
    )
    rows = fetch_metric_series(query, context=context_path)

    android_map: dict[str, float] = {}
    ios_map: dict[str, float] = {}

    def _metric_value(row) -> float:
        if metric_key == "install":
            return float(row.install or 0)
        if metric_key == "login":
            return float(row.login or 0)
        if metric_key == "dau":
            return float(row.dau or 0)
        if metric_key == "revisit":
            return float(row.revisit_7d or 0)
        if metric_key == "mau":
            return float(row.mau or 0)
        if metric_key == "pv":
            return float(row.pv or 0)
        if metric_key == "stay":
            return float(row.intervaltime_avg or 0.0)
        if metric_key == "log":
            return float(row.log_count or 0)
        if metric_key == "error":
            return float((row.error_count or 0) + (row.js_error_count or 0))
        if metric_key == "crash":
            return float(row.crash_count or 0)
        if metric_key == "sleep":
            return 0.0  # 휴면 데이터는 현재 집계 테이블에 없음
        return 0.0

    for row in rows:
        os_norm = (row.os_type or "").strip().lower()
        val = _metric_value(row)
        if os_norm == "android":
            android_map[row.date] = val
        elif os_norm == "ios":
            ios_map[row.date] = val

    data_dates = set()
    for d in set(android_map.keys()) | set(ios_map.keys()):
        try:
            data_dates.add(_parse_ymd(d))
        except Exception:
            continue
    effective_start = requested_start
    if data_dates:
        earliest_data = min(data_dates)
        if earliest_data > effective_start:
            effective_start = earliest_data
    if effective_start > end_dt:
        effective_start = end_dt

    selected_android = None
    selected_ios = None
    if selected_dt:
        sel_day = selected_dt
        if sel_day < effective_start:
            sel_day = effective_start
        if sel_day > end_dt:
            sel_day = end_dt
        sel_key = sel_day.isoformat()
        selected_android = {"date": sel_key, "value": android_map.get(sel_key, 0)}
        selected_ios = {"date": sel_key, "value": ios_map.get(sel_key, 0)}

    def _series(data: dict[str, float], start_at: date) -> list[dict[str, float | str]]:
        series = []
        for d in _date_iter(start_at, end_dt):
            day = d.isoformat()
            series.append({"date": day, "value": data.get(day, 0)})
        return series

    return biDetailModels.BIDetailResponse(
        code=200,
        dailyAndroid=_series(android_map, effective_start),
        dailyIOS=_series(ios_map, effective_start),
        selectedAndroid=selected_android,
        selectedIOS=selected_ios,
        message="Success" if warn_selected is None else warn_selected,
    )


@app.post('/PTotalAnalysis/BIInfomations',response_model=commonModels.BIInfomationsResponse, summary="[TotalAnalysis] BIInfomations - BI 정보 리스트.", response_description="처리 결과 코드 및 메시지")
async def BIInfomations(request: commonModels.BIInfomationsRequest, response: Response, req: Request) -> commonModels.BIInfomationsResponse:
    """ 프로젝트에서 활성화된 BI 정보 리스트을 가져온다.

    Args:
        request (models.BIInfomationsRequest): BI 정보 리스트 요청
        
        {
            "applicationId": 0, 
            "osType": "osType",
            "tmzutc": 540
        }

    Returns:
        models.BIInfomationsResponse: BI 정보 리스트 응답
        
        - ID : 0:설치,1:안드로이드(비율),2:ios(비율),3:mau,4:ccu,5:pv,6:재방문,7:휴면,8:로그인,9:체류,10:로그,11:Error,12:Crash,13:dau
        - Name : 설치,안드로이드,ios,mau,ccu,pv,재방문,휴면,로그인,체류,로그,에러,크래시,dau
        - Today : 오늘의 BI 수
        - Yesterday : 어제의 BI 수
        
        {
            "code": 200,
            "biInfomations": [
                {
                    "ID": 0,
                    "Name": "설치",
                    "Today": 10203,
                    "Yesterday": 100394
                }
            ],
            "message": "Success"
        }
    """
    applicationId = request.applicationId
    osType = request.osType
    tmzutc = request.tmzutc

    # Valkey 연결 설정
    if redis is None:
        logging.error("redis 패키지가 설치되어 있지 않습니다.")
        raise HTTPException(status_code=500, detail="redis 패키지가 설치되어 있지 않습니다.")
    try:
        valkey = redis.Redis(
            host=os.getenv("VALKEY_HOST", "localhost"),
            port=int(os.getenv("VALKEY_PORT", "6379")),
            password=os.getenv("VALKEY_PASSWORD") or None,
            db=int(os.getenv("VALKEY_DB", "0")),
            ssl=os.getenv("VALKEY_SSL", "false").lower() in {"1", "true", "yes", "y", "on"},
            decode_responses=True,
        )
        # 연결 확인 (ping)
        valkey.ping()
    except Exception as exc:  # pragma: no cover - connection fallback
        logging.error("Valkey 연결 실패: %s", exc)
        valkey = None
    prefix = os.getenv("VALKEY_PREFIX", "stats:realtime")

    # applicationId -> package/server 매핑
    pkg = ""
    server_type = ""
    app_map = _load_application_map()
    app_info = app_map.get(str(applicationId))
    if app_info:
        pkg = str(app_info.get("packageId") or "")
        server_type = str(app_info.get("serverType") or "")

    if not pkg or not server_type:
        raise HTTPException(status_code=400, detail="package/server 정보를 찾을 수 없습니다.")

    def _default_response() -> commonModels.BIInfomationsResponse:
        items = [
            {"ID": 0, "Name": "설치"},
            {"ID": 1, "Name": "안드로이드"},
            {"ID": 2, "Name": "ios"},
            {"ID": 3, "Name": "mau"},
            {"ID": 4, "Name": "ccu"},
            {"ID": 5, "Name": "pv"},
            {"ID": 6, "Name": "재방문"},
            {"ID": 7, "Name": "휴면"},
            {"ID": 8, "Name": "로그인"},
            {"ID": 9, "Name": "체류"},
            {"ID": 10, "Name": "로그"},
            {"ID": 11, "Name": "에러"},
            {"ID": 12, "Name": "크래시"},
            {"ID": 13, "Name": "dau"},
        ]
        for item in items:
            item["Today"] = 0
            item["Yesterday"] = 0
        return commonModels.BIInfomationsResponse(code=200, biInfomations=items, message="Success")

    def _get_hash(key: str) -> Dict[str, Any]:
        if valkey is None:
            return {}
        try:
            data = valkey.hgetall(key)
            return data or {}
        except Exception as exc:  # pragma: no cover - connection error
            logging.error("Valkey 조회 실패 key=%s error=%s", key, exc)
            return {}

    def _collect_today(os_filter: str | None) -> Dict[tuple, Dict[str, Any]]:
        result: Dict[tuple, Dict[str, Any]] = {}
        targets = []
        if os_filter in {"A", "Android", "iOS", "all", None, ""}:
            if os_filter in {"A", "all", None, ""}:
                targets = ["Android", "iOS"]
            elif os_filter == "Android":
                targets = ["Android"]
            elif os_filter == "iOS":
                targets = ["iOS"]
        else:
            targets = [os_filter]
        for os_name in targets:
            device_key = f"{prefix}:{pkg}:{server_type}:{os_name}"
            page_key = f"{prefix}:page:{pkg}:{server_type}:{os_name}"
            merged: Dict[str, Any] = {}
            merged.update(_get_hash(device_key))
            page_data = _get_hash(page_key)
            for k, v in page_data.items():
                merged[k] = v
            if merged:
                result[(pkg, server_type, os_name)] = merged
        return result

    def _collect_yesterday(os_filter: str | None) -> Dict[tuple, Dict[str, Any]]:
        ydate = (datetime.utcnow() - timedelta(days=1)).date().isoformat()
        result: Dict[tuple, Dict[str, Any]] = {}
        targets = []
        if os_filter in {"A", "Android", "iOS", "all", None, ""}:
            if os_filter in {"A", "all", None, ""}:
                targets = ["Android", "iOS"]
            elif os_filter == "Android":
                targets = ["Android"]
            elif os_filter == "iOS":
                targets = ["iOS"]
        else:
            targets = [os_filter]
        for os_name in targets:
            key = f"{prefix}:daily:{ydate}:{pkg}:{server_type}:{os_name}"
            data = _get_hash(key)
            if data:
                result[(pkg, server_type, os_name)] = data
        return result

    def _metric(field: str, data: Dict[str, Any]) -> float:
        try:
            return float(data.get(field, 0) or 0)
        except Exception:
            return 0.0

    def _rollup(rows: Dict[tuple, Dict[str, Any]]) -> Dict[str, float]:
        acc = {
            "install": 0,
            "login": 0,
            "dau": 0,
            "revisit_7d": 0,
            "mau": 0,
            "pv": 0,
            "interval": 0.0,
            "log": 0,
            "error": 0,
            "crash": 0,
        }
        for _, row in rows.items():
            acc["install"] += _metric("install", row)
            acc["login"] += _metric("login", row)
            acc["dau"] += _metric("dau", row)
            acc["revisit_7d"] += _metric("revisit_7d", row)
            acc["mau"] += _metric("mau", row)
            acc["pv"] += _metric("pv", row)
            acc["interval"] += _metric("intervaltime_avg", row)
            acc["log"] += _metric("log_count", row)
            err = _metric("error_count", row) + _metric("js_error_count", row)
            acc["error"] += err
            acc["crash"] += _metric("crash_count", row)
        return acc

    # Valkey가 없거나 조회 실패 시 0으로 응답
    if valkey is None:
        return _default_response()

    today_rows = _collect_today(osType)
    yesterday_rows = _collect_yesterday(osType)
    today = _rollup(today_rows)
    yesterday = _rollup(yesterday_rows)

    # OS 비율 계산: Android/iOS 각각의 dau를 별도로 합산
    def _sum_dau(os_name: str) -> float:
        total = 0.0
        for (_, _, os_key), row in today_rows.items():
            if os_key.lower() == os_name.lower():
                try:
                    total += float(row.get("dau", 0) or 0)
                except Exception:
                    continue
        return total

    dau_android = _sum_dau("Android")
    dau_ios = _sum_dau("iOS")
    dau_total = dau_android + dau_ios
    android_ratio = (dau_android / dau_total * 100.0) if dau_total > 0 else 0.0
    # ios_ratio = (dau_ios / dau_total * 100.0) if dau_total > 0 else 0.0

    def _item(idx: int, name: str, tval: float, yval: float) -> Dict[str, Any]:
        return {"ID": idx, "Name": name, "Today": int(tval), "Yesterday": int(yval)}

    response_items = [
        _item(0, "설치", today["install"], yesterday["install"]),
        _item(1, "안드로이드", int(android_ratio), 0),  # 비율 계산을 위해 오늘자만 사용
        _item(2, "ios", 100 - int(android_ratio), 0),
        _item(3, "mau", today["mau"], yesterday["mau"]),
        _item(4, "ccu", 0, 0),
        _item(5, "pv", today["pv"], yesterday["pv"]),
        _item(6, "재방문", today["revisit_7d"], yesterday["revisit_7d"]),
        _item(7, "휴면", 0, 0),
        _item(8, "로그인", today["login"], yesterday["login"]),
        _item(9, "체류", today["interval"], yesterday["interval"]),
        _item(10, "로그", today["log"], yesterday["log"]),
        _item(11, "에러", today["error"], yesterday["error"]),
        _item(12, "크래시", today["crash"], yesterday["crash"]),
        _item(13, "dau", today["dau"], yesterday["dau"]),
    ]

    return commonModels.BIInfomationsResponse(code=200, biInfomations=response_items, message="Success")







@app.post('/PTotalAnalysis/BIDetailCCU',response_model=biDetailModels.BIDetailResponse, summary="[TotalAnalysis] BIDetailCCU - BI CCU 상세 정보.", response_description="처리 결과 코드 및 메시지")
async def BIDetailCCU(request: biDetailModels.BIDetailCCURequest, response: Response, req: Request):
    """BI CCU 상세 정보 (00:00 ~ 현재시간)

    Args:
        request (biDetailModels.BIDetailRequest): 애플리케이션 ID, 운영체제, 시작일, 종료일
        
        {
            "applicationId": 0,
            "startDate": "2025-01-01",
            "tmzutc": 540
        }

        - tmzutc (필수): 조회 기준 타임존의 UTC 오프셋(분). 예) 한국(+9)은 540, 뉴욕(-5)은 -300

    Returns:
        biDetailModels.BIDetailResponse: BI CCU 상세 정보
        
        - dailyAndroid : Android 초당 CCU
        - dailyIOS : iOS 초당 CCU
        - message : 메시지
        
        {
            "code": 200,
            "dailyAndroid" : [
                {"hour": "01:00","value": 1000},
                {"hour": "01:01","value": 1200},
                {"hour": "01:02","value": 1400},
                {"hour": "01:03","value": 1000},
                {"hour": "01:04","value": 10030},
                {"hour": "01:05","value": 10200},
                {"hour": "01:06","value": 100}
            ],
            "dailyIOS" : [
                {"hour": "01:00","value": 1000},
                {"hour": "01:01","value": 1200},
                {"hour": "01:02","value": 1400},
                {"hour": "01:03","value": 1000},
                {"hour": "01:04","value": 10030},
                {"hour": "01:05","value": 10200},
                {"hour": "01:06","value": 100}
            ],
            "message": "success"
        }
    """
    applicationId = request.applicationId
    startDate = request.startDate
    
    # TODO : BI CCU 정보 가져오기
    Result = playload.buildBIDetailCCUResponse(startDate)
    return Result

@app.post(
    "/PTotalAnalysis/BIDetailCCUDate",
    response_model=biDetailModels.BIDetailResponse,
    summary="[TotalAnalysis] BIDetailCCUDate - BI CCU 상세 정보.",
    response_description="처리 결과 코드 및 메시지",
)
async def BIDetailCCUDate(
    request: biDetailModels.BIDetailRequest,
    response: Response,
    req: Request,
) -> biDetailModels.BIDetailResponse:
    """BI CCU 상세 정보 (시작일 ~ 종료일)

    Args:
        request (biDetailModels.BIDetailRequest): 애플리케이션 ID, 운영체제, 시작일, 종료일
        
        {
            "applicationId": 0,
            "startDate": "2025-01-01",
            "endDate": "2025-01-31",
            "tmzutc": 540
        }

        - tmzutc (필수): 조회 기준 타임존의 UTC 오프셋(분). 예) 한국(+9)은 540, 뉴욕(-5)은 -300

    Returns:
        biDetailModels.BIDetailResponse: BI CCU 상세 정보
        
        {
        "dailyAndroid" : [
            {"date": "2025-01-01","value": 1000},
            {"date": "2025-01-02","value": 1200},
            {"date": "2025-01-03","value": 1400},
            {"date": "2025-01-04","value": 1000},
            {"date": "2025-01-05","value": 10030},
            {"date": "2025-01-06","value": 10200},
            {"date": "2025-01-07","value": 100}
        ],
        "dailyIOS" : [
            {"date": "2025-01-01","value": 1000},
            {"date": "2025-01-02","value": 1200},
            {"date": "2025-01-03","value": 1400},
            {"date": "2025-01-04","value": 1000},
            {"date": "2025-01-05","value": 10030},
            {"date": "2025-01-06","value": 10200},
            {"date": "2025-01-07","value": 100}
        ]
    }
    
    """
    applicationId = request.applicationId
    startDate = request.startDate
    endDate = request.endDate
    
    # TODO : BI CCU 정보 가져오기
    Result = playload.buildBIDetailResponse()
    return Result


@app.post(
    "/PTotalAnalysis/BIDetailCrash",
    response_model=biDetailModels.BIDetailResponse,
    summary="[TotalAnalysis] BIDetailCrash - BI Crash 상세 정보.",
    response_description="처리 결과 코드 및 메시지",
)
async def BIDetailCrash(
    request: biDetailModels.BIDetailRequest,
    response: Response,
    req: Request,
) -> biDetailModels.BIDetailResponse:
    """Basic Information Crash 상세 정보

    Args:
        request (biDetailModels.BIDetailRequest): 애플리케이션 ID, 운영체제, 시작일, 종료일
        
        {
            "applicationId": 0,
            "startDate": "2025-01-01",
            "endDate": "2025-01-31",
            "tmzutc": 540
        }

        - tmzutc (필수): 조회 기준 타임존의 UTC 오프셋(분). 예) 한국(+9)은 540, 뉴욕(-5)은 -300

    Returns:
        biDetailModels.BIDetailResponse: BI Crash 상세 정보
    """
    return _build_metric_response(
        application_id=request.applicationId,
        start_date=request.startDate,
        end_date=request.endDate,
        metric_key="crash",
        selected_date=request.selectedDate,
        context_path=req.url.path if req else None,
    )


@app.post(
    "/PTotalAnalysis/BIDetailError",
    response_model=biDetailModels.BIDetailResponse,
    summary="[TotalAnalysis] BIDetailError - BI Error 상세 정보.",
    response_description="처리 결과 코드 및 메시지",
)
async def BIDetailError(
    request: biDetailModels.BIDetailRequest,
    response: Response,
    req: Request,
) -> biDetailModels.BIDetailResponse:
    """Basic Information Error 상세 정보

    Args:
        request (biDetailModels.BIDetailRequest): 애플리케이션 ID, 운영체제, 시작일, 종료일
        
        {
            "applicationId": 0,
            "startDate": "2025-01-01",
            "endDate": "2025-01-31",
            "tmzutc": 540
        }

        - tmzutc (필수): 조회 기준 타임존의 UTC 오프셋(분). 예) 한국(+9)은 540, 뉴욕(-5)은 -300
    """

    applicationId = request.applicationId
    startDate = request.startDate
    endDate = request.endDate

    return _build_metric_response(
        application_id=applicationId,
        start_date=startDate,
        end_date=endDate,
        metric_key="error",
        selected_date=request.selectedDate,
        context_path=req.url.path if req else None,
    )

@app.post(
    "/PTotalAnalysis/BIDetailCrashTop10",
    response_model=biDetailModels.BIDetailTop10Response,
    summary="[TotalAnalysis] BIDetailCrashTop10 - BI Crash Top10 상세 정보.",
    response_description="처리 결과 코드 및 메시지",
)
async def BIDetailCrashTop10(
    request: biDetailModels.BIDetailTop10Request,
    response: Response,
    req: Request,
) -> biDetailModels.BIDetailTop10Response:
    """Basic Information Error Top10 상세 정보

    Args:
        request (biDetailModels.BIDetailRequest): 애플리케이션 ID, 운영체제, 시작일, 종료일
        
        {
            "applicationId": 0,
            "osType": "all",
            "startDate": "2025-01-01",
            "endDate": "2025-01-31",
            "tmzutc": 540
        }

        - tmzutc (필수): 조회 기준 타임존의 UTC 오프셋(분). 예) 한국(+9)은 540, 뉴욕(-5)은 -300

    Returns:
        biDetailModels.BIDetailTop10Response: BI Crash Top10 상세 정보
        
        {
          "code": 200,
          "androidTop10": [{
            "Count": 1120,
            "Cause Name": "Crash",
            "Caused By": "Thread starting during runtime shutdown",
            "Message": "Thread starting during runtime shutdown 더많은 데이터"
          }],
          "iosTop10": [{
            "Count": 760,
            "Cause Name": "Invalid Credentials",
            "Caused By": "Network Authentication Required",
            "Message": "Network Authentication Required 더많은 데이터"
          }]
        }
    
    """
    applicationId = request.applicationId
    startDate = request.startDate
    endDate = request.endDate
    osType = request.osType
    
    # TODO : BI Top10 정보 가져오기
    Result = playload.buildBIDetailTop10Response(osType)
    return Result



@app.post(
    "/PTotalAnalysis/BIDetailDAU",
    response_model=biDetailModels.BIDetailResponse,
    summary="[TotalAnalysis] BIDetailDAU - BI DAU 상세 정보.",
    response_description="처리 결과 코드 및 메시지",
)
async def BIDetailDAU(
    request: biDetailModels.BIDetailRequest,
    response: Response,
    req: Request,
) -> biDetailModels.BIDetailResponse:
    """Basic Information DAU 상세 정보

    Args:
        request (biDetailModels.BIDetailRequest): 애플리케이션 ID, 운영체제, 시작일, 종료일
        
        {
            "applicationId": 0,
            "startDate": "2025-01-01",
            "endDate": "2025-01-31",
            "tmzutc": 540
        }

        - tmzutc (필수): 조회 기준 타임존의 UTC 오프셋(분). 예) 한국(+9)은 540, 뉴욕(-5)은 -300

    Returns:
        biDetailModels.BIDetailResponse: BI DAU 상세 정보
        
        {
        "dailyAndroid" : [
            {"date": "2025-01-01","value": 1000},
            {"date": "2025-01-02","value": 1200},
            {"date": "2025-01-03","value": 1400},
            {"date": "2025-01-04","value": 1000},
            {"date": "2025-01-05","value": 10030},
            {"date": "2025-01-06","value": 10200},
            {"date": "2025-01-07","value": 100}
        ],
        "dailyIOS" : [
            {"date": "2025-01-01","value": 1000},
            {"date": "2025-01-02","value": 1200},
            {"date": "2025-01-03","value": 1400},
            {"date": "2025-01-04","value": 1000},
            {"date": "2025-01-05","value": 10030},
            {"date": "2025-01-06","value": 10200},
            {"date": "2025-01-07","value": 100}
        ]
    }
    
    """
    return _build_metric_response(
        application_id=request.applicationId,
        start_date=request.startDate,
        end_date=request.endDate,
        metric_key="dau",
        selected_date=request.selectedDate,
        context_path=req.url.path if req else None,
    )
    

@app.post(
    "/PTotalAnalysis/BIDetailErrorTop10",
    response_model=biDetailModels.BIDetailTop10Response,
    summary="[TotalAnalysis] BIDetailErrorTop10 - BI Error Top10 상세 정보.",
    response_description="처리 결과 코드 및 메시지",
)
async def BIDetailErrorTop10(
    request: biDetailModels.BIDetailTop10Request,
    response: Response,
    req: Request,
) -> biDetailModels.BIDetailTop10Response:
    """Basic Information Error Top10 상세 정보

    Args:
        request (biDetailModels.BIDetailRequest): 애플리케이션 ID, 운영체제, 시작일, 종료일
        
        {
            "applicationId": 0,
            "osType": "all",
            "startDate": "2025-01-01",
            "endDate": "2025-01-31",
            "tmzutc": 540
        }

        - tmzutc (필수): 조회 기준 타임존의 UTC 오프셋(분). 예) 한국(+9)은 540, 뉴욕(-5)은 -300

    Returns:
        biDetailModels.BITop10Response: BI Error Top10 상세 정보
        
        biDetailModels.BIDetailTop10Response: BI Crash Top10 상세 정보
        
        {
          "code": 200,
          "androidTop10": [{
            "Count": 1120,
            "Error Type": "Error",
            "Message": "Thread starting during runtime shutdown 더많은 데이터"
          }],
          "iosTop10": [{
            "Count": 760,
            "Error Type": "Invalid Credentials",
            "Message": "Thread starting during runtime shutdown 더많은 데이터"
          }]
        }
    """
    applicationId = request.applicationId
    startDate = request.startDate
    endDate = request.endDate
    osType = request.osType
    
    # TODO : BI Error Top10 정보 가져오기
    Result = playload.buildBIDetailErrorTop10Response(osType)
    return Result




@app.post(
    "/PTotalAnalysis/BIDetailInstall",
    response_model=biDetailModels.BIDetailResponse,
    summary="[TotalAnalysis] BIDetailInstall - BI Install 상세 정보.",
    response_description="처리 결과 코드 및 메시지",
)
async def BIDetailInstall(
    request: biDetailModels.BIDetailRequest,
    response: Response,
    req: Request,
) -> biDetailModels.BIDetailResponse:
    """Basic Information Install 상세 정보

    Args:
        request (biDetailModels.BIDetailRequest): 애플리케이션 ID, 운영체제, 시작일, 종료일
        
        {
            "applicationId": 0,
            "startDate": "2025-01-01",
            "endDate": "2025-01-31",
            "tmzutc": 540
        }

        - tmzutc (필수): 조회 기준 타임존의 UTC 오프셋(분). 예) 한국(+9)은 540, 뉴욕(-5)은 -300

    Returns:
        biDetailModels.BIDetailResponse: BI 상세 정보
        
        {
        "dailyAndroid" : [
            {"date": "2025-01-01","value": 1000},
            {"date": "2025-01-02","value": 1200},
            {"date": "2025-01-03","value": 1400},
            {"date": "2025-01-04","value": 1000},
            {"date": "2025-01-05","value": 10030},
            {"date": "2025-01-06","value": 10200},
            {"date": "2025-01-07","value": 100}
        ],
        "dailyIOS" : [
            {"date": "2025-01-01","value": 1000},
            {"date": "2025-01-02","value": 1200},
            {"date": "2025-01-03","value": 1400},
            {"date": "2025-01-04","value": 1000},
            {"date": "2025-01-05","value": 10030},
            {"date": "2025-01-06","value": 10200},
            {"date": "2025-01-07","value": 100}
        ]
        }
    
    """
    return _build_metric_response(
        application_id=request.applicationId,
        start_date=request.startDate,
        end_date=request.endDate,
        metric_key="install",
        selected_date=request.selectedDate,
        context_path=req.url.path if req else None,
    )
    

@app.post(
    "/PTotalAnalysis/BIDetailLog",
    response_model=biDetailModels.BIDetailResponse,
    summary="[TotalAnalysis] BIDetailLog - BI Login 상세 정보. (Total Log)",
    response_description="처리 결과 코드 및 메시지",
)
async def BIDetailLog(
    request: biDetailModels.BIDetailRequest,
    response: Response,
    req: Request,
) -> biDetailModels.BIDetailResponse:
    """Basic Information Login 상세 정보

    Args:
        request (biDetailModels.BIDetailRequest): 애플리케이션 ID, 운영체제, 시작일, 종료일
        
        {
            "applicationId": 0,
            "startDate": "2025-01-01",
            "endDate": "2025-01-31",
            "tmzutc": 540
        }

        - tmzutc (필수): 조회 기준 타임존의 UTC 오프셋(분). 예) 한국(+9)은 540, 뉴욕(-5)은 -300

    Returns:
        biDetailModels.BIDetailResponse: BI Log 상세 정보
        
        {
        "dailyAndroid" : [
            {"date": "2025-01-01","value": 1000},
            {"date": "2025-01-02","value": 1200},
            {"date": "2025-01-03","value": 1400},
            {"date": "2025-01-04","value": 1000},
            {"date": "2025-01-05","value": 10030},
            {"date": "2025-01-06","value": 10200},
            {"date": "2025-01-07","value": 100}
        ],
        "dailyIOS" : [
            {"date": "2025-01-01","value": 1000},
            {"date": "2025-01-02","value": 1200},
            {"date": "2025-01-03","value": 1400},
            {"date": "2025-01-04","value": 1000},
            {"date": "2025-01-05","value": 10030},
            {"date": "2025-01-06","value": 10200},
            {"date": "2025-01-07","value": 100}
        ]
    }
    
    """
    return _build_metric_response(
        application_id=request.applicationId,
        start_date=request.startDate,
        end_date=request.endDate,
        metric_key="log",
        selected_date=request.selectedDate,
        context_path=req.url.path if req else None,
    )


@app.post(
    "/PTotalAnalysis/BIDetailLogin",
    response_model=biDetailModels.BIDetailResponse,
    summary="[TotalAnalysis] BIDetailLogin - BI Login 상세 정보. (Total Log)",
    response_description="처리 결과 코드 및 메시지",
)
async def BIDetailLogin(
    request: biDetailModels.BIDetailRequest,
    response: Response,
    req: Request,
) -> biDetailModels.BIDetailResponse:
    """Basic Information Login 상세 정보

    Args:
        request (biDetailModels.BIDetailRequest): 애플리케이션 ID, 운영체제, 시작일, 종료일
        
        {
            "applicationId": 0,
            "startDate": "2025-01-01",
            "endDate": "2025-01-31",
            "tmzutc": 540
        }

        - tmzutc (필수): 조회 기준 타임존의 UTC 오프셋(분). 예) 한국(+9)은 540, 뉴욕(-5)은 -300

    Returns:
        biDetailModels.BIDetailResponse: BI Log 상세 정보
        
        {
        "dailyAndroid" : [
            {"date": "2025-01-01","value": 1000},
            {"date": "2025-01-02","value": 1200},
            {"date": "2025-01-03","value": 1400},
            {"date": "2025-01-04","value": 1000},
            {"date": "2025-01-05","value": 10030},
            {"date": "2025-01-06","value": 10200},
            {"date": "2025-01-07","value": 100}
        ],
        "dailyIOS" : [
            {"date": "2025-01-01","value": 1000},
            {"date": "2025-01-02","value": 1200},
            {"date": "2025-01-03","value": 1400},
            {"date": "2025-01-04","value": 1000},
            {"date": "2025-01-05","value": 10030},
            {"date": "2025-01-06","value": 10200},
            {"date": "2025-01-07","value": 100}
        ]
    }
    
    """
    return _build_metric_response(
        application_id=request.applicationId,
        start_date=request.startDate,
        end_date=request.endDate,
        metric_key="login",
        selected_date=request.selectedDate,
        context_path=req.url.path if req else None,
    )


@app.post(
    "/PTotalAnalysis/BIDetailMAU",
    response_model=biDetailModels.BIDetailResponse,
    summary="[TotalAnalysis] BIDetailMAU - BI MAU 상세 정보.",
    response_description="처리 결과 코드 및 메시지",
)
async def BIDetailMAU(
    request: biDetailModels.BIDetailRequest,
    response: Response,
    req: Request,
) -> biDetailModels.BIDetailResponse:
    """Basic Information MAU 상세 정보

    Args:
        request (biDetailModels.BIDetailRequest): 애플리케이션 ID, 운영체제, 시작일, 종료일
        
        {
            "applicationId": 0,
            "startDate": "2025-01-01",
            "endDate": "2025-12-31",
            "tmzutc": 540
        }

        - tmzutc (필수): 조회 기준 타임존의 UTC 오프셋(분). 예) 한국(+9)은 540, 뉴욕(-5)은 -300

    Returns:
        biDetailModels.BIDetailResponse: BI MAU 상세 정보
        
        {
        "dailyAndroid" : [
            {"date": "2025-01","value": 1000},
            {"date": "2025-02","value": 1200},
            {"date": "2025-03","value": 1400},
            {"date": "2025-04","value": 1000},
            {"date": "2025-05","value": 10030},
            {"date": "2025-06","value": 10200},
            {"date": "2025-07","value": 100}
        ],
        "dailyIOS" : [
            {"date": "2025-01","value": 1000},
            {"date": "2025-02","value": 1200},
            {"date": "2025-03","value": 1400},
            {"date": "2025-04","value": 1000},
            {"date": "2025-05","value": 10030},
            {"date": "2025-06","value": 10200},
            {"date": "2025-07","value": 100}
        ]
    }
    
    """
    return _build_metric_response(
        application_id=request.applicationId,
        start_date=request.startDate,
        end_date=request.endDate,
        metric_key="mau",
        selected_date=request.selectedDate,
        context_path=req.url.path if req else None,
    )




@app.post(
    "/PTotalAnalysis/BIDetailPV",
    response_model=biDetailModels.BIDetailResponse,
    summary="[TotalAnalysis] BIDetailPV - BI PV 상세 정보.",
    response_description="처리 결과 코드 및 메시지",
)
async def BIDetailPV(
    request: biDetailModels.BIDetailRequest,
    response: Response,
    req: Request,
) -> biDetailModels.BIDetailResponse:
    """Basic Information PV 상세 정보

    Args:
        request (biDetailModels.BIDetailRequest): 애플리케이션 ID, 운영체제, 시작일, 종료일
        
        {
            "applicationId": 0,
            "startDate": "2025-01-01",
            "endDate": "2025-01-31",
            "tmzutc": 540
        }

        - tmzutc (필수): 조회 기준 타임존의 UTC 오프셋(분). 예) 한국(+9)은 540, 뉴욕(-5)은 -300

    Returns:
        biDetailModels.BIDetailResponse: BI 상세 정보
        
        {
        "dailyAndroid" : [
            {"date": "2025-01-01","value": 1000},
            {"date": "2025-01-02","value": 1200},
            {"date": "2025-01-03","value": 1400},
            {"date": "2025-01-04","value": 1000},
            {"date": "2025-01-05","value": 10030},
            {"date": "2025-01-06","value": 10200},
            {"date": "2025-01-07","value": 100}
        ],
        "dailyIOS" : [
            {"date": "2025-01-01","value": 1000},
            {"date": "2025-01-02","value": 1200},
            {"date": "2025-01-03","value": 1400},
            {"date": "2025-01-04","value": 1000},
            {"date": "2025-01-05","value": 10030},
            {"date": "2025-01-06","value": 10200},
            {"date": "2025-01-07","value": 100}
        ]
    }
    
    """
    return _build_metric_response(
        application_id=request.applicationId,
        start_date=request.startDate,
        end_date=request.endDate,
        metric_key="pv",
        selected_date=request.selectedDate,
        context_path=req.url.path if req else None,
    )



@app.post(
    "/PTotalAnalysis/BIDetailRevisit",
    response_model=biDetailModels.BIDetailResponse,
    summary="[TotalAnalysis] BIDetailRevisit - BI Revisit 상세 정보.",
    response_description="처리 결과 코드 및 메시지",
)
async def BIDetailRevisit(
    request: biDetailModels.BIDetailRequest,
    response: Response,
    req: Request,
) -> biDetailModels.BIDetailResponse:
    """Basic Information Revisit 상세 정보

    Args:
        request (biDetailModels.BIDetailRequest): 애플리케이션 ID, 운영체제, 시작일, 종료일
        
        {
            "applicationId": 0,
            "startDate": "2025-01-01",
            "endDate": "2025-01-31",
            "tmzutc": 540
        }

        - tmzutc (필수): 조회 기준 타임존의 UTC 오프셋(분). 예) 한국(+9)은 540, 뉴욕(-5)은 -300

    Returns:
        biDetailModels.BIDetailResponse: BI Revisit 상세 정보
        
        {
        "dailyAndroid" : [
            {"date": "2025-01-01","value": 1000},
            {"date": "2025-01-02","value": 1200},
            {"date": "2025-01-03","value": 1400},
            {"date": "2025-01-04","value": 1000},
            {"date": "2025-01-05","value": 10030},
            {"date": "2025-01-06","value": 10200},
            {"date": "2025-01-07","value": 100}
        ],
        "dailyIOS" : [
            {"date": "2025-01-01","value": 1000},
            {"date": "2025-01-02","value": 1200},
            {"date": "2025-01-03","value": 1400},
            {"date": "2025-01-04","value": 1000},
            {"date": "2025-01-05","value": 10030},
            {"date": "2025-01-06","value": 10200},
            {"date": "2025-01-07","value": 100}
        ]
    }
    
    """
    return _build_metric_response(
        application_id=request.applicationId,
        start_date=request.startDate,
        end_date=request.endDate,
        metric_key="revisit",
        selected_date=request.selectedDate,
        context_path=req.url.path if req else None,
    )

@app.post(
    "/PTotalAnalysis/BIDetailSleep",
    response_model=biDetailModels.BIDetailResponse,
    summary="[TotalAnalysis] BIDetailSleep - BI Sleep 상세 정보.",
    response_description="처리 결과 코드 및 메시지",
)
async def BIDetailSleep(
    request: biDetailModels.BIDetailRequest,
    response: Response,
    req: Request,
) -> biDetailModels.BIDetailResponse:
    """Basic Information Sleep 상세 정보

    Args:
        request (biDetailModels.BIDetailRequest): 애플리케이션 ID, 운영체제, 시작일, 종료일
        
        {
            "applicationId": 0,
            "startDate": "2025-01-01",
            "endDate": "2025-01-31",
            "tmzutc": 540
        }

        - tmzutc (필수): 조회 기준 타임존의 UTC 오프셋(분). 예) 한국(+9)은 540, 뉴욕(-5)은 -300

    Returns:
        biDetailModels.BIDetailResponse: BI Sleep 상세 정보
        
        {
        "dailyAndroid" : [
            {"date": "2025-01-01","value": 1000},
            {"date": "2025-01-02","value": 1200},
            {"date": "2025-01-03","value": 1400},
            {"date": "2025-01-04","value": 1000},
            {"date": "2025-01-05","value": 10030},
            {"date": "2025-01-06","value": 10200},
            {"date": "2025-01-07","value": 100}
        ],
        "dailyIOS" : [
            {"date": "2025-01-01","value": 1000},
            {"date": "2025-01-02","value": 1200},
            {"date": "2025-01-03","value": 1400},
            {"date": "2025-01-04","value": 1000},
            {"date": "2025-01-05","value": 10030},
            {"date": "2025-01-06","value": 10200},
            {"date": "2025-01-07","value": 100}
        ]
    }
    
    """
    return _build_metric_response(
        application_id=request.applicationId,
        start_date=request.startDate,
        end_date=request.endDate,
        metric_key="sleep",
        selected_date=request.selectedDate,
        context_path=req.url.path if req else None,
    )



@app.post(
    "/PTotalAnalysis/BIDetailStay",
    response_model=biDetailModels.BIDetailResponse,
    summary="[TotalAnalysis] BIDetailStay - BI Stay 상세 정보.",
    response_description="처리 결과 코드 및 메시지",
)
async def BIDetailStay(
    request: biDetailModels.BIDetailRequest,
    response: Response,
    req: Request,
) -> biDetailModels.BIDetailResponse:
    """Basic Information Stay 상세 정보

    Args:
        request (biDetailModels.BIDetailRequest): 애플리케이션 ID, 운영체제, 시작일, 종료일
        
        {
            "applicationId": 0,
            "startDate": "2025-01-01",
            "endDate": "2025-01-31",
            "tmzutc": 540
        }

        - tmzutc (필수): 조회 기준 타임존의 UTC 오프셋(분). 예) 한국(+9)은 540, 뉴욕(-5)은 -300

    Returns:
        biDetailModels.BIDetailResponse: BI Stay 상세 정보
        
        {
        "dailyAndroid" : [
            {"date": "2025-01-01","value": 1000},
            {"date": "2025-01-02","value": 1200},
            {"date": "2025-01-03","value": 1400},
            {"date": "2025-01-04","value": 1000},
            {"date": "2025-01-05","value": 10030},
            {"date": "2025-01-06","value": 10200},
            {"date": "2025-01-07","value": 100}
        ],
        "dailyIOS" : [
            {"date": "2025-01-01","value": 1000},
            {"date": "2025-01-02","value": 1200},
            {"date": "2025-01-03","value": 1400},
            {"date": "2025-01-04","value": 1000},
            {"date": "2025-01-05","value": 10030},
            {"date": "2025-01-06","value": 10200},
            {"date": "2025-01-07","value": 100}
        ]
    }
    
    """
    return _build_metric_response(
        application_id=request.applicationId,
        start_date=request.startDate,
        end_date=request.endDate,
        metric_key="stay",
        selected_date=request.selectedDate,
        context_path=req.url.path if req else None,
    )
