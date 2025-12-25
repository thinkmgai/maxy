"""Synthetic payload builders for the Resource Usage widget."""

from __future__ import annotations

import math
import random
import time
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Optional, Sequence, Tuple


@dataclass(frozen=True)
class ResourceUsagePopupConfig:
    """Configuration used to synthesise Resource Usage popup rows."""

    application_id: str
    os_type: Optional[str]
    base_date: datetime
    date_type: str
    tmzutc: int
    size: int = 6


@dataclass(frozen=True)
class ResourceUsageDeviceRow:
    """Single row within the popup list."""

    device_model: str
    os_type: str
    user_count: int
    usage_count: int
    cpu_usage: float
    mem_usage: int


@dataclass(frozen=True)
class ResourceUsageRowConfig:
    """Configuration used to synthesise a drill-down time series."""

    application_id: str
    os_type: Optional[str]
    date_type: str
    device_model: str
    tmzutc: int


_DEVICE_POOL: Dict[str, Tuple[str, ...]] = {
    "Android": (
        "Galaxy S23",
        "Galaxy S22",
        "Galaxy Note 20",
        "Galaxy A53",
        "Pixel 8",
        "Xiaomi 12",
        "OnePlus 11",
        "Galaxy Z Flip5",
    ),
    "iOS": (
        "iPhone 15 Pro",
        "iPhone 15",
        "iPhone 14 Pro",
        "iPhone 13 mini",
        "iPad Air (5th)",
        "iPhone SE (2022)",
        "iPhone 12",
        "iPad Pro 12.9",
    ),
}
_FALLBACK_POOL: Tuple[str, ...] = (
    "Surface Duo",
    "Galaxy Tab S9",
    "Pixel Tablet",
)


def _make_rng(*keys: object) -> random.Random:
    seed = 0
    for key in keys:
        seed ^= hash(key)
    return random.Random(seed)


def _device_sequence(
    os_type: Optional[str], size: int, rng: random.Random
) -> Sequence[Tuple[str, str]]:
    if size <= 0:
        return []

    os_candidates: List[str]
    if os_type:
        os_candidates = [os_type]
    else:
        os_candidates = ["Android", "iOS"]

    sequence: List[Tuple[str, str]] = []
    used_counts: Dict[str, int] = {os_name: 0 for os_name in os_candidates}

    for index in range(size):
        candidate = os_candidates[index % len(os_candidates)]
        if len(os_candidates) > 1 and rng.random() > 0.6:
            candidate = rng.choice(os_candidates)

        pool = _DEVICE_POOL.get(candidate, _FALLBACK_POOL)
        offset = used_counts[candidate]
        model = pool[offset % len(pool)]
        if offset >= len(pool):
            suffix = offset // len(pool)
            model = f"{model} #{suffix + 1}"
        used_counts[candidate] = offset + 1
        sequence.append((candidate, model))

    return sequence


def build_resource_usage_popup_data(cfg: ResourceUsagePopupConfig) -> Dict[str, object]:
    """Assemble a deterministic yet lifelike popup dataset."""

    rng = _make_rng(
        "resource-usage-popup",
        cfg.application_id,
        cfg.os_type,
        cfg.base_date.date(),
        cfg.date_type,
        cfg.size,
        cfg.tmzutc,
    )

    rows: List[ResourceUsageDeviceRow] = []
    total_users = 0
    total_usage = 0

    for index, (os_type, model) in enumerate(_device_sequence(cfg.os_type, cfg.size, rng)):
        seasonal = 1.0 + 0.18 * math.sin(index / max(cfg.size - 1, 1) * math.pi)
        user_base = rng.uniform(260, 540)
        user_count = max(int(round(user_base * seasonal * rng.uniform(0.88, 1.12))), 40)

        usage_ratio = rng.uniform(0.48, 0.92)
        usage_count = max(int(round(user_count * usage_ratio)), 1)

        cpu_usage = round(rng.uniform(18.5, 76.0), 1)
        if os_type == "iOS":
            cpu_usage = round(cpu_usage * rng.uniform(0.88, 0.94), 1)
        mem_usage = int(round(rng.uniform(140_000, 620_000)))

        rows.append(
            ResourceUsageDeviceRow(
                device_model=model,
                os_type=os_type,
                user_count=user_count,
                usage_count=usage_count,
                cpu_usage=max(cpu_usage, 0.1),
                mem_usage=max(mem_usage, 10_000),
            )
        )
        total_users += user_count
        total_usage += usage_count

    popup_data = [
        {
            "deviceModel": row.device_model,
            "count": row.user_count,
            "usageCount": row.usage_count,
            "cpuUsage": row.cpu_usage,
            "memUsage": row.mem_usage,
            "osType": row.os_type,
        }
        for row in rows
    ]

    total_data = {
        "totalCount": total_users,
        "totalLogCount": total_usage,
    }

    return {"popupData": popup_data, "totalData": total_data}


def _resolve_bucket_meta(date_type: str) -> Tuple[int, int]:
    upper = date_type.upper()
    if upper == "WEEK":
        return 7, 24 * 60 * 60 * 1000
    if upper == "MONTH":
        return 30, 24 * 60 * 60 * 1000
    return 24, 60 * 60 * 1000


def build_resource_usage_row_series(cfg: ResourceUsageRowConfig) -> Dict[str, List[List[float]]]:
    """Return synthetic drill-down series for a specific device model."""

    rng = _make_rng(
        "resource-usage-row",
        cfg.application_id,
        cfg.os_type,
        cfg.device_model,
        cfg.date_type,
        cfg.tmzutc,
    )

    bucket_count, interval_ms = _resolve_bucket_meta(cfg.date_type)
    now_ms = int(time.time()) * 1000
    start_ms = now_ms - (bucket_count - 1) * interval_ms if bucket_count > 1 else now_ms

    base_users = rng.uniform(150, 420)
    base_cpu = rng.uniform(28.0, 62.0)
    base_mem = rng.uniform(160_000, 520_000)

    user_series: List[List[float]] = []
    cpu_series: List[List[float]] = []
    mem_series: List[List[float]] = []

    for index in range(bucket_count):
        timestamp = start_ms + index * interval_ms
        phase = index / max(bucket_count - 1, 1)
        wave = math.sin(phase * math.pi)

        user_value = max(int(round(base_users * (0.78 + wave * 0.24 + rng.uniform(-0.06, 0.06)))), 0)
        cpu_value = round(base_cpu * (0.9 + wave * 0.18 + rng.uniform(-0.05, 0.05)), 1)
        mem_value = int(round(base_mem * (0.88 + wave * 0.18 + rng.uniform(-0.04, 0.05))))

        user_series.append([timestamp, user_value])
        cpu_series.append([timestamp, max(cpu_value, 0.1)])
        mem_series.append([timestamp, max(mem_value, 10_000)])

    return {"user": user_series, "cpu": cpu_series, "memory": mem_series}
