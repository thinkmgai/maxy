from __future__ import annotations

from apiserver import app, DEFAULT_WIDGET_IDS
from fastapi import HTTPException, Request
from models import managementModels
from datetime import datetime, timedelta
import csv
from pathlib import Path


def _now() -> str:
    return datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

def _expired_at() -> str:
    return (datetime.utcnow() + timedelta(days=365)).strftime("%Y-%m-%d %H:%M:%S")


DATA_DIR = Path(__file__).resolve().parent.parent / "Data"
APP_SETTINGS_CSV = DATA_DIR / "application.csv"
USER_CSV = DATA_DIR / "user.csv"
GROUP_CSV = DATA_DIR / "group.csv"
GROUP_USER_MAP_CSV = DATA_DIR / "group_user_map.csv"
GROUP_APP_MAP_CSV = DATA_DIR / "group_app_map.csv"

APP_SETTINGS_FIELDS = [
    "applicationId",
    "appName",
    "packageId",
    "serverType",
    "fullMsg",
    "pageLogPeriod",
    "loggingRate",
    "order",
]

DATA_DIR = Path(__file__).resolve().parent.parent / "Data"
APP_SETTINGS_CSV = DATA_DIR / "application.csv"
USER_CSV = DATA_DIR / "user.csv"
GROUP_CSV = DATA_DIR / "group.csv"
GROUP_USER_MAP_CSV = DATA_DIR / "group_user_map.csv"
GROUP_APP_MAP_CSV = DATA_DIR / "group_app_map.csv"

APP_SETTINGS_FIELDS = [
    "applicationId",
    "appName",
    "packageId",
    "serverType",
    "fullMsg",
    "pageLogPeriod",
    "loggingRate",
    "order",
]

USER_FIELDS = [
    "userNo",
    "userId",
    "userName",
    "email",
    "password",
    "level",
    "status",
    "createdAt",
    "updatedAt",
    "expiredAt",
    "widgets",
]

DEFAULT_WIDGET_STRING = ", ".join(str(widget_id) for widget_id in DEFAULT_WIDGET_IDS)

GROUP_FIELDS = [
    "group",
    "groupName",
    "groupDescription",
]

GROUP_USER_MAP_FIELDS = [
    "group",
    "userNo",
]

GROUP_APP_MAP_FIELDS = [
    "group",
    "applicationId",
]

MANAGEMENT_MENU: list[managementModels.ManagementMenuSection] = [
    managementModels.ManagementMenuSection(
        label="종합",
        items=[
            managementModels.ManagementMenuItem(
                label="Components",
                menuId=1,
                status=1,
            ),
            managementModels.ManagementMenuItem(
                label="Basic Information",
                menuId=2,
                status=1,
            ),
            managementModels.ManagementMenuItem(
                label="Alias Management",
                menuId=3,
                status=1,
            ),
            managementModels.ManagementMenuItem(
                label="Log Description",
                menuId=4,
                status=1,
            ),
        ],
    ),
    managementModels.ManagementMenuSection(
        label="사용자",
        items=[
            managementModels.ManagementMenuItem(
                label="사용자",
                menuId=5,
                status=1,
            ),
            managementModels.ManagementMenuItem(
                label="그룹",
                menuId=6,
                status=1,
            ),
        ],
    ),
    managementModels.ManagementMenuSection(
        label="장치",
        items=[
            managementModels.ManagementMenuItem(
                label="장치 현황",
                menuId=7,
                status=1,
            ),
            managementModels.ManagementMenuItem(
                label="디바이스 모델",
                menuId=8,
                status=1,
            ),
        ],
    ),
    managementModels.ManagementMenuSection(
        label="스토어",
        items=[
            managementModels.ManagementMenuItem(
                label="스토어 분석",
                menuId=9,
                status=1,
            ),
        ],
    ),
    managementModels.ManagementMenuSection(
        label="난독화",
        items=[
            managementModels.ManagementMenuItem(
                label="Obfuscation Rule Mgmt.",
                menuId=10,
                status=1,
            ),
            managementModels.ManagementMenuItem(
                label="DSYM 관리",
                menuId=11,
                status=1,
            ),
        ],
    ),
    managementModels.ManagementMenuSection(
        label="AI Bot",
        items=[
            managementModels.ManagementMenuItem(
                label="AI Bot 관리",
                menuId=12,
                status=1,
            ),
        ],
    ),
    managementModels.ManagementMenuSection(
        label="시스템 설정",
        items=[
            managementModels.ManagementMenuItem(label="App 설정", menuId=13, status=1),
            managementModels.ManagementMenuItem(label="예외 처리", menuId=14, status=1),
            managementModels.ManagementMenuItem(label="배치 초회", menuId=15, status=1),
            managementModels.ManagementMenuItem(label="시스템 로그", menuId=16, status=1),
            managementModels.ManagementMenuItem(label="Access 로그", menuId=17, status=1),
        ],
    ),
]


@app.post(
    "/PManagement/menu",
    response_model=managementModels.ManagementMenuResponse,
    summary="[PManagement] managementMenu - 좌측 메뉴 구성.",
    response_description="처리 결과 코드 및 메시지",
)
async def management_menu(request: Request) -> managementModels.ManagementMenuResponse:
    """좌측 관리 메뉴 구성을 정적 데이터로 반환한다.
    
    Args:
        request (Request): Request object.
        
        {
            "user_id": "user_id",
            "lang": "lang",
            "level": "level"
        }

    Returns:
        managementModels.ManagementMenuResponse: 좌측 관리 메뉴 구성을 정적 데이터로 반환한다.
        
        {
            "code": 200,
            "menu": [
                {
                    "label": "종합",
                    "items": [
                        {
                            "label": "Components",
                            "menuId": 1,
                            "status": 1,
                        },
                        {
                            "label": "Basic Information",
                            "menuId": 2,
                            "status": 1,
                        },
                        {
                            "label": "Alias Management",
                            "menuId": 3,
                            "status": 1,
                        },
                        {
                            "label": "Log Description",
                            "menuId": 4,
                            "status": 1,
                        },
                    ],
                },
                {
                    "label": "사용자",
                    "items": [
                        {
                            "label": "그룹 등록/삭제",
                            "menuId": 5,
                            "status": 1,
                        },
                        {
                            "label": "사용자 등록/삭제",
                            "menuId": 6,
                            "status": 1,
                        }
                    ],
                },
                {
                    "label": "장치",
                    "items": [
                        {
                            "label": "장치 현황",
                            "menuId": 7,
                            "status": 1,
                        },
                        {
                            "label": "디바이스 모델",
                            "menuId": 8,
                            "status": 1,
                        },
                    ],
                },
                {
                    "label": "스토어",
                    "items": [
                        {
                            "label": "스토어 분석",
                            "menuId": 9,
                            "status": 1,
                        },
                    ],
                },
                {
                    "label": "난독화",
                    "items": [
                        {
                            "label": "Obfuscation Rule Mgmt.",
                            "menuId": 10,
                            "status": 1,
                        },
                        {
                            "label": "DSYM 관리",
                            "menuId": 11,
                            "status": 1,
                        },
                    ],
                },
                {
                    "label": "AI Bot",
                    "items": [
                        {
                            "label": "AI Bot 관리",
                            "menuId": 12,
                            "status": 1,
                        },
                    ],
                },
                {
                    "label": "시스템 설정",
                    "items": [
                        {
                            "label": "App 설정",
                            "menuId": 13,
                            "status": 1,
                        },
                        {
                            "label": "예외 처리",
                            "menuId": 14,
                            "status": 1,
                        },
                        {
                            "label": "배치 초회",
                            "menuId": 15,
                            "status": 1,
                        },
                        {
                            "label": "시스템 로그",
                            "menuId": 16,
                            "status": 1,
                        },
                        {
                            "label": "Access 로그",
                            "menuId": 17,
                            "status": 1,
                        },
                    ],
                },
            ],
            "message": "Success"
        }
    """

    try:
        body = await request.json()
    except Exception:
        body = {}

    level = body.get("level")
    try:
        level_value = None if level is None else int(level)
    except (TypeError, ValueError):
        level_value = None

    if level_value not in (100, 1):
        menu: list[managementModels.ManagementMenuSection] = []
    else:
        menu = [section for section in MANAGEMENT_MENU]
        if level_value == 1:
            menu = [section for section in menu if section.label != "시스템 설정"]

    return managementModels.ManagementMenuResponse(menu=menu)


def _matches_keyword(user: dict, keyword: str | None) -> bool:
    if not keyword:
        return True
    lowered = keyword.lower()
    return lowered in user["userId"].lower() or lowered in user["userName"].lower()


def _matches_status(user: dict, status: int | None) -> bool:
    if status is None:
        return True
    return int(user["status"]) == int(status)


def _matches_group(group: dict, keyword: str | None, application_id: int | None) -> bool:
    if keyword:
        lowered = keyword.lower()
        group_text = str(group["group"]).lower()
        if (
            lowered not in group_text
            and lowered not in group["groupName"].lower()
            and lowered not in group.get("groupDescription", "").lower()
        ):
            return False
    if application_id is not None and application_id not in group["applicationIds"]:
        return False
    return True


def _ensure_file(path: Path, fieldnames: list[str]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        with path.open("w", newline="", encoding="utf-8") as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()


def _load_users() -> list[dict]:
    _ensure_file(USER_CSV, USER_FIELDS)
    users: list[dict] = []
    with USER_CSV.open("r", newline="", encoding="utf-8") as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            if not row.get("userNo"):
                continue
            users.append(
                {
                    "userNo": int(row["userNo"]),
                                        "userId": row.get("userId", ""),
                    "userName": row.get("userName", ""),
                    "email": row.get("email", ""),
                    "password": row.get("password", ""),
                    "level": int(row.get("level", 0) or 0),
                    "status": int(row.get("status", 0) or 0),
                    "createdAt": row.get("createdAt", _now()),
                    "updatedAt": row.get("updatedAt", _now()),
                    "expiredAt": row.get("expiredAt", _expired_at()),
                    "widgets": (row.get("widgets", "").strip() or DEFAULT_WIDGET_STRING),
                }
            )
    return users


def _write_users(users: list[dict]) -> None:
    _ensure_file(USER_CSV, USER_FIELDS)
    with USER_CSV.open("w", newline="", encoding="utf-8") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=USER_FIELDS)
        writer.writeheader()
        for user in users:
            writer.writerow(user)


def _load_users() -> list[dict]:
    _ensure_file(USER_CSV, USER_FIELDS)
    users: list[dict] = []
    with USER_CSV.open("r", newline="", encoding="utf-8") as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            if not row.get("userNo"):
                continue
            users.append(
                {
                    "userNo": int(row["userNo"]),
                                        "userId": row.get("userId", ""),
                    "userName": row.get("userName", ""),
                    "email": row.get("email", ""),
                    "password": row.get("password", ""),
                    "level": int(row.get("level", 0) or 0),
                    "status": int(row.get("status", 0) or 0),
                    "createdAt": row.get("createdAt", _now()),
                    "updatedAt": row.get("updatedAt", _now()),
                    "expiredAt": row.get("expiredAt", _expired_at()),
                    "widgets": (row.get("widgets", "").strip() or DEFAULT_WIDGET_STRING),
                }
            )
    return users


def _write_users(users: list[dict]) -> None:
    _ensure_file(USER_CSV, USER_FIELDS)
    with USER_CSV.open("w", newline="", encoding="utf-8") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=USER_FIELDS)
        writer.writeheader()
        for user in users:
            writer.writerow(user)


def _load_app_settings() -> list[dict]:
    _ensure_file(APP_SETTINGS_CSV, APP_SETTINGS_FIELDS)
    settings: list[dict] = []
    with APP_SETTINGS_CSV.open("r", newline="", encoding="utf-8") as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            if not row.get("applicationId"):
                continue
            settings.append(
                {
                    "applicationId": int(row["applicationId"]),
                    "appName": row.get("appName", ""),
                    "packageId": row.get("packageId", ""),
                    "serverType": row.get("serverType", ""),
                    "fullMsg": row.get("fullMsg", "true").lower() in {"true", "1", "yes"},
                    "pageLogPeriod": int(row.get("pageLogPeriod", 0) or 0),
                    "loggingRate": float(row.get("loggingRate", 0) or 0),
                    "order": int(row.get("order", 0) or 0),
                }
            )
    return settings


def _write_app_settings(settings: list[dict]) -> None:
    _ensure_file(APP_SETTINGS_CSV, APP_SETTINGS_FIELDS)
    with APP_SETTINGS_CSV.open("w", newline="", encoding="utf-8") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=APP_SETTINGS_FIELDS)
        writer.writeheader()
        for setting in settings:
            writer.writerow(
                {
                    "applicationId": setting["applicationId"],
                    "appName": setting["appName"],
                    "packageId": setting.get("packageId", ""),
                    "serverType": setting.get("serverType", ""),
                    "fullMsg": "true" if setting["fullMsg"] else "false",
                    "pageLogPeriod": setting["pageLogPeriod"],
                    "loggingRate": setting["loggingRate"],
                    "order": setting["order"],
                }
            )


def _load_groups() -> list[dict]:
    _ensure_file(GROUP_CSV, GROUP_FIELDS)
    _ensure_file(GROUP_USER_MAP_CSV, GROUP_USER_MAP_FIELDS)
    _ensure_file(GROUP_APP_MAP_CSV, GROUP_APP_MAP_FIELDS)
    groups: dict[int, dict] = {}
    with GROUP_CSV.open("r", newline="", encoding="utf-8") as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            if not row.get("group"):
                continue
            group_id = int(row["group"])
            groups[group_id] = {
                "group": group_id,
                "groupName": row.get("groupName", ""),
                "groupDescription": row.get("groupDescription", ""),
                "userNos": [],
                "applicationIds": [],
            }
    with GROUP_USER_MAP_CSV.open("r", newline="", encoding="utf-8") as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            if not row.get("group") or not row.get("userNo"):
                continue
            group_id = int(row["group"])
            user_no = int(row["userNo"])
            if group_id in groups:
                groups[group_id]["userNos"].append(user_no)
    with GROUP_APP_MAP_CSV.open("r", newline="", encoding="utf-8") as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            if not row.get("group") or not row.get("applicationId"):
                continue
            group_id = int(row["group"])
            application_id = int(row["applicationId"])
            if group_id in groups:
                groups[group_id]["applicationIds"].append(application_id)
    return list(groups.values())


def _write_groups(groups: list[dict]) -> None:
    _ensure_file(GROUP_CSV, GROUP_FIELDS)
    _ensure_file(GROUP_USER_MAP_CSV, GROUP_USER_MAP_FIELDS)
    _ensure_file(GROUP_APP_MAP_CSV, GROUP_APP_MAP_FIELDS)
    with GROUP_CSV.open("w", newline="", encoding="utf-8") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=GROUP_FIELDS)
        writer.writeheader()
        for group in groups:
            writer.writerow(
                {
                    "group": group["group"],
                    "groupName": group["groupName"],
                    "groupDescription": group.get("groupDescription", ""),
                }
            )
    with GROUP_USER_MAP_CSV.open("w", newline="", encoding="utf-8") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=GROUP_USER_MAP_FIELDS)
        writer.writeheader()
        for group in groups:
            for user_no in group.get("userNos", []):
                writer.writerow({"group": group["group"], "userNo": user_no})
    with GROUP_APP_MAP_CSV.open("w", newline="", encoding="utf-8") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=GROUP_APP_MAP_FIELDS)
        writer.writeheader()
        for group in groups:
            for application_id in group.get("applicationIds", []):
                writer.writerow({"group": group["group"], "applicationId": application_id})


def _build_user_groups_map() -> dict[int, list[managementModels.ManagementUserGroup]]:
    groups = _load_groups()
    app_settings = {setting["applicationId"]: setting["appName"] for setting in _load_app_settings()}
    user_groups: dict[int, list[managementModels.ManagementUserGroup]] = {}
    for group in groups:
        applications = [
            managementModels.ManagementUserGroupApplication(
                applicationId=app_id,
                appName=app_settings.get(app_id, f"Application {app_id}"),
            )
            for app_id in group.get("applicationIds", [])
        ]
        group_model = managementModels.ManagementUserGroup(
            group=group["group"],
            groupName=group["groupName"],
            applications=applications,
        )
        for user_no in group.get("userNos", []):
            user_groups.setdefault(user_no, []).append(group_model)
    return user_groups

@app.post(
    "/PManagement/User/list",
    response_model=managementModels.ManagementUserListResponse,
    summary="[PManagement] 사용자 리스트 조회",
)
async def management_user_list(
    request: managementModels.ManagementUserListRequest,
) -> managementModels.ManagementUserListResponse:
    """ 사용자 리스트 조회

    Args:
        request (managementModels.ManagementUserListRequest): 사용자 리스트 조회 요청
        
        {
            "keyword": "admin",
            "status": "ACTIVE",
        }

    Returns:
        managementModels.ManagementUserListResponse: 사용자 리스트 조회 응답
        
        {
           "code": 200,
           "users": [
                {
                    "userNo": 0,
                                "userId": "admin",
                    "userName": "시스템 관리자",
                    "email": "admin@example.com",
                    "level": 0,
                    "status": 1,
                    "createdAt": "2025-11-08T17:33:00",
                    "updatedAt": "2025-11-08T17:33:00"
                }
            ],
            "message": "Success"    
        }
    """
    users = _load_users()
    user_groups_map = _build_user_groups_map()
    filtered: list[managementModels.ManagementUser] = []
    for user in users:
        if _matches_keyword(user, request.keyword) and _matches_status(user, request.status):
            payload = dict(user)
            payload["groups"] = user_groups_map.get(user["userNo"], [])
            filtered.append(managementModels.ManagementUser(**payload))
    return managementModels.ManagementUserListResponse(
        users=filtered,
        totalCount=len(filtered),
        message="Success",
    )


@app.post(
    "/PManagement/User/create",
    response_model=managementModels.ManagementUserMutationResponse,
    summary="[PManagement] 사용자 등록",
)
async def management_user_create(
    request: managementModels.ManagementUserCreateRequest,
) -> managementModels.ManagementUserMutationResponse:
    """ 사용자 등록

    Args:
        request (managementModels.ManagementUserCreateRequest): 사용자 등록 요청
        
        {
            "userId": "admin",
            "userName": "시스템 관리자",
            "email": "admin@example.com",
            "level": 0,
            "status": 1,
        }

    Raises:
        HTTPException: 이미 존재하는 사용자 ID

    Returns:
        managementModels.ManagementUserMutationResponse: 사용자 등록 응답
        
        {
            "user": {
                "userNo": 0,
                "userId": "admin",
                "userName": "시스템 관리자",
                "email": "admin@example.com",
                "level": 100,
                "status": 1,
                "createdAt": "2025-11-08T17:33:00",
                "updatedAt": "2025-11-08T17:33:00",
                "expiredAt": "2025-11-08T17:33:00"
            },
            "message": "Created",
        }
    """
    users = _load_users()
    if any(user["userId"].lower() == request.userId.lower() for user in users):
        raise HTTPException(status_code=400, detail="이미 존재하는 사용자 ID 입니다.")

    now = _now()
    user_dict = {
        "userNo": max((user["userNo"] for user in users), default=0) + 1,
        "userId": request.userId,
        "userName": request.userName,
        "email": request.email,
        "password": request.password,
        "level": request.level,
        "status": request.status,
        "createdAt": now,
        "updatedAt": now,
        "expiredAt": _expired_at(),
        "widgets": DEFAULT_WIDGET_STRING,
    }
    users.append(user_dict)
    _write_users(users)

    payload = dict(user_dict)
    payload["groups"] = []

    return managementModels.ManagementUserMutationResponse(
        user=managementModels.ManagementUser(**payload),
        message="Created",
    )


@app.post(
    "/PManagement/User/update",
    response_model=managementModels.ManagementUserMutationResponse,
    summary="[PManagement] 사용자 수정",
)
async def management_user_update(
    request: managementModels.ManagementUserUpdateRequest,
) -> managementModels.ManagementUserMutationResponse:
    """ 사용자 수정

    Args:
        request (managementModels.ManagementUserUpdateRequest): 사용자 수정 요청
        
        {
            "userNo": 1,
            "userName": "시스템 관리자",
            "email": "admin@example.com",
            "level": 100,
            "status": 1,
        }

    Raises:
        HTTPException: 사용자를 찾을 수 없습니다.

    Returns:
        managementModels.ManagementUserMutationResponse: 사용자 수정 응답
        
        {
            "user": {
                "userNo": 0,
                "userId": "admin",
                "userName": "시스템 관리자",
                "email": "admin@example.com",
                "level": 100,
                "status": 1,
                "createdAt": "2025-11-08T17:33:00",
                "updatedAt": "2025-11-08T17:33:00"
            },
            "message": "Updated",
        }
    """
    users = _load_users()
    for user in users:
        if user["userNo"] == request.userNo:
            if request.userName is not None:
                user["userName"] = request.userName
            if request.email is not None:
                user["email"] = request.email
            if request.level is not None:
                user["level"] = request.level
            if request.status is not None:
                user["status"] = request.status
            user["updatedAt"] = _now()
            _write_users(users)
            user_groups_map = _build_user_groups_map()
            payload = dict(user)
            payload["groups"] = user_groups_map.get(user["userNo"], [])
            return managementModels.ManagementUserMutationResponse(
                user=managementModels.ManagementUser(**payload),
                message="Updated",
            )

    raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")


@app.post(
    "/PManagement/User/delete",
    response_model=managementModels.ManagementUserMutationResponse,
    summary="[PManagement] 사용자 삭제",
)
async def management_user_delete(
    request: managementModels.ManagementUserDeleteRequest,
) -> managementModels.ManagementUserMutationResponse:
    """ 사용자 삭제

    Args:
        request (managementModels.ManagementUserDeleteRequest): 사용자 삭제 요청
        
        {
            "userNos": [1, 2, 3],
        }

    Raises:
        HTTPException: 삭제할 사용자가 없습니다.

    Returns:
        managementModels.ManagementUserMutationResponse: 사용자 삭제 응답
        
        {
            "affected": 3,
            "message": "Deleted",
        }
    """
    users = _load_users()
    before = len(users)
    target_ids = set(request.userNos)
    remaining = [user for user in users if user["userNo"] not in target_ids]

    deleted = before - len(remaining)
    _write_users(remaining)

    if deleted == 0:
        raise HTTPException(status_code=404, detail="삭제할 사용자가 없습니다.")

    return managementModels.ManagementUserMutationResponse(
        affected=deleted,
        message="Deleted",
    )


@app.post(
    "/PManagement/Group/list",
    response_model=managementModels.ManagementGroupListResponse,
    summary="[PManagement] 그룹 리스트",
)
async def management_group_list(
    payload: managementModels.ManagementGroupListRequest,
    req: Request,
) -> managementModels.ManagementGroupListResponse:
    groups = _load_groups()
    group_user_map = {
        group["group"]: set(group.get("userNos", []))
        for group in groups
    }
    filtered = [
        managementModels.ManagementGroup(
            group=group["group"],
            groupName=group["groupName"],
            groupDescription=group.get("groupDescription", ""),
        )
        for group in groups
        if _matches_group(group, payload.keyword, payload.applicationId)
    ]
    session_level = req.session.get("level")
    session_user_no = req.session.get("userNo")
    if session_level == 1:
        try:
            session_user_no_int = None if session_user_no is None else int(session_user_no)
        except (TypeError, ValueError):
            session_user_no_int = None
        filtered = [
            group
            for group in filtered
            if session_user_no_int is not None
            and session_user_no_int in group_user_map.get(group.group, set())
        ]
    return managementModels.ManagementGroupListResponse(groups=filtered, totalCount=len(filtered))


@app.post(
    "/PManagement/Group/detail",
    response_model=managementModels.ManagementGroupDetailResponse,
    summary="[PManagement] 그룹 상세",
)
async def management_group_detail(
    request: managementModels.ManagementGroupDetailRequest,
) -> managementModels.ManagementGroupDetailResponse:
    groups = _load_groups()
    for group in groups:
        if group["group"] == request.group:
            return managementModels.ManagementGroupDetailResponse(
                detail=managementModels.ManagementGroupDetail(
                    group=group["group"],
                    groupName=group["groupName"],
                    groupDescription=group.get("groupDescription", ""),
                    userNos=group["userNos"],
                    applicationIds=group["applicationIds"],
                )
            )
    raise HTTPException(status_code=404, detail="그룹을 찾을 수 없습니다.")


@app.post(
    "/PManagement/Group/create",
    response_model=managementModels.ManagementGroupMutationResponse,
    summary="[PManagement] 그룹 생성",
)
async def management_group_create(
    request: managementModels.ManagementGroupCreateRequest,
) -> managementModels.ManagementGroupMutationResponse:
    groups = _load_groups()
    next_group_id = max((group["group"] for group in groups), default=0) + 1
    group_dict = {
        "group": next_group_id,
        "groupName": request.groupName,
        "groupDescription": request.groupDescription or "",
        "userNos": request.userNos,
        "applicationIds": request.applicationIds,
    }
    groups.append(group_dict)
    _write_groups(groups)
    return managementModels.ManagementGroupMutationResponse(
        group=managementModels.ManagementGroup(
            group=group_dict["group"],
            groupName=group_dict["groupName"],
            groupDescription=group_dict["groupDescription"],
        ),
        message="Created",
    )


@app.post(
    "/PManagement/Group/update",
    response_model=managementModels.ManagementGroupMutationResponse,
    summary="[PManagement] 그룹 수정",
)
async def management_group_update(
    request: managementModels.ManagementGroupUpdateRequest,
) -> managementModels.ManagementGroupMutationResponse:
    groups = _load_groups()
    for group in groups:
        if group["group"] == request.group:
            if request.groupName is not None:
                group["groupName"] = request.groupName
            if request.groupDescription is not None:
                group["groupDescription"] = request.groupDescription
            if request.userNos is not None:
                group["userNos"] = request.userNos
            if request.applicationIds is not None:
                group["applicationIds"] = request.applicationIds
            _write_groups(groups)
            return managementModels.ManagementGroupMutationResponse(
                group=managementModels.ManagementGroup(
                    group=group["group"],
                    groupName=group["groupName"],
                    groupDescription=group.get("groupDescription", ""),
                ),
                message="Updated",
            )

    raise HTTPException(status_code=404, detail="그룹을 찾을 수 없습니다.")


@app.post(
    "/PManagement/Group/delete",
    response_model=managementModels.ManagementGroupMutationResponse,
    summary="[PManagement] 그룹 삭제",
)
async def management_group_delete(
    request: managementModels.ManagementGroupDeleteRequest,
) -> managementModels.ManagementGroupMutationResponse:
    groups = _load_groups()
    target_groups = set(request.groups)
    before = len(groups)
    remaining = [group for group in groups if group["group"] not in target_groups]
    deleted = before - len(remaining)

    if deleted == 0:
        raise HTTPException(status_code=404, detail="삭제할 그룹이 없습니다.")

    _write_groups(remaining)

    return managementModels.ManagementGroupMutationResponse(affected=deleted, message="Deleted")


@app.post(
    "/PManagement/AppSettings/list",
    response_model=managementModels.AppSettingListResponse,
    summary="[PManagement] App 설정 리스트",
)
async def app_settings_list() -> managementModels.AppSettingListResponse:
    """App 설정 리스트"""
    settings = _load_app_settings()
    return managementModels.AppSettingListResponse(
        appSettings=[managementModels.AppSetting(**setting) for setting in settings]
    )


@app.post(
    "/PManagement/AppSettings/create",
    response_model=managementModels.AppSettingMutationResponse,
    summary="[PManagement] App 설정 등록",
)
async def app_settings_create(
    request: managementModels.AppSettingCreateRequest,
) -> managementModels.AppSettingMutationResponse:
    """App 설정 등록"""
    settings = _load_app_settings()
    new_id = max((setting["applicationId"] for setting in settings), default=0) + 1

    setting = request.dict()
    setting["applicationId"] = new_id
    setting["serverType"] = setting.get("serverType", "")
    settings.append(setting)
    _write_app_settings(settings)
    return managementModels.AppSettingMutationResponse(
        appSetting=managementModels.AppSetting(**setting),
        message="Created",
    )


@app.post(
    "/PManagement/AppSettings/update",
    response_model=managementModels.AppSettingMutationResponse,
    summary="[PManagement] App 설정 수정",
)
async def app_settings_update(
    request: managementModels.AppSettingUpdateRequest,
) -> managementModels.AppSettingMutationResponse:
    """App 설정 수정"""
    settings = _load_app_settings()
    for setting in settings:
        if setting["applicationId"] == request.applicationId:
            if request.appName is not None:
                setting["appName"] = request.appName
            if request.packageId is not None:
                setting["packageId"] = request.packageId
            if request.serverType is not None:
                setting["serverType"] = request.serverType
            if request.fullMsg is not None:
                setting["fullMsg"] = request.fullMsg
            if request.pageLogPeriod is not None:
                setting["pageLogPeriod"] = request.pageLogPeriod
            if request.loggingRate is not None:
                setting["loggingRate"] = request.loggingRate
            if request.order is not None:
                setting["order"] = request.order
            _write_app_settings(settings)
            return managementModels.AppSettingMutationResponse(
                appSetting=managementModels.AppSetting(**setting),
                message="Updated",
            )
    raise HTTPException(status_code=404, detail="수정할 applicationId를 찾을 수 없습니다.")


@app.post(
    "/PManagement/AppSettings/delete",
    response_model=managementModels.AppSettingMutationResponse,
    summary="[PManagement] App 설정 삭제",
)
async def app_settings_delete(
    request: managementModels.AppSettingDeleteRequest,
) -> managementModels.AppSettingMutationResponse:
    """App 설정 삭제"""
    settings = _load_app_settings()
    target_ids = set(request.applicationIds)
    before = len(settings)
    remaining = [setting for setting in settings if setting["applicationId"] not in target_ids]
    deleted = before - len(remaining)

    if deleted == 0:
        raise HTTPException(status_code=404, detail="삭제할 applicationId가 없습니다.")

    _write_app_settings(remaining)

    return managementModels.AppSettingMutationResponse(affected=deleted, message="Deleted")
