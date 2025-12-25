"""Helpers to build Waterfall detail response from FileDB + ClickHouse.

This replaces the earlier synthetic payload and follows the same transformation
logic used in maxy-admin-java:
- Waterfall(perfm-obsv) logs (log_type=131079) are stored in FileDB `waterfall`
  index keyed by `device_id#page_id#log_tm`.
- Core Web Vitals logs (log_type=131110) are stored in ClickHouse
  `maxy_app_total_log.res_msg`.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Optional, Tuple
from urllib.parse import urlparse

import requests
from fastapi import HTTPException

from ClickHouseComm.config import ClickHouseSettings

from models.waterfallModels import (
    WaterfallDetailRequest,
    WaterfallDetailResponse,
    WaterfallErrorEntry,
    WaterfallPerformanceData,
    WaterfallPerformanceSpan,
    WaterfallResourceEntry,
    WaterfallTimingEntry,
)


PERF_KEY_MAP: dict[str, str] = {
    "1": "name",
    "2": "entryType",
    "3": "startTime",
    "4": "duration",
    "5": "initiatorType",
    "6": "deliveryType",
    "7": "nextHopProtocol",
    "8": "renderBlockingStatus",
    "9": "workerStart",
    "10": "redirectStart",
    "11": "redirectEnd",
    "12": "fetchStart",
    "13": "domainLookupStart",
    "14": "domainLookupEnd",
    "15": "connectStart",
    "16": "secureConnectionStart",
    "17": "connectEnd",
    "18": "requestStart",
    "19": "responseStart",
    "20": "firstInterimResponseStart",
    "21": "finalResponseHeadersStart",
    "22": "responseEnd",
    "23": "transferSize",
    "24": "encodedBodySize",
    "25": "decodedBodySize",
    "26": "responseStatus",
    "27": "serverTiming",
    "28": "attribution",
    "29": "renderStart",
    "30": "styleAndLayoutStart",
    "31": "firstUIEventTimestamp",
    "32": "blockingDuration",
    "33": "scripts",
    "35": "renderTime",
    "36": "loadTime",
    "40": "hadRecentInput",
    "41": "lastInputTime",
    "42": "sources",
    "43": "unloadEventStart",
    "44": "unloadEventEnd",
    "45": "domInteractive",
    "46": "domContentLoadedEventStart",
    "47": "domContentLoadedEventEnd",
    "48": "domComplete",
    "49": "loadEventStart",
    "50": "loadEventEnd",
    "52": "redirectCount",
    "53": "activationStart",
    "54": "criticalCHRestart",
    "55": "notRestoredReasons",
    "56": "interactionId",
    "57": "processingStart",
    "58": "processingEnd",
    "59": "cancelable",
}


SUPPORTED_CORE_VITALS = {"FCP", "LCP", "INP", "CLS", "TTFB"}


def _filedb_base_url() -> str:
    return (
        os.getenv("MAXY_FILEDB_URL")
        or os.getenv("FILEDB_URL")
        or os.getenv("MAXY_FILEDB_BASE_URL")
        or "http://localhost:8887"
    ).rstrip("/")


def _clean_csv_encoded_value(value: str) -> str:
    # Producer side sometimes keeps CSV-safe replacements.
    return value.replace("^", ",").replace("|", "\n")


def _json_load_maybe(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, (dict, list)):
        return value
    if not isinstance(value, str):
        return None

    raw = _clean_csv_encoded_value(value.strip())
    if not raw:
        return None

    # FileDB may return either a raw JSON object string or a JSON-encoded string.
    # Example: "{\"1\":...}" (string) or {"1":...} (object string).
    try:
        first = json.loads(raw)
    except Exception:
        return None

    if isinstance(first, str):
        try:
            return json.loads(first)
        except Exception:
            return None
    return first


def _translate_perf_keys(value: Any) -> Any:
    if isinstance(value, dict):
        return {PERF_KEY_MAP.get(str(k), str(k)): _translate_perf_keys(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_translate_perf_keys(v) for v in value]
    return value


def _format_size(bytes_size: float | int | None) -> str:
    if bytes_size is None:
        return "0"
    try:
        value = float(bytes_size)
    except Exception:
        return "0"
    units = ["B", "KB", "MB", "GB"]
    for unit in units:
        if abs(value) < 1024.0 or unit == units[-1]:
            if unit == "B":
                return f"{int(round(value))} {unit}"
            return f"{value:.1f} {unit}"
        value /= 1024.0
    return f"{value:.1f} GB"


def _safe_number(value: Any, default: float = 0.0) -> float:
    try:
        num = float(value)
    except Exception:
        return default
    if not (num == num):  # NaN
        return default
    return num


def _safe_int(value: Any, default: int = 0) -> int:
    try:
        return int(float(value))
    except Exception:
        return default


def _extract_domain(url: str | None) -> str:
    if not url:
        return ""
    try:
        parsed = urlparse(url)
        return parsed.netloc or ""
    except Exception:
        return ""


def _resource_kind(entry: dict[str, Any]) -> str:
    entry_type = str(entry.get("entryType") or "").lower()
    initiator = str(entry.get("initiatorType") or "").lower()
    if entry_type == "resource" and initiator:
        return initiator
    if entry_type:
        return entry_type
    return "other"


def _make_resource_entry(key: str, entry: dict[str, Any]) -> WaterfallResourceEntry:
    name = str(entry.get("name") or entry.get("url") or entry.get("entryType") or "")
    entry_type = str(entry.get("entryType") or "")
    initiator = str(entry.get("initiatorType") or "other")
    start = _safe_number(entry.get("startTime"), 0.0)
    duration = _safe_number(entry.get("duration"), 0.0)

    transfer_size = _safe_int(entry.get("transferSize"), 0)
    encoded = _safe_int(entry.get("encodedBodySize"), 0)
    decoded = _safe_int(entry.get("decodedBodySize"), 0)
    status = _safe_int(entry.get("responseStatus") or entry.get("status") or 0, 0)

    domain = _extract_domain(name)
    resource_type = _resource_kind(entry)
    size_label = _format_size(transfer_size)
    timeline_label = f"{start:.1f}ms ~ {(start + max(duration, 0.0)):.1f}ms"

    markers: list[str] = []
    mark = entry.get("mark")
    if isinstance(mark, str) and mark:
        markers.append(mark)

    return WaterfallResourceEntry(
        id=key,
        name=name,
        entryType=entry_type,
        initiatorType=initiator,
        startTime=start,
        duration=duration,
        transferSize=transfer_size,
        encodedBodySize=encoded,
        decodedBodySize=decoded,
        status=status,
        domain=domain,
        resourceType=resource_type,
        sizeLabel=size_label,
        timelineLabel=timeline_label,
        markers=markers,
    )


def _create_phase(name: str, start: float, end: float) -> Optional[dict[str, Any]]:
    if end - start >= 0 and start > 0:
        return {"entryType": "reformNavigation", "name": name, "startTime": start, "responseEnd": end}
    return None


def _build_navigation_phases(nav: dict[str, Any]) -> List[dict[str, Any]]:
    timings: dict[str, float] = {}
    for key in [
        "startTime",
        "requestStart",
        "domainLookupStart",
        "domainLookupEnd",
        "connectStart",
        "connectEnd",
        "responseStart",
        "responseEnd",
        "domContentLoadedEventEnd",
        "loadEventEnd",
    ]:
        timings[key] = _safe_number(nav.get(key), 0.0)

    phases: list[Optional[dict[str, Any]]] = [
        _create_phase("Waiting", timings["startTime"], timings["requestStart"]),
        _create_phase("DNS Lookup", timings["domainLookupStart"], timings["domainLookupEnd"]),
        _create_phase("TCP Connect Start", timings["connectStart"], timings["connectEnd"]),
        _create_phase("Request Time", timings["requestStart"], timings["responseStart"]),
        _create_phase("Response Time", timings["responseStart"], timings["responseEnd"]),
        _create_phase("Dom Processing", timings["responseEnd"], timings["domContentLoadedEventEnd"]),
        _create_phase("Dom Load", timings["domContentLoadedEventEnd"], timings["loadEventEnd"]),
    ]

    result: list[dict[str, Any]] = []
    for phase in phases:
        if not phase:
            continue
        phase["transferSize"] = nav.get("transferSize", 0)
        phase["responseStatus"] = nav.get("responseStatus", 0)
        phase["initiatorType"] = "reformNavigation"
        phase["url"] = nav.get("name")
        phase["duration"] = _safe_number(phase.get("responseEnd"), 0.0) - _safe_number(phase.get("startTime"), 0.0)
        result.append(phase)
    return result


def _mark_lcp(resource_entries: list[dict[str, Any]]) -> None:
    lcp_url: str | None = None
    max_size = 0

    for item in resource_entries:
        if str(item.get("entryType")) != "largest-contentful-paint":
            continue
        url = item.get("url")
        size = item.get("size")
        if isinstance(url, str) and url:
            size_int = _safe_int(size, 0)
            if size_int > max_size:
                lcp_url = url
                max_size = size_int

    if not lcp_url:
        return

    for item in resource_entries:
        if item.get("name") == lcp_url:
            item["mark"] = "lcp"
            item["lcpSize"] = max_size
            return


def _extract_core_vitals_from_clickhouse(
    device_id: str | None,
    page_id: str | None,
    settings: ClickHouseSettings,
) -> List[dict[str, Any]]:
    if not device_id or not page_id:
        return []

    scheme = "https" if settings.secure else "http"
    base = f"{scheme}://{settings.host}:{settings.port}"
    url = f"{base}/"

    sql = (
        "SELECT log_tm, res_msg "
        "FROM maxy_app_total_log "
        "WHERE log_type = 131110 "
        "AND device_id = {device_id:String} "
        "AND page_id = {page_id:String} "
        "ORDER BY log_tm ASC "
        "LIMIT 50 "
        "FORMAT JSON"
    )

    params = {
        "database": settings.database,
        "param_device_id": device_id,
        "param_page_id": page_id,
    }

    try:
        resp = requests.post(
            url,
            params=params,
            data=sql.encode("utf-8"),
            auth=(settings.username, settings.password),
            timeout=6,
        )
        resp.raise_for_status()
        payload = resp.json()
    except Exception:
        return []

    rows = payload.get("data") if isinstance(payload, dict) else None
    if not isinstance(rows, list):
        return []

    latest_by_name: dict[str, Tuple[int, float]] = {}
    for row in rows:
        if not isinstance(row, dict):
            continue
        res_msg_raw = row.get("res_msg")
        msg = _json_load_maybe(res_msg_raw)
        if not isinstance(msg, dict):
            continue
        name = msg.get("name")
        value = msg.get("value")
        if not isinstance(name, str):
            continue
        key = name.strip().upper()
        if key not in SUPPORTED_CORE_VITALS:
            continue
        value_num = _safe_number(value, 0.0)
        if value_num == 0.0:
            continue
        ts = _safe_int(row.get("log_tm"), 0)
        prev = latest_by_name.get(key)
        if prev is None or ts >= prev[0]:
            latest_by_name[key] = (ts, value_num)

    return [{"name": k, "value": v} for k, (_ts, v) in latest_by_name.items()]


def _extract_core_vital_metrics(core_vital_data: List[dict[str, Any]]) -> dict[str, float]:
    metrics: dict[str, float] = {}
    for item in core_vital_data:
        name = item.get("name")
        if not isinstance(name, str):
            continue
        key = name.strip().upper()
        if key not in SUPPORTED_CORE_VITALS:
            continue
        value = item.get("value")
        val_num = _safe_number(value, 0.0)
        if val_num != 0.0:
            metrics[key] = val_num
    return metrics


@dataclass(frozen=True)
class _TimingResult:
    fid: float | None
    tbt: float | None
    fcp: float | None
    lcp: float | None
    inp: float | None
    cls: float | None
    ttfb: float | None
    dcl_time: float | None
    load_time: float | None
    dom_processing_time: float | None
    connection_time: float | None
    dns_lookup_time: float | None
    redirect_time: float | None
    fetch_time: float | None
    dom_interactive: float | None


def _compute_timing(entries: list[dict[str, Any]], core_vital_data: list[dict[str, Any]]) -> _TimingResult:
    nav: dict[str, Any] = {}
    fid: float | None = None
    tbt_total = 0.0

    for item in entries:
        entry_type = str(item.get("entryType") or "")
        if entry_type == "navigation":
            nav = item
            continue
        if entry_type == "first-input":
            start_time = item.get("startTime")
            if isinstance(start_time, (int, float)) and float(start_time) != 0.0:
                fid = float(start_time)
        if entry_type == "longtask":
            duration = item.get("duration")
            if isinstance(duration, (int, float)):
                tbt_total += float(duration) - 50.0

    metrics = _extract_core_vital_metrics(core_vital_data)
    tbt = None if tbt_total == 0.0 else tbt_total

    if not nav:
        return _TimingResult(
            fid=fid,
            tbt=tbt,
            fcp=metrics.get("FCP"),
            lcp=metrics.get("LCP"),
            inp=metrics.get("INP"),
            cls=metrics.get("CLS"),
            ttfb=metrics.get("TTFB"),
            dcl_time=None,
            load_time=None,
            dom_processing_time=None,
            connection_time=None,
            dns_lookup_time=None,
            redirect_time=None,
            fetch_time=None,
            dom_interactive=None,
        )

    connect_end = _safe_number(nav.get("connectEnd"), 0.0)
    connect_start = _safe_number(nav.get("connectStart"), 0.0)
    secure_start = _safe_number(nav.get("secureConnectionStart"), 0.0)

    tcp_time = connect_end - connect_start
    ssl_time = (connect_end - secure_start) if secure_start > 0 else 0.0

    start_time = _safe_number(nav.get("startTime"), 0.0)

    dcl_time = _safe_number(nav.get("domContentLoadedEventEnd"), 0.0) - start_time
    load_time = _safe_number(nav.get("loadEventEnd"), 0.0) - start_time
    dom_processing = _safe_number(nav.get("domComplete"), 0.0) - _safe_number(nav.get("domInteractive"), 0.0)
    connection_time = tcp_time + ssl_time
    dns_lookup = _safe_number(nav.get("domainLookupEnd"), 0.0) - _safe_number(nav.get("domainLookupStart"), 0.0)
    redirect_time = _safe_number(nav.get("redirectEnd"), 0.0) - _safe_number(nav.get("redirectStart"), 0.0)
    fetch_time = _safe_number(nav.get("responseEnd"), 0.0) - _safe_number(nav.get("fetchStart"), 0.0)
    dom_interactive = _safe_number(nav.get("domInteractive"), 0.0)

    def _zero_to_none(val: float) -> float | None:
        return None if abs(val) < 1e-9 else val

    return _TimingResult(
        fid=fid,
        tbt=tbt,
        fcp=metrics.get("FCP"),
        lcp=metrics.get("LCP"),
        inp=metrics.get("INP"),
        cls=metrics.get("CLS"),
        ttfb=metrics.get("TTFB"),
        dcl_time=_zero_to_none(dcl_time),
        load_time=_zero_to_none(load_time),
        dom_processing_time=_zero_to_none(dom_processing),
        connection_time=_zero_to_none(connection_time),
        dns_lookup_time=_zero_to_none(dns_lookup),
        redirect_time=_zero_to_none(redirect_time),
        fetch_time=_zero_to_none(fetch_time),
        dom_interactive=_zero_to_none(dom_interactive),
    )


def _build_timing_entries(result: _TimingResult) -> List[WaterfallTimingEntry]:
    out: list[WaterfallTimingEntry] = []

    def add(key: str, label: str, value: float | None, unit: str = "ms") -> None:
        if value is None:
            return
        out.append(WaterfallTimingEntry(key=key, label=label, value=float(value), unit=unit))

    add("fcp", "FCP", result.fcp)
    add("lcp", "LCP", result.lcp)
    add("inp", "INP", result.inp)
    add("cls", "CLS", result.cls, unit="")
    add("ttfb", "TTFB", result.ttfb)
    add("fid", "FID", result.fid)
    add("tbt", "TBT", result.tbt)
    add("fetchTime", "Fetch", result.fetch_time)
    add("dnsLookupTime", "DNS Lookup", result.dns_lookup_time)
    add("connectionTime", "TCP Connection", result.connection_time)
    add("redirectTime", "Redirect", result.redirect_time)
    add("dclTime", "DOM Content Loaded", result.dcl_time)
    add("loadTime", "Loading Time", result.load_time)
    add("domInteractive", "DOM Interactive", result.dom_interactive)
    add("domProcessingTime", "DOM Processing", result.dom_processing_time)

    return out


def _filedb_gets(index: str, start_key: str) -> list[tuple[str, str]]:
    url = f"{_filedb_base_url()}/gets"
    query: dict[str, Any] = {"index": index, "search": {"startKey": start_key}}
    
    last_error: str | None = None
    try:
        resp = requests.post(url, json=query, timeout=6)
        resp.raise_for_status()
        payload = resp.json()
    except Exception as exc:
        last_error = str(exc)
        raise HTTPException(status_code=502, detail=f"FileDB /gets 호출 실패: {last_error or 'unknown error'}")

    if not isinstance(payload, dict):
        raise HTTPException(status_code=502, detail="FileDB 응답 형식이 올바르지 않습니다.")

    if int(payload.get("code", 0)) != 200:
        last_error = str(payload.get("message") or payload.get("msg") or "FileDB 오류")
        raise HTTPException(status_code=502, detail=f"FileDB /gets 호출 실패: {last_error or 'unknown error'}")

    msg = payload.get("msg")
    if not isinstance(msg, list):
        return []

    out: list[tuple[str, str]] = []
    for row in msg:
        if not (isinstance(row, list) and len(row) >= 2):
            continue
        k, v = row[0], row[1]
        if isinstance(k, str) and isinstance(v, str):
            out.append((k, v))
    return out


def build_waterfall_detail_response(request: WaterfallDetailRequest) -> WaterfallDetailResponse:
    """Fetch and build a Waterfall detail response for the given page view."""

    if not request.deviceId or not request.mxPageId:
        raise HTTPException(status_code=400, detail="deviceId, mxPageId 값이 필요합니다.")

    start_ts = request.pageStartTm or request.logTm
    end_ts = request.pageEndTm

    prefix = f"{request.deviceId}#{request.mxPageId}#"
    start_key = f"{prefix}{start_ts}" if start_ts is not None else prefix
    

    records = _filedb_gets("waterfall", start_key)
    filtered_records: list[tuple[str, str]] = [(k, v) for (k, v) in records if k.startswith(prefix)]

    perf_entries: list[dict[str, Any]] = []
    for key, raw in filtered_records:
        parsed = _json_load_maybe(raw)
        if not isinstance(parsed, dict):
            continue
        perf_entries.append(_translate_perf_keys(parsed))

    if not perf_entries:
        return WaterfallDetailResponse(
            code=200,
            message="Success",
            resourceInfoData=[],
            performanceData=WaterfallPerformanceData(resource=[], longTask=[], clickAction=[]),
            timingData=[],
            errorData=[],
        )

    nav_entry = next((e for e in perf_entries if str(e.get("entryType")) == "navigation"), None)
    phases: list[dict[str, Any]] = _build_navigation_phases(nav_entry) if isinstance(nav_entry, dict) else []

    # navigation 원본은 리스트에서 제거 (java: trimResourceInfoData)
    resource_items: list[dict[str, Any]] = [e for e in perf_entries if str(e.get("entryType")) != "navigation"]
    resource_items = phases + resource_items

    # LCP 마킹 로직 (java: markLargestContentfulPaint)
    _mark_lcp(resource_items)

    # 정렬 (java: sortResourceInfoData)
    def sort_key(item: dict[str, Any]) -> tuple[int, float]:
        is_nav = 0 if str(item.get("entryType")) == "reformNavigation" else 1
        return (is_nav, _safe_number(item.get("startTime"), 0.0))

    resource_items.sort(key=sort_key)

    resource_info_data = [_make_resource_entry(key=str(idx), entry=item) for idx, item in enumerate(resource_items, start=1)]

    # performanceData: 간단히 lane용 span 데이터만 구성 (java webVital와 유사)
    click_action: list[WaterfallPerformanceSpan] = []
    long_task: list[WaterfallPerformanceSpan] = []
    resources: list[WaterfallPerformanceSpan] = []
    for item in resource_items:
        entry_type = str(item.get("entryType") or "")
        start = _safe_number(item.get("startTime"), 0.0)
        duration = _safe_number(item.get("duration"), 0.0)
        label = str(item.get("name") or entry_type or "")
        if entry_type == "event":
            click_action.append(WaterfallPerformanceSpan(label=label, start=start, duration=duration))
        elif entry_type == "longtask":
            long_task.append(WaterfallPerformanceSpan(label=label, start=start, duration=duration))
        elif entry_type == "resource":
            resources.append(WaterfallPerformanceSpan(label=label, start=start, duration=duration))

    performance_data = WaterfallPerformanceData(resource=resources, longTask=long_task, clickAction=click_action)

    # core-vitals (ClickHouse)
    core_vital_data = _extract_core_vitals_from_clickhouse(
        device_id=request.deviceId,
        page_id=request.mxPageId,
        settings=ClickHouseSettings(),
    )
    timing_result = _compute_timing(perf_entries, core_vital_data)
    timing_entries = _build_timing_entries(timing_result)

    return WaterfallDetailResponse(
        code=200,
        message="Success",
        resourceInfoData=resource_info_data,
        performanceData=performance_data,
        timingData=timing_entries,
        errorData=[],
    )
