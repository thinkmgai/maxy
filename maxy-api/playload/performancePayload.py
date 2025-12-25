from __future__ import annotations

import math
import random
from typing import List, Tuple

from models.performanceModels import (
    ApiErrorChartApiResponse,
    ApiErrorChartRequest,
    ApiErrorListItem,
    ApiErrorListRequest,
    ApiErrorListResponse,
    ApiHitmapRequest,
    CoreVitalRequest,
    CoreVitalResponse,
    HitmapApiResponse,
    LogListByTimeRequest,
    LogListItem,
    LogListResponse,
    PageLogDetailItem,
    PageLogDetailRequest,
    PageLogDetailResponse,
    PageLogSummary,
    PageLogTimelineEntry,
    PageLogVitalEntry,
    PageLogWaterfallEntry,
    VitalListItem,
    VitalListRequest,
    VitalListResponse,
)


def _make_rng(*keys: object) -> random.Random:
    seed = 0
    for key in keys:
        seed ^= hash(key)
    return random.Random(seed)


def _generate_time_points(start: int, end: int, target_count: int) -> List[int]:
    if end <= start:
        return [start]
    span = end - start
    step = max(1, span // max(target_count - 1, 1))
    return [start + min(step * i, span) for i in range(target_count)]


def build_core_vital_response(request: CoreVitalRequest) -> CoreVitalResponse:
    rng = _make_rng(request.applicationId, request.osType, request.from_ts, request.to_ts)

    core_metrics = {
        "LCP": rng.uniform(1800, 4200),
        "FCP": rng.uniform(1200, 3200),
        "INP": rng.uniform(120, 420),
        "CLS": round(rng.uniform(0.05, 0.18), 4),
    }

    timestamps = _generate_time_points(request.from_ts, request.to_ts, 24)

    def series(base: float, variance: float) -> List[List[float]]:
        points: List[List[float]] = []
        for idx, ts in enumerate(timestamps):
            wave = math.sin(idx / 3.0) * variance
            noise = rng.uniform(-variance * 0.25, variance * 0.25)
            points.append([ts, max(base + wave + noise, 0)])
        return points

    chart = {
        "lcp": series(core_metrics["LCP"], 350),
        "fcp": series(core_metrics["FCP"], 250),
        "inp": series(core_metrics["INP"], 40),
        "cls": series(core_metrics["CLS"], 0.02),
    }

    core = {key: (round(value, 4) if key == "CLS" else round(value, 1)) for key, value in core_metrics.items()}

    return CoreVitalResponse(core=core, chart=chart)


def build_vital_list_response(request: VitalListRequest) -> VitalListResponse:
    rng = _make_rng("vital", request.applicationId, request.osType, request.from_ts, request.to_ts)
    base_pages = [
        "/home",
        "/product/list",
        "/product/detail",
        "/search/results",
        "/cart",
        "/checkout",
        "/dashboard",
        "/settings",
    ]
    results: List[VitalListItem] = []
    for index, page in enumerate(base_pages):
        count = rng.randint(1_200, 12_000)
        loading = rng.uniform(1100, 4200)
        lcp = loading + rng.uniform(-500, 500)
        fcp = loading + rng.uniform(-800, 300)
        inp = rng.uniform(100, 450)
        cls = rng.uniform(0.04, 0.18)
        results.append(
            VitalListItem(
                reqUrl=page,
                mxPageId=f"PAGE-{index+1:03d}",
                count=count,
                loadingAvg=round(loading, 2),
                lcp=round(max(lcp, 400), 2),
                fcp=round(max(fcp, 300), 2),
                inp=round(inp, 2),
                cls=round(cls, 4),
            )
        )
    return VitalListResponse(list=results)


def build_hitmap_response(request: ApiHitmapRequest) -> HitmapApiResponse:
    rng = _make_rng("hitmap", request.applicationId, request.osType, request.from_ts, request.to_ts, request.type)
    point_count = 60
    datas: List[List[float]] = []
    max_count = 0
    max_duration = 0

    time_span = max(request.to_ts - request.from_ts, 1)

    for _ in range(point_count):
        ts = request.from_ts + rng.randint(0, time_span)
        duration = rng.uniform(100, 4500)
        count = rng.randint(1, 80)
        max_count = max(max_count, count)
        max_duration = max(max_duration, int(duration))
        datas.append([ts, round(duration, 2), count])

    return HitmapApiResponse(
        datas=sorted(datas, key=lambda item: item[0]),
        maxCount=max_count,
        maxDuration=max_duration,
        minTime=request.from_ts,
        maxTime=request.to_ts,
        durationStep=request.interval,
    )


def build_log_list_response(request: LogListByTimeRequest) -> LogListResponse:
    rng = _make_rng("loglist", request.applicationId, request.osType, request.type, request.from_ts, request.to_ts)
    base_urls = [
        "/product/list",
        "/product/detail",
        "/api/v1/cart",
        "/api/v1/checkout",
        "/api/v1/search",
        "/api/v1/user/profile",
        "/api/v1/user/history",
    ]
    results: List[LogListItem] = []
    for index, url in enumerate(base_urls):
        duration_avg = rng.uniform(250, 3500)
        count = rng.randint(150, 3200)
        error_count = rng.randint(0, 120)
        results.append(
            LogListItem(
                reqUrl=url,
                durationAvg=round(duration_avg, 2),
                count=count,
                errorCount=error_count if request.type.upper() == "PAGE" else rng.randint(0, 45),
                mxPageId=f"PAGE-{index+10:03d}" if request.type.upper() == "PAGE" else None,
                docId=f"DOC-{index+1:04d}" if request.type.upper() == "API" else None,
            )
        )
    return LogListResponse(list=results)


def _metric_status(metric: str, value: float) -> str:
    thresholds = {
        "LCP": (2500, 4000),
        "FCP": (1800, 3000),
        "INP": (200, 500),
        "CLS": (0.1, 0.25),
    }
    low, mid = thresholds.get(metric, (0, float("inf")))
    if metric == "CLS":
        if value <= low:
            return "good"
        if value <= mid:
            return "warn"
        return "bad"
    if value <= low:
        return "good"
    if value <= mid:
        return "warn"
    return "bad"


def build_page_log_detail_response(request: PageLogDetailRequest) -> PageLogDetailResponse:
    rng = _make_rng(
        "pagelogdetail",
        request.applicationId,
        request.osType,
        request.from_ts,
        request.to_ts,
        request.reqUrl,
        request.mxPageId,
    )

    count = rng.randint(8, 20)
    base_req_url = request.reqUrl or f"/page/{(request.mxPageId or 'detail').lower()}"

    device_names = ["Galaxy S24", "iPhone 15 Pro", "Pixel 8", "iPad Air", "Galaxy Tab S9"]
    os_versions = ["Android 14", "Android 13", "iOS 17.5", "iOS 16.7.2"]
    app_versions = ["3.4.2", "3.5.0", "3.5.1", "3.6.0"]
    network_types = ["WiFi", "5G", "LTE", "3G"]
    sim_operators = ["SKT", "KT", "LG U+", "Verizon", "AT&T"]
    log_types = ["WebView", "Native", "Hybrid"]

    summary = PageLogSummary(
        title="Profiling",
        alias=rng.choice([None, "메인 홈", "검색 결과", "상품 상세", "장바구니"]),
        reqUrl=base_req_url,
        count=count,
        averageLoading=None,
        deviceName=rng.choice(device_names),
        appVersion=rng.choice(app_versions),
        osVersion=rng.choice(os_versions),
        networkType=rng.choice(network_types),
        simOperator=rng.choice(sim_operators),
        logType=rng.choice(log_types),
        userId=f"user{rng.randint(1000, 9999)}",
    )

    span = max(request.to_ts - request.from_ts, 1)
    log_rows = []
    for index in range(count):
        timestamp = request.from_ts + rng.randint(0, span)
        loading_time = rng.uniform(900, 4800)
        lcp = rng.uniform(1200, 4200)
        fcp = rng.uniform(900, 3300)
        inp = rng.uniform(100, 520)
        cls = rng.uniform(0.01, 0.28)
        log_rows.append(
            {
                "id": f"log-{index+1:04d}",
                "loadingTime": round(loading_time, 2),
                "feeldex": rng.randint(0, 5),
                "deviceId": f"device-{rng.randint(10000, 99999)}",
                "userId": f"user{rng.randint(100, 999)}",
                "timestamp": timestamp,
                "networkStatus": rng.choice(network_types),
                "lcp": round(lcp, 2),
                "fcp": round(fcp, 2),
                "inp": round(inp, 2),
                "cls": round(cls, 4),
                "wtfFlag": rng.choice([True, False]),
            }
        )

    logs = [PageLogDetailItem(**row) for row in log_rows]

    if logs:
        average_loading = sum(item.loadingTime for item in logs) / len(logs)
        summary.averageLoading = round(average_loading, 2)

    def metric_average(key: str) -> float:
        values = [getattr(item, key) for item in logs if getattr(item, key) not in (None, 0)]
        if not values:
            return 0.0
        return sum(values) / len(values)

    vitals = []
    for metric, unit_key in (("LCP", "ms"), ("FCP", "ms"), ("INP", "ms"), ("CLS", "")):
        average_value = metric_average(metric.lower()) if metric != "CLS" else metric_average("cls")
        status = _metric_status(metric, average_value)
        vitals.append(
            PageLogVitalEntry(
                metric=metric,
                value=round(average_value, 2),
                unit=unit_key,
                status=status,
            )
        )

    waterfall = []
    start_accumulator = 0.0
    for label in ["DNS Lookup", "TCP Handshake", "Request Sent", "Waiting (TTFB)", "Content Download", "Rendering"]:
        duration = round(rng.uniform(20, 320), 2)
        waterfall.append(
            PageLogWaterfallEntry(
                name=label,
                start=round(start_accumulator, 2),
                duration=duration,
            )
        )
        start_accumulator += duration

    timeline = []
    base_timestamp = request.from_ts + span // 4
    for label, offset in [("DOMContentLoaded", 0), ("First Interaction", 1500), ("API Call", 2600), ("Paint Complete", 4100)]:
        timeline.append(
            PageLogTimelineEntry(
                label=label,
                timestamp=base_timestamp + offset,
                detail=f"{label} 이벤트가 발생했습니다.",
            )
        )

    return PageLogDetailResponse(
        summary=summary,
        list=logs,
        vitals=vitals,
        waterfall=waterfall,
        timeline=sorted(timeline, key=lambda entry: entry.timestamp),
    )


def build_api_error_chart_response(request: ApiErrorChartRequest) -> ApiErrorChartApiResponse:
    rng = _make_rng("apierrorchart", request.applicationId, request.osType, request.from_ts, request.to_ts)
    timestamps = _generate_time_points(request.from_ts, request.to_ts, 18)

    def make_series(multiplier: int) -> List[List[int]]:
        series: List[List[int]] = []
        for ts in timestamps:
            value = max(0, int(rng.gauss(multiplier, multiplier * 0.4)))
            series.append([ts, value])
        return series

    return ApiErrorChartApiResponse(
        **{
            "3xx": make_series(5),
            "4xx": make_series(18),
            "5xx": make_series(9),
        }
    )


def build_api_error_list_response(request: ApiErrorListRequest) -> ApiErrorListResponse:
    rng = _make_rng("apierrorlist", request.applicationId, request.osType, request.from_ts, request.to_ts)
    sample_status: List[int] = [301, 302, 400, 401, 403, 404, 408, 500, 502, 503]
    urls = [
        "/api/v1/cart",
        "/api/v1/checkout",
        "/api/v1/login",
        "/api/v1/orders",
        "/api/v1/user/profile",
    ]
    total_errors = 0
    raw_rows: List[Tuple[str, int, int]] = []
    for url in urls:
        status = rng.choice(sample_status)
        count = rng.randint(20, 520)
        total_errors += count
        raw_rows.append((url, status, count))

    items: List[ApiErrorListItem] = []
    for url, status, count in raw_rows:
        ratio = (count / total_errors * 100) if total_errors else 0
        items.append(
            ApiErrorListItem(
                reqUrl=url,
                count=count,
                statusCode=status,
                ratio=round(ratio, 2),
            )
        )
    return ApiErrorListResponse(list=items)
