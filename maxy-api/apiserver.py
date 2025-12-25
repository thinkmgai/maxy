from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.exceptions import RequestValidationError
from typing import Any, Dict, Iterable, List
import logging
import logging.handlers
import os
import sys
import models.commonModels as commonModels
from starlette.middleware.sessions import SessionMiddleware
from fastapi.middleware.cors import CORSMiddleware
import playload.commonPayload as commonPayload
from pathlib import Path
import csv
from datetime import datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import fastapi
print(fastapi.__version__)

DEFAULT_WIDGET_IDS: tuple[int, ...] = (1, 2, 3, 5, 8, 12, 15, 7)

port = 8080
if "PORT" in os.environ:
    port = int(os.environ["PORT"])


    
    
app = FastAPI(
    title="맥시 API 서버",
    description="Maxy API 서버",
    version="1.0.0",
    docs_url="/docs",       # Swagger UI URL 변경
    redoc_url="/redoc",   # ReDoc URL 변경
)
app.add_middleware(
    SessionMiddleware,
    secret_key="maxy_02_2202_5651",
    session_cookie="maxy_session",  # 쿠키 이름 변경
    max_age=3600,                   # 1시간 유효
    https_only=False
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ✅ 반드시 정확한 origin 지정
    allow_credentials=True,                   # ✅ 쿠키 포함 허용
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    # ⚠️ 로그 자동 출력
    logger.warning(
        "422 Validation Error: %s\nRequest body: %s",
        exc.errors(),
        (await request.body()).decode("utf-8", errors="ignore"),
    )

    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
    )


# Import modules that register additional routes after the FastAPI app has been created.
import PTotalAnalysis  # noqa: E402,F401
import PFunnelAnalysis  # noqa: E402,F401
import PPerformanceAnalysis  # noqa: E402,F401
import widget.ResponsTimeS  # noqa: E402,F401
import widget.Logmeter  # noqa: E402,F401
import widget.Favorites  # noqa: E402,F401
import widget.VersionComparison  # noqa: E402,F401
import widget.AreaDistribution  # noqa: E402,F401
import widget.ResourceUsage  # noqa: E402,F401
import widget.PageView  # noqa: E402,F401
import widget.PVEqualizer  # noqa: E402,F401
import widget.Accessibility  # noqa: E402,F401
import widget.DeviceDistribution  # noqa: E402,F401
import Waterfall  # noqa: E402,F401
import PManagement  # noqa: E402,F401

DATA_DIR = Path(__file__).resolve().parent / "Data"
USER_CSV = DATA_DIR / "user.csv"
GROUP_USER_MAP_CSV = DATA_DIR / "group_user_map.csv"
GROUP_APP_MAP_CSV = DATA_DIR / "group_app_map.csv"
APPLICATION_CSV = DATA_DIR / "application.csv"


def _resolve_tmzutc(timezone_name: str | None) -> int:
    """Return UTC offset in minutes based on IANA timezone name or fallback minutes."""

    if timezone_name:
        try:
            tz = ZoneInfo(timezone_name)
            offset = datetime.now(tz).utcoffset()
            if offset is not None:
                return int(offset.total_seconds() // 60)
        except ZoneInfoNotFoundError:
            logger.warning("Unknown timezone %s provided; using server offset.", timezone_name)
        except Exception as exc:  # pragma: no cover - defensive
            logger.warning("Failed to resolve timezone %s (%s); using fallback.", timezone_name, exc)

    offset = datetime.now().astimezone().utcoffset()
    return int(offset.total_seconds() // 60) if offset else 0

def SetLog(index):
    if logging.getLogger().handlers:
        return

    os.makedirs("log", exist_ok=True)
    file_handler = logging.handlers.TimedRotatingFileHandler(filename=os.path.join("log",f"api_{index}.txt"), 
                                                             when='midnight', interval=1,  
                                                             encoding='utf-8')
    file_handler.suffix = 'log_%Y-%m-%d' # 파일명 끝에 붙여줌; ex. log-20190811
    stream_handler = logging.StreamHandler(sys.stdout)
    file_handler.setLevel(logging.ERROR)
    stream_handler.setLevel(logging.INFO)
    logging.basicConfig(format = 'P]%(asctime)s:%(levelname)s - %(message)s',datefmt = '%Y-%m-%d %p %I:%M:%S',handlers=[file_handler, stream_handler],level=logging.INFO)

# Configure logging once at import time.
SetLog(os.getenv("API_LOG_INDEX", str(port)))
logger = logging.getLogger('maxy')

@app.get("/",summary="Root - 상태확인")
async def root():
    """상태확인

    Returns:
    
        Dict: {"상태": "좋음.."}
    """
    return {"상태": "좋음.."}

@app.get(
    "/Session/check",
    response_model=commonModels.DefaultResponse,
    summary="[Root] SessionCheck - 세션 유효성 확인",
    response_description="처리 결과 코드 및 메시지",
)
async def SessionCheck(req: Request):
    """세션 유효성 확인

    Returns:
        DefaultResponse: 세션이 유효하면 code=200, 아니면 code=401
    """

    user_id = req.session.get("userId")
    if not user_id:
        return commonModels.DefaultResponse(code=401, message="Unauthorized")

    return commonModels.DefaultResponse(code=200, message="Success")



@app.post('/AppList',response_model=commonModels.AppListResponse, summary="[Root] AppList - 애플리케이션 리스트.", response_description="처리 결과 코드 및 메시지")
async def AppList(request: commonModels.AppListRequest, response: Response, req: Request):
    """ 프로젝트에서 활성화된 애플리케이션 리스트을 가져온다.

    Args:
        request (models.AppListRequest): 애플리케이션 리스트 요청
        
        {
            "userNo": 0,
            "osType": "all"
        }

    Returns:
        models.AppListResponse: 애플리케이션 리스트 응답
        
        {
            "code": 200,
            "applicationList": [
                {
                    "applicationId": 0,
                    "applicationName": "Application Name",
                    "applicationDescription": "Application Description"
                }
            ],
            "message": "Success"
        }
    """
    user_no = request.userNo
    applications_map = _load_applications()
    if not applications_map:
        return commonModels.AppListResponse(code=200, applicationList=[], message="Success")

    users = _load_users()
    matched_user = next((user for user in users if user.get("userNo") == user_no), None)
    is_admin_user = matched_user is not None and matched_user.get("level") == 100

    user_groups: set[int] = set()
    if not is_admin_user and GROUP_USER_MAP_CSV.exists():
        with GROUP_USER_MAP_CSV.open("r", newline="", encoding="utf-8") as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                try:
                    mapped_user = int(row.get("userNo", ""))
                    group_id = int(row.get("group", ""))
                except (TypeError, ValueError):
                    continue
                if mapped_user == user_no:
                    user_groups.add(group_id)

    if not is_admin_user and not user_groups:
        return commonModels.AppListResponse(code=200, applicationList=[], message="Success")

    allowed_app_ids: set[int] = set()
    if is_admin_user:
        allowed_app_ids.update(applications_map.keys())
    elif GROUP_APP_MAP_CSV.exists():
        with GROUP_APP_MAP_CSV.open("r", newline="", encoding="utf-8") as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                try:
                    group_id = int(row.get("group", ""))
                    application_id = int(row.get("applicationId", ""))
                except (TypeError, ValueError):
                    continue
                if group_id in user_groups:
                    allowed_app_ids.add(application_id)

    application_list: list[dict[str, Any]] = []
    sorted_app_ids = sorted(
        allowed_app_ids,
        key=lambda app_id: applications_map.get(app_id, {}).get("order", 0),
    )
    for app_id in sorted_app_ids:
        app_info = applications_map.get(app_id)
        if not app_info:
            continue
        application_list.append(
            {
                "applicationId": app_info["applicationId"],
                "appName": app_info["appName"],
                "packageId": app_info["packageId"],
            }
        )

    return commonModels.AppListResponse(code=200, applicationList=application_list, message="Success")




@app.post('/Login',response_model=commonModels.LoginResponse, summary="[Root] Login - 로그인 [Session 저장]", response_description="처리 결과 코드 및 메시지")
async def Login(request: commonModels.LoginRequest, response: Response, req: Request):
    """로그인 (결과물은 [Session 저장])
    - Language : ko,en
    - Level : 사용자 레벨
    - ProjectID : 선택된 프로젝트 ID

    Args:
        request (models.LoginRequest): 로그인 요청
        
        {
            "userId": "userId",
            "password": "password",
            "timezone": "Asia/Seoul",
        }

    Returns:
        models.LoginResponse: 로그인 응답
        
        {
            "Code": 200,
            "Message": "Success"
        }
    """
    userId = request.userId
    password = request.password

    users = _load_users()
    matched = next((user for user in users if user["userId"] == userId and user["password"] == password), None)
    if not matched:
        raise HTTPException(status_code=401, detail="아이디 혹은 비밀번호가 일치하지 않습니다.")

    resolved_tmzutc = _resolve_tmzutc(request.timezone)

    req.session["userId"] = userId
    req.session["level"] = matched.get("level", 0)
    req.session["userNo"] = matched.get("userNo")
    req.session["tmzutc"] = resolved_tmzutc
    if request.timezone:
        req.session["timezone"] = request.timezone
    return commonModels.LoginResponse(code=200, message="Success")

@app.post('/OTPLogin',response_model=commonModels.OTPLoginResponse, summary="[Root] OTPLogin - OTP로그인.", response_description="처리 결과 코드 및 메시지")
async def OTPLogin(request: commonModels.OTPLoginRequest, response: Response, req: Request):
    """OTP로그인

    Args:
        request (models.OTPLoginRequest): OTP로그인 요청
        
        {
            "otp": "otp",
            "timezone": "Asia/Seoul"
        }

    Returns:
        models.OTPLoginResponse: OTP로그인 응답
        
        - userId : 사용자ID
        - language : 언어
        - level : 사용자레벨
        - projectId : 프로젝트ID
        - applicationId : 애플리케이션ID
        - widgetIds : 위젯 ID 리스트 8개
            - 1: Logmeter
            - 2: Loading Time (S)
            - 3: Response time (S)
            - 4: PV Equalizer
            - 5: Resource Usage
            - 6: Device Distribution
            - 7: Accessibility
            - 8: Favorites
            - 9: Marketing Insight
            - 10: Version Conversion
            - 11: Crashes by Version
            - 12: Version Comparison
            - 13: Response Time (L)
            - 14: Loading  Time (L)
            - 15: Area Distribution
            - 16: Page View
        - message : 메시지
        
        {
            "code": 200,
            "userId": "userId",
            "language": "ko",
            "level": 0,
            "projectId": 0,
            "applicationId": 0,
            "widgetIds": [12, 1, 5, 3, 4, 2, 15, 8],
            "message": "success"
        }
    """
    userId = req.session.get("userId")
    if userId is None:
        return commonModels.DefaultResponse(code=401, message="Unauthorized")
    response.set_cookie("userId", userId)
    resolved_tmzutc = _resolve_tmzutc(request.timezone)
    req.session["tmzutc"] = resolved_tmzutc
    if request.timezone:
        req.session["timezone"] = request.timezone

    level = req.session.get("level")
    user_no = req.session.get("userNo")
    users = _load_users()
    matched = next((user for user in users if user["userId"] == userId), None)
    if matched:
        if level is None:
            level = matched.get("level", 0)
            req.session["level"] = level
        if user_no is None:
            user_no = matched.get("userNo")
            req.session["userNo"] = user_no
    level = int(level or 0)
    user_no = int(user_no or 0)

    widget_ids = matched.get("widgets") if matched else _default_widget_list()
    return commonModels.OTPLoginResponse(
        code=200,
        userNo=user_no,
        userId=userId,
        language="ko",
        level=level,
        projectId=1,
        applicationId=1,
        widgetIds=widget_ids,
        message="success",
    )


@app.post(
    "/UpdateUserInfo",
    response_model=commonModels.UpdateUserInfoResponse,
    summary="[Root] UpdateUserInfo - 사용자 위젯 설정 저장",
    response_description="처리 결과 코드 및 메시지",
)
async def update_user_info(
    request: commonModels.UpdateUserInfoRequest, req: Request
):
    """사용자 위젯 구성을 저장한다.

    Args:
        request (commonModels.UpdateUserInfoRequest): 업데이트할 사용자 정보

        {
            "userNo": 1,
            "widgets": [1, 2, 3, 5, 8, 12, 15, 7]
        }

    Returns:
        UpdateUserInfoResponse: 저장된 사용자 위젯 목록
    """

    user_id = req.session.get("userId")
    if user_id is None:
        return commonModels.DefaultResponse(code=401, message="Unauthorized")

    session_user_no = req.session.get("userNo")
    if session_user_no is not None and int(session_user_no or 0) != request.userNo:
        return commonModels.DefaultResponse(code=403, message="Forbidden")

    users = _load_users()
    matched = next((user for user in users if user["userNo"] == request.userNo), None)
    if not matched or matched.get("userId") != user_id:
        return commonModels.DefaultResponse(code=404, message="User not found")

    widget_ids = _sanitize_widget_ids(request.widgets)
    if not _update_user_widgets(request.userNo, widget_ids):
        return commonModels.DefaultResponse(code=500, message="저장에 실패했습니다.")

    return commonModels.UpdateUserInfoResponse(
        code=200,
        userNo=request.userNo,
        widgets=widget_ids,
        message="Success",
    )




    
SetLog(port)    
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("apiserver:app", host="0.0.0.0", port=port, reload=True)
# import PPerformanceAnalysis  # noqa: E402,F401
def _load_users() -> List[dict]:
    if not USER_CSV.exists():
        return []
    _ensure_widgets_column()
    users: List[dict] = []
    with USER_CSV.open("r", newline="", encoding="utf-8") as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            user_id = row.get("userId")
            if not user_id:
                continue
            try:
                user_no = int(row.get("userNo") or 0)
            except (TypeError, ValueError):
                continue
            users.append(
                {
                    "userNo": user_no,
                    "userId": user_id,
                    "password": row.get("password", ""),
                    "level": int(row.get("level") or 0),
                    "widgets": _parse_widget_ids(row.get("widgets")),
                }
            )
    return users

def _load_applications() -> dict[int, dict[str, Any]]:
    applications: dict[int, dict[str, str]] = {}
    if not APPLICATION_CSV.exists():
        return applications
    with APPLICATION_CSV.open("r", newline="", encoding="utf-8") as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            try:
                app_id = int(row.get("applicationId", ""))
            except (TypeError, ValueError):
                continue
            applications[app_id] = {
                "applicationId": app_id,
                "appName": row.get("appName") or "",
                "packageId": row.get("packageId") or "",
                "serverType": row.get("serverType") or "",
                "order": int(row.get("order") or 0),
            }
    return applications


def _default_widget_list() -> list[int]:
    return list(DEFAULT_WIDGET_IDS)


def _widget_list_to_str(widget_ids: Iterable[int]) -> str:
    return ", ".join(str(widget_id) for widget_id in widget_ids)


def _sanitize_widget_ids(widget_ids: Iterable[Any]) -> list[int]:
    sanitized: list[int] = []
    seen: set[int] = set()
    for widget_id in widget_ids:
        try:
            widget_value = int(widget_id)
        except (TypeError, ValueError):
            continue
        if widget_value <= 0 or widget_value in seen:
            continue
        sanitized.append(widget_value)
        seen.add(widget_value)
    return sanitized or _default_widget_list()


def _parse_widget_ids(raw_value: str | None) -> list[int]:
    if not raw_value:
        return _default_widget_list()
    tokens: list[str] = []
    for chunk in raw_value.split(","):
        token = chunk.strip()
        if token:
            tokens.append(token)
    return _sanitize_widget_ids(tokens)


def _ensure_widgets_column() -> None:
    if not USER_CSV.exists():
        return
    with USER_CSV.open("r", newline="", encoding="utf-8") as csvfile:
        reader = csv.DictReader(csvfile)
        rows = list(reader)
        fieldnames = list(reader.fieldnames or [])
    if not fieldnames:
        return
    updated = False
    if "widgets" not in fieldnames:
        fieldnames.append("widgets")
        updated = True
        for row in rows:
            row["widgets"] = _widget_list_to_str(DEFAULT_WIDGET_IDS)
    else:
        for row in rows:
            current = row.get("widgets")
            if current is None or not current.strip():
                row["widgets"] = _widget_list_to_str(DEFAULT_WIDGET_IDS)
                updated = True
    if updated:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        with USER_CSV.open("w", newline="", encoding="utf-8") as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)


def _update_user_widgets(target_user_no: int, widget_ids: list[int]) -> bool:
    if not USER_CSV.exists():
        return False
    _ensure_widgets_column()
    with USER_CSV.open("r", newline="", encoding="utf-8") as csvfile:
        reader = csv.DictReader(csvfile)
        rows = list(reader)
        fieldnames = list(reader.fieldnames or [])
    if not fieldnames:
        return False
    if "widgets" not in fieldnames:
        fieldnames.append("widgets")
    updated = False
    widget_value = _widget_list_to_str(widget_ids)
    for row in rows:
        try:
            row_user_no = int(row.get("userNo") or 0)
        except (TypeError, ValueError):
            continue
        if row_user_no == target_user_no:
            row["widgets"] = widget_value
            updated = True
            break
    if not updated:
        return False
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with USER_CSV.open("w", newline="", encoding="utf-8") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    return True
