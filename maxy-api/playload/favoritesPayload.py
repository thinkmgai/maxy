"""Synthetic payload builders for the Favorites widget."""

from __future__ import annotations

import math
import random
import time
from dataclasses import dataclass
from typing import Dict, List, Optional


_FALLBACK_PAGES = [
    "/home",
    "/dashboard/overview",
    "/chart/performance",
    "/user/login",
    "/user/profile",
    "/api/order/list",
    "/api/order/detail",
    "/product/search",
    "/product/detail",
    "/product/cart",
    "/settings/notification",
    "/settings/security",
    "/support/faq",
    "/support/contact",
    "/marketing/campaign",
    "/insight/weekly",
    "/analysis/conversion",
    "/analysis/funnel",
    "/monitoring/resource",
    "/monitoring/device",
]


def _make_rng(*keys: object) -> random.Random:
    seed = 0
    for key in keys:
        seed ^= hash(key)
    return random.Random(seed)


@dataclass(frozen=True)
class FavoritesInfoListConfig:
    """Parameters for producing the synthetic favorites overview list."""

    application_id: int
    tmzutc: int
    os_type: Optional[str] = None
    date_type: str = "DAY"
    size: int = 12


def build_favorites_info_list(cfg: FavoritesInfoListConfig) -> List[Dict[str, float]]:
    rng = _make_rng("favorites-info", cfg.application_id, cfg.os_type, cfg.date_type, cfg.tmzutc)
    size = max(1, min(cfg.size, 500))

    pages = list(_FALLBACK_PAGES)
    while len(pages) < size:
        pages.append(f"/page/{cfg.application_id % 100}/{len(pages) + 1}")

    rng.shuffle(pages)
    selected = pages[:size]

    results: List[Dict[str, float]] = []
    base_multiplier = 1.0
    if cfg.date_type == "WEEK":
        base_multiplier = 1.6
    elif cfg.date_type == "MONTH":
        base_multiplier = 3.2

    for index, req_url in enumerate(selected):
        popularity = max(0.4, 1.2 - index * 0.08 + rng.uniform(-0.05, 0.05))
        base_count = int(220 * base_multiplier * popularity + rng.uniform(-25, 25))
        log_count = max(base_count + rng.randint(-10, 15), 40)
        doc_count = max(int(log_count * rng.uniform(0.9, 1.1)), 30)

        sum_cpu_usage = int(round(log_count * rng.uniform(45, 88)))
        sum_mem_usage = int(round(log_count * rng.uniform(650, 1500)))
        loading_time = int(round(rng.uniform(950, 2800)))
        response_time = int(round(rng.uniform(800, 2400)))
        interval_time = int(round(rng.uniform(420, 1620)))
        error_count = int(round(log_count * rng.uniform(0.015, 0.06)))
        crash_count = int(round(max(error_count * rng.uniform(0.05, 0.22), 0.0)))

        cpu_usage_avg = int(round(sum_cpu_usage / max(log_count, 1)))
        mem_usage_avg = int(round(sum_mem_usage / max(log_count, 1)))

        log_type = "WEBVIEW" if rng.random() > 0.35 else "NATIVE"

        results.append(
            {
                "reqUrl": req_url,
                "count": doc_count,
                "logCount": log_count,
                "sumCpuUsage": sum_cpu_usage,
                "sumMemUsage": sum_mem_usage,
                "loadingTime": loading_time,
                "responseTime": response_time,
                "intervaltime": interval_time,
                "errorCount": error_count,
                "crashCount": crash_count,
                "cpuUsage": cpu_usage_avg,
                "memUsage": mem_usage_avg,
                "logType": log_type,
            }
        )

    results.sort(key=lambda item: item["count"], reverse=True)
    return results


@dataclass(frozen=True)
class FavoritesRowInfoConfig:
    """Parameters for producing the synthetic favorites row drill-down."""

    application_id: int
    req_url: str
    tmzutc: int
    os_type: Optional[str] = None
    date_type: str = "DAY"


def build_favorites_row_info(cfg: FavoritesRowInfoConfig) -> Dict[str, List[List[float]]]:
    rng = _make_rng(
        "favorites-row", cfg.application_id, cfg.req_url, cfg.os_type, cfg.date_type, cfg.tmzutc
    )

    if cfg.date_type == "MONTH":
        points = 30
        interval_seconds = 24 * 60 * 60
    elif cfg.date_type == "WEEK":
        points = 7
        interval_seconds = 24 * 60 * 60
    else:
        points = 24
        interval_seconds = 60 * 60

    now_ts = int(time.time())
    base_volume = 260 + abs(hash((cfg.req_url, cfg.application_id))) % 340
    base_error_ratio = 0.018 + (abs(hash(cfg.req_url)) % 7) * 0.003
    base_crash_ratio = 0.08 + (abs(hash((cfg.req_url, "crash"))) % 9) * 0.005

    count_series: List[List[float]] = []
    error_series: List[List[float]] = []
    crash_series: List[List[float]] = []
    loading_series: List[List[float]] = []
    response_series: List[List[float]] = []

    for idx in range(points):
        phase = idx / max(points - 1, 1)
        seasonal = 1.0 + math.sin(phase * math.pi * 1.6) * 0.32 + rng.uniform(-0.08, 0.08)

        count_value = max(int(round(base_volume * seasonal)), 10)
        error_value = max(int(round(count_value * base_error_ratio * rng.uniform(0.8, 1.25))), 0)
        crash_value = max(int(round(error_value * base_crash_ratio * rng.uniform(0.5, 1.1))), 0)

        loading_base = 1200 + (abs(hash((cfg.req_url, "loading"))) % 1800)
        response_base = 900 + (abs(hash((cfg.req_url, "response"))) % 1400)

        loading_value = int(
            round(loading_base * (1 + math.cos(phase * math.pi * 1.4) * 0.18) * rng.uniform(0.85, 1.1))
        )
        response_value = int(
            round(response_base * (1 + math.sin(phase * math.pi * 1.2) * 0.14) * rng.uniform(0.9, 1.12))
        )

        timestamp = now_ts - (points - idx - 1) * interval_seconds

        count_series.append([timestamp, int(count_value)])
        error_series.append([timestamp, int(error_value)])
        crash_series.append([timestamp, int(crash_value)])
        loading_series.append([timestamp, loading_value])
        response_series.append([timestamp, response_value])

    return {
        "count": count_series,
        "error": error_series,
        "crash": crash_series,
        "loadingTime": loading_series,
        "responseTime": response_series,
    }
