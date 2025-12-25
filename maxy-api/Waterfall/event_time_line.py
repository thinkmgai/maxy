"""Native Event Time Line service (ClickHouse).

Mirrors maxy-admin-java `eventTimeLine.js` data dependency:
- Fetch a log list by device/time window (optionally page_id).
"""

from __future__ import annotations

import csv
from pathlib import Path
from typing import Any, Optional

from fastapi import HTTPException

from Waterfall.clickhouse import SQL, get_client
from models.eventTimeLineModels import EventTimeLineLog, EventTimeLineRequest, EventTimeLineResponse


def _clean_csv_encoded_value(value: str | None) -> str:
    if not value:
        return ""
    # Producer side sometimes keeps CSV-safe replacements.
    return value.replace("^", ",").replace("|", "\n")


def _find_data_dir() -> Path:
    current = Path(__file__).resolve()
    path = current.parent
    while True:
        candidate = path.parent / "Data"
        if candidate.exists():
            return candidate
        if path.parent == path:
            break
        path = path.parent
    return current.parent / "Data"


def _resolve_pkg_server(package_nm_or_app_id: str, server_type_override: Optional[int] = None) -> tuple[str, Optional[int]]:
    if server_type_override is not None:
        return package_nm_or_app_id, int(server_type_override)

    stripped = str(package_nm_or_app_id).strip()
    if not stripped.isdigit():
        return stripped, None

    data_dir = _find_data_dir()
    csv_path = data_dir / "application.csv"
    if not csv_path.exists():
        return stripped, None

    try:
        with csv_path.open("r", newline="", encoding="utf-8") as fp:
            reader = csv.DictReader(fp)
            for row in reader:
                if str(row.get("applicationId") or "").strip() != stripped:
                    continue
                pkg = str(row.get("packageId") or "").strip()
                server_type = str(row.get("serverType") or "").strip()
                return (pkg or stripped), (int(server_type) if server_type.isdigit() else None)
    except Exception:
        return stripped, None

    return stripped, None


def _as_int(value: Any, default: int = 0) -> int:
    try:
        return int(float(value))
    except Exception:
        return default


def build_event_time_line_response(request: EventTimeLineRequest) -> EventTimeLineResponse:
    if request.from_ts > request.to_ts:
        raise HTTPException(status_code=400, detail="`from` must be earlier than `to`.")

    package_nm, resolved_server_type = _resolve_pkg_server(request.applicationId, request.serverType)
    page_id = (request.mxPageId or "").strip()

    params: dict[str, Any] = {
        "device_id": request.deviceId,
        "from_ts": int(request.from_ts),
        "to_ts": int(request.to_ts),
        "page_id": page_id or None,
        "package_nm": package_nm if package_nm and not package_nm.isdigit() else None,
        "server_type": int(resolved_server_type) if resolved_server_type is not None else None,
        "limit": int(request.limit),
    }
    sql = SQL.render("waterfall.selectEventTimeLine", params)
    try:
        client = get_client()
        result = client.query(sql, params)
    except Exception:
        return EventTimeLineResponse(code=200, message="Success", logList=[])

    logs: list[EventTimeLineLog] = []
    for row in result.result_rows:
        data = dict(zip(result.column_names, row))
        log_tm = _as_int(data.get("logTm"), 0)
        log_type = _as_int(data.get("logType"), 0)
        interval = _as_int(data.get("intervaltime"), 0)
        req_url = data.get("reqUrl")
        page_url = data.get("pageUrl")
        alias_value = ""
        if isinstance(req_url, str) and req_url.strip():
            alias_value = req_url.strip()
        elif isinstance(page_url, str) and page_url.strip():
            alias_value = page_url.strip()
        res_msg = _clean_csv_encoded_value(
            data.get("resMsg") if isinstance(data.get("resMsg"), str) else None
        )
        logs.append(
            EventTimeLineLog(
                logType=log_type,
                logTm=log_tm,
                intervaltime=interval,
                aliasValue=alias_value,
                resMsg=res_msg,
            )
        )

    return EventTimeLineResponse(code=200, message="Success", logList=logs)
