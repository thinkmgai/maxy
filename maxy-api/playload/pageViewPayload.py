"""Synthetic payload builders for the Page View widget."""

from __future__ import annotations

import math
import random
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple


_URL_FALLBACK: Tuple[str, ...] = (
    "/",
    "/home",
    "/dashboard/overview",
    "/dashboard/performance",
    "/dashboard/resources",
    "/dashboard/favorites",
    "/analysis/page-view",
    "/analysis/funnel",
    "/analysis/conversion",
    "/insight/weekly",
    "/insight/monthly",
    "/support/faq",
    "/support/contact",
    "/settings/profile",
    "/settings/security",
    "/settings/notification",
    "/marketing/campaigns",
    "/marketing/segments",
    "/api/v1/order/list",
    "/api/v1/order/detail",
    "/api/v1/user/list",
    "/api/v1/user/detail",
    "/product/search",
    "/product/detail",
    "/product/cart",
    "/product/checkout",
)


def _make_rng(*keys: object) -> random.Random:
    seed = 0
    for key in keys:
        seed ^= hash(key)
    return random.Random(seed)


def _expand_url_pool(size: int, application_id: str | int) -> List[str]:
    package = str(application_id)
    pool = list(_URL_FALLBACK)
    if size <= len(pool):
        return pool

    prefix = package.replace(".", "-") or "app"
    server_suffix = "srv"
    for index in range(len(pool), size):
        pool.append(f"/{prefix}/{server_suffix}/page-{index + 1}")
    return pool


def _date_buckets(date_type: str) -> Tuple[int, timedelta]:
    upper = date_type.upper()
    if upper == "MONTH":
        return 30, timedelta(days=1)
    if upper == "WEEK":
        return 7, timedelta(days=1)
    return 24, timedelta(hours=1)


@dataclass(frozen=True)
class PageViewInfoListConfig:
    """Configuration used to synthesise the Page View overview list."""

    application_id: int | str
    os_type: Optional[str]
    date_type: str
    tmzutc: int
    size: int = 10


@dataclass(frozen=True)
class PageViewInfoDetailConfig:
    """Configuration used to synthesise the Page View detail series."""

    application_id: str
    os_type: Optional[str]
    date_type: str
    req_url: str
    tmzutc: int


def build_page_view_info_list(cfg: PageViewInfoListConfig) -> List[Dict[str, object]]:
    """Construct a deterministic yet lifelike overview list dataset."""

    size = max(1, min(cfg.size, 60))
    rng = _make_rng(
        "page-view-info",
        cfg.application_id,
        cfg.os_type or "all",
        cfg.date_type.upper(),
        size,
        cfg.tmzutc,
    )

    url_pool = _expand_url_pool(size * 2, cfg.application_id)
    rng.shuffle(url_pool)
    selected = url_pool[:size]

    base_multiplier = 1.0
    date_type = cfg.date_type.upper()
    if date_type == "WEEK":
        base_multiplier = 1.8
    elif date_type == "MONTH":
        base_multiplier = 3.6

    results: List[Dict[str, object]] = []
    for index, page_url in enumerate(selected):
        popularity = max(0.45, 1.15 - index * 0.07 + rng.uniform(-0.06, 0.06))
        base_count = 420 * base_multiplier * popularity
        count = max(int(round(base_count * rng.uniform(0.78, 1.24))), 20)

        if cfg.os_type and cfg.os_type.lower() not in {"all", "전체"}:
            modifier = 0.92 if cfg.os_type.lower().startswith("ios") else 1.05
            count = max(int(count * modifier), 15)

        if index < max(1, size // 4):
            type_value = 2
        elif index < max(2, size // 2):
            type_value = 1
        else:
            type_value = 0

        results.append(
            {
                "pageURL": page_url,
                "count": count,
                "type": type_value,
            }
        )

    results.sort(key=lambda item: (item["type"], item["count"]), reverse=True)
    return results


def build_page_view_info_detail(cfg: PageViewInfoDetailConfig) -> List[Dict[str, object]]:
    """Construct a deterministic series for a specific request URL."""

    bucket_count, interval = _date_buckets(cfg.date_type)
    rng = _make_rng(
        "page-view-detail",
        cfg.application_id,
        cfg.os_type or "all",
        cfg.date_type.upper(),
        cfg.req_url,
        cfg.tmzutc,
    )

    now = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
    if bucket_count > 24:
        now = now.replace(hour=0)

    base_view = 260 + abs(hash((cfg.req_url, cfg.application_id))) % 320
    viewer_bias = 0.66 + (abs(hash((cfg.req_url, "viewer"))) % 12) * 0.01

    series: List[Dict[str, object]] = []
    for offset in range(bucket_count):
        ts = now - interval * (bucket_count - offset - 1)
        phase = offset / max(bucket_count - 1, 1)
        seasonal = 1.0 + math.sin(phase * math.pi * 1.4) * 0.28 + rng.uniform(-0.08, 0.08)

        view_count = max(int(round(base_view * seasonal * rng.uniform(0.85, 1.18))), 20)
        viewer = max(int(round(view_count * viewer_bias * rng.uniform(0.88, 1.1))), 8)

        series.append(
            {
                "time": ts.strftime("%Y-%m-%d %H:%M:%S"),
                "viewCount": view_count,
                "viewer": viewer,
            }
        )

    return series
