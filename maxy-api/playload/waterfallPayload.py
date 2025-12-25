"""Synthetic data builders for the Waterfall diagnostics API."""

from __future__ import annotations

import math
import random
from dataclasses import dataclass
from typing import List, Sequence

from models.waterfallModels import (
    WaterfallDetailRequest,
    WaterfallDetailResponse,
    WaterfallErrorEntry,
    WaterfallPerformanceData,
    WaterfallPerformanceSpan,
    WaterfallResourceEntry,
    WaterfallTimingEntry,
)


@dataclass(frozen=True)
class WaterfallConfig:
    application_id: str
    device_id: str | None
    req_url: str | None
    os_type: str | None
    page_start: int | None
    page_end: int | None
    log_timestamp: int | None
    limit: int


def _make_rng(*keys: object) -> random.Random:
    """Deterministically seed a random generator."""

    seed = 0xA5A5_5A5A
    for key in keys:
        seed ^= hash(key)
    return random.Random(seed & 0xFFFFFFFF)


def _format_size(bytes_size: float) -> str:
    units = ["B", "KB", "MB", "GB"]
    value = float(bytes_size)
    for unit in units:
        if abs(value) < 1024.0 or unit == units[-1]:
            if unit == "B":
                return f"{int(round(value))} {unit}"
            return f"{value:.1f} {unit}"
        value /= 1024.0
    return f"{value:.1f} GB"


def _resource_name(rng: random.Random) -> str:
    prefixes = ["core", "auth", "product", "image", "content", "profile", "config"]
    suffixes = [".js", ".css", ".png", ".jpg", ".svg", ".json", ".html"]
    stem = rng.choice(prefixes)
    variant = rng.randint(1, 24)
    return f"{stem}-{variant}{rng.choice(suffixes)}"


def _resource_domain(rng: random.Random) -> str:
    domains = [
        "static.maxy.co.kr",
        "cdn.maxy-cloud.net",
        "assets.maxy.dev",
        "images.maxy.co",
        "api.maxy.io",
    ]
    return rng.choice(domains)


def _resource_type(name: str) -> str:
    name = name.lower()
    if name.endswith(".js"):
        return "script"
    if name.endswith(".css"):
        return "style"
    if name.endswith(".png") or name.endswith(".jpg") or name.endswith(".jpeg"):
        return "image"
    if name.endswith(".svg"):
        return "vector"
    if name.endswith(".json"):
        return "xhr"
    if name.endswith(".html"):
        return "document"
    return "other"


def _timing_entries(rng: random.Random) -> List[WaterfallTimingEntry]:
    baselines = {
        "waiting": rng.uniform(8, 26),
        "dns": rng.uniform(4, 16),
        "tcp": rng.uniform(12, 44),
        "ssl": rng.uniform(10, 32),
        "ttfb": rng.uniform(80, 220),
        "content": rng.uniform(160, 480),
    }

    cumulative = {}
    cursor = 0.0
    for key in ["waiting", "dns", "tcp", "ssl", "ttfb", "content"]:
        cursor += baselines[key]
        cumulative[key] = cursor

    return [
        WaterfallTimingEntry(key="waiting", label="Waiting", value=round(baselines["waiting"], 2), unit="ms"),
        WaterfallTimingEntry(key="dns", label="DNS Lookup", value=round(baselines["dns"], 2), unit="ms"),
        WaterfallTimingEntry(key="tcp", label="TCP Connect", value=round(baselines["tcp"], 2), unit="ms"),
        WaterfallTimingEntry(key="ssl", label="TLS Handshake", value=round(baselines["ssl"], 2), unit="ms"),
        WaterfallTimingEntry(key="ttfb", label="Waiting (TTFB)", value=round(baselines["ttfb"], 2), unit="ms"),
        WaterfallTimingEntry(key="content", label="Content Download", value=round(baselines["content"], 2), unit="ms"),
        WaterfallTimingEntry(key="load", label="Total Load", value=round(cumulative["content"], 2), unit="ms"),
    ]


def _performance_segments(rng: random.Random) -> WaterfallPerformanceData:
    base = rng.uniform(180, 420)

    def _segments(label: str, multiplier: float, limit: int) -> List[WaterfallPerformanceSpan]:
        segments: List[WaterfallPerformanceSpan] = []
        cursor = 0.0
        for _ in range(limit):
            duration = max(rng.gauss(base * multiplier, base * multiplier * 0.35), 18.0)
            gap = rng.uniform(14, 42)
            cursor += gap
            segments.append(
                WaterfallPerformanceSpan(
                    label=label,
                    start=round(cursor, 2),
                    duration=round(duration, 2),
                )
            )
            cursor += duration
        return segments

    return WaterfallPerformanceData(
        resource=_segments("Resource", multiplier=0.32, limit=6),
        longTask=_segments("Long Task", multiplier=0.18, limit=3),
        clickAction=_segments("User Action", multiplier=0.12, limit=2),
    )


def _resource_entries(cfg: WaterfallConfig) -> List[WaterfallResourceEntry]:
    rng = _make_rng(
        "waterfall-resources",
        cfg.application_id,
        cfg.device_id,
        cfg.req_url,
        cfg.page_start,
        cfg.page_end,
        cfg.limit,
    )
    entries: List[WaterfallResourceEntry] = []
    start_cursor = rng.uniform(2.0, 12.0)
    categories: Sequence[str] = (
        "navigation",
        "resource",
        "script",
        "style",
        "image",
        "xhr",
        "font",
        "other",
    )
    initiators = ["parser", "script", "link", "img", "fetch", "xmlhttprequest"]

    for index in range(cfg.limit):
        name = _resource_name(rng)
        entry_type = rng.choice(categories if index else ("reformNavigation",))
        initiator = "navigation" if entry_type == "reformNavigation" else rng.choice(initiators)
        duration = max(rng.gauss(120, 48), 12.0)
        size_bytes = max(int(abs(rng.gauss(120_000, 80_000))), 200)
        start_time = start_cursor + rng.uniform(4, 26)
        markers: List[str] = []
        if entry_type == "reformNavigation":
            markers = ["navigation"]
        elif duration > 280:
            markers = ["long-task"]
        elif size_bytes > 750_000:
            markers = ["large"]

        entries.append(
            WaterfallResourceEntry(
                id=f"wf-{index+1:03d}",
                name=name,
                entryType=entry_type,
                initiatorType=initiator,
                startTime=round(start_time, 2),
                duration=round(duration, 2),
                transferSize=size_bytes,
                encodedBodySize=int(size_bytes * rng.uniform(0.72, 0.96)),
                decodedBodySize=int(size_bytes * rng.uniform(0.96, 1.22)),
                status=rng.choice([200, 200, 200, 204, 301, 404, 500]),
                domain=_resource_domain(rng),
                resourceType=_resource_type(name),
                sizeLabel=_format_size(size_bytes),
                timelineLabel=f"{round(start_time,1)}ms ~ {round(start_time+duration,1)}ms",
                markers=markers,
            )
        )
        start_cursor = start_time

    return entries


def _error_entries(cfg: WaterfallConfig) -> List[WaterfallErrorEntry]:
    rng = _make_rng("waterfall-errors", cfg.application_id, cfg.device_id, cfg.req_url, cfg.page_start)
    error_count = rng.randint(0, 4)
    errors: List[WaterfallErrorEntry] = []
    if error_count == 0:
        return errors

    base_ts = cfg.page_start or (cfg.log_timestamp or 0)
    for idx in range(error_count):
        offset = rng.uniform(40, 420)
        errors.append(
            WaterfallErrorEntry(
                id=f"err-{idx+1:03d}",
                logTm=base_ts + int(offset),
                waterfallTm=round(offset, 2),
                name=rng.choice(["TypeError", "FetchError", "TimeoutError", "UnknownError"]),
                message=rng.choice(
                    [
                        "Cannot read properties of undefined",
                        "Network request failed",
                        "Promise timed out after 3000ms",
                        "Unexpected token '<' in JSON",
                    ]
                ),
                status=rng.choice([400, 401, 403, 404, 500, 502, 504]),
                initiatorType=rng.choice(["script", "fetch", "xmlhttprequest"]),
            )
        )
    return errors


def build_waterfall_detail_response(request: WaterfallDetailRequest) -> WaterfallDetailResponse:
    """High level orchestration to produce a Waterfall API response."""

    config = WaterfallConfig(
        application_id=request.applicationId,
        device_id=request.deviceId,
        req_url=request.reqUrl,
        os_type=request.osType,
        page_start=request.pageStartTm,
        page_end=request.pageEndTm,
        log_timestamp=request.logTm,
        limit=request.limit,
    )

    resources = _resource_entries(config)
    performance = _performance_segments(_make_rng("waterfall-performance", config.application_id, config.req_url))
    timing = _timing_entries(_make_rng("waterfall-timing", config.application_id, config.req_url))
    errors = _error_entries(config)

    return WaterfallDetailResponse(
        resourceInfoData=resources,
        performanceData=performance,
        timingData=timing,
        errorData=errors,
    )
