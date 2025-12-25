"""Synthetic builders for Response Time (S) datasets."""

from __future__ import annotations

import math
import random
from dataclasses import dataclass
from typing import Iterable, List, Optional


@dataclass
class ResponseTimeScatterConfig:
    application_id: int
    os_type: Optional[str]
    from_ts: int
    to_ts: int
    limit_ms: int
    size: int
    tmzutc: int


@dataclass
class LoadingTimeScatterConfig(ResponseTimeScatterConfig):
    """Configuration for synthetic Loading Time (S) scatter datasets."""


def _make_rng(*keys: object) -> random.Random:
    seed = 0
    for key in keys:
        seed ^= hash(key)
    return random.Random(seed)


def _generate_timestamps(cfg: ResponseTimeScatterConfig, rng: random.Random) -> List[int]:
    """
    Create timestamps spaced at roughly ten samples per second.

    This keeps the synthetic dataset in sync with the widget's expectation
    (≈3k points for a 5 minute window) while keeping a light amount of jitter
    inside each second bucket so the scatter plot does not look perfectly uniform.
    """

    if cfg.to_ts <= cfg.from_ts:
        return [cfg.to_ts]

    span_ms = cfg.to_ts - cfg.from_ts
    total_seconds = max(math.ceil(span_ms / 1000), 1)
    timestamps: List[int] = []

    for second_index in range(total_seconds):
        bucket_start = cfg.from_ts + second_index * 1000
        bucket_end = min(bucket_start + 1000, cfg.to_ts)
        bucket_span = max(bucket_end - bucket_start, 1)

        for _ in range(10):
            offset = rng.uniform(0, bucket_span)
            ts = int(bucket_start + offset)
            ts = min(max(cfg.from_ts, ts), cfg.to_ts)
            timestamps.append(ts)

    if len(timestamps) > 10000:
        timestamps = sorted(rng.sample(timestamps, 10000))
    else:
        timestamps.sort()

    return timestamps


def _decorate_sequence(values: Iterable[float], rng: random.Random) -> Iterable[float]:
    for index, value in enumerate(values):
        wave = math.sin(index / 2.3) * (value * 0.08)
        jitter = rng.uniform(-value * 0.05, value * 0.05)
        yield max(value + wave + jitter, 0.0)


def build_response_time_scatter_dataset(cfg: ResponseTimeScatterConfig) -> List[dict]:
    rng = _make_rng(
        "response-scatter", cfg.application_id, cfg.os_type, cfg.from_ts, cfg.to_ts, cfg.tmzutc
    )
    timestamps = _generate_timestamps(cfg, rng)

    base_duration = rng.uniform(cfg.limit_ms * 0.35, cfg.limit_ms * 1.4)
    duration_series = list(
        _decorate_sequence((base_duration * rng.uniform(0.05, 1.25) for _ in timestamps), rng)
    )

    device_models = [
        "Galaxy S23",
        "iPhone 15",
        "Pixel 8",
        "iPad Pro",
        "Galaxy Note 20",
        "Xiaomi 12",
    ]
    comm_types = ["5G", "LTE", "WiFi"]
    sim_ops = ["SKT", "KT", "LGU+", "Verizon", "AT&T"]
    req_urls = [
        "/api/v1/order",
        "/api/v1/product/list",
        "/api/v1/auth/login",
        "/api/v1/profile",
        "/api/v1/cart",
        "/api/v1/search",
    ]

    dataset: List[dict] = []
    for index, (ts, duration) in enumerate(
        zip(timestamps, duration_series)
    ):  # pragma: no branch - deterministic length
        warning = duration >= cfg.limit_ms
        record_id = f"RESP-{cfg.application_id}-{ts}-{cfg.to_ts}-{index:03d}"
        device_model = rng.choice(device_models)
        req_url = rng.choice(req_urls)
        os_type = cfg.os_type or rng.choice(["Android", "iOS", "전체 OS 유형"])
        cpu_usage = rng.uniform(5, 85)
        avg_cpu_usage = cpu_usage * rng.uniform(0.8, 1.1)
        com_sensitivity = rng.uniform(0.5, 1.5)

        item = {
            "_id": record_id,
            "logType": "NETWORK",
            "logTm": ts,
            "intervaltime": round(duration, 2),
            "loadingTime": round(duration * rng.uniform(0.02, 1.05), 2),
            "deviceModel": device_model,
            "deviceId": f"{device_model.replace(' ', '').upper()}-{index:04d}",
            "reqUrl": req_url,
            "comType": rng.choice(comm_types),
            "comSensitivity": round(com_sensitivity, 2),
            "cpuUsage": round(cpu_usage, 1),
            "avgCpuUsage": round(avg_cpu_usage, 1),
            "avgComSensitivity": round(com_sensitivity * rng.uniform(0.8, 1.2), 2),
            "simOperatorNm": rng.choice(sim_ops),
            "appVer": f"{rng.randint(1, 5)}.{rng.randint(0, 9)}.{rng.randint(0, 9)}",
            "userId": f"user{rng.randint(1000, 9999)}",
            "userNm": rng.choice(["Kim", "Lee", "Choi", "Smith", "Suzuki"]),
            "birthDay": rng.choice(["1990-01-15", "1985-07-08", "1995-12-01", None]),
            "clientNm": rng.choice(["MAXY", "ThinkM", "Guest", None]),
            "pageEndTm": ts + rng.randint(50, 450),
            "pageStartTm": ts - rng.randint(50, 450),
            "wtfFlag": warning and rng.random() < 0.25,
            "osType": os_type,
            "mxPageId": f"PAGE-{rng.randint(1, 999):04d}",
        }

        dataset.append(item)

    dataset.sort(key=lambda item: item["logTm"], reverse=True)
    return dataset


def build_loading_time_scatter_dataset(cfg: LoadingTimeScatterConfig) -> List[dict]:
    rng = _make_rng(
        "loading-scatter", cfg.application_id, cfg.os_type, cfg.from_ts, cfg.to_ts, cfg.tmzutc
    )
    timestamps = _generate_timestamps(cfg, rng)

    base_duration = rng.uniform(cfg.limit_ms * 0.4, cfg.limit_ms * 1.6)
    loading_series = list(
        _decorate_sequence((base_duration * rng.uniform(0.3, 1.4) for _ in timestamps), rng)
    )

    page_urls = [
        "/home",
        "/dashboard",
        "/products",
        "/products/detail",
        "/order/complete",
        "/support",
        "/news",
        "/profile",
    ]
    device_models = [
        "Galaxy S23",
        "iPhone 15",
        "Pixel 8",
        "iPad Pro",
        "Galaxy Z Flip",
        "Xiaomi 12",
    ]
    comm_types = ["WiFi", "LTE", "5G"]
    sim_ops = ["SKT", "KT", "LGU+", "Verizon", "AT&T"]

    dataset: List[dict] = []
    for index, (ts, loading) in enumerate(zip(timestamps, loading_series)):
        warning = loading >= cfg.limit_ms
        record_id = f"LOAD-{cfg.application_id}-{ts}-{cfg.to_ts}-{index:03d}"
        device_model = rng.choice(device_models)
        os_type = cfg.os_type or rng.choice(["Android", "iOS", "Hybrid", "전체 OS 유형"])
        interval_duration = max(loading * rng.uniform(0.7, 1.2), 0.0)
        page_start = max(ts - rng.randint(120, 1200), cfg.from_ts)
        cpu_usage = rng.uniform(4, 75)
        avg_cpu_usage = cpu_usage * rng.uniform(0.85, 1.15)
        com_sensitivity = rng.uniform(0.4, 1.6)

        item = {
            "_id": record_id,
            "logType": "PAGE",
            "logTm": ts,
            "intervaltime": round(interval_duration, 2),
            "loadingTime": round(loading, 2),
            "deviceModel": device_model,
            "deviceId": f"{device_model.replace(' ', '').upper()}-{index:04d}",
            "reqUrl": rng.choice(page_urls),
            "comType": rng.choice(comm_types),
            "comSensitivity": round(com_sensitivity, 2),
            "cpuUsage": round(cpu_usage, 1),
            "avgCpuUsage": round(avg_cpu_usage, 1),
            "avgComSensitivity": round(com_sensitivity * rng.uniform(0.8, 1.2), 2),
            "simOperatorNm": rng.choice(sim_ops),
            "appVer": f"{rng.randint(1, 5)}.{rng.randint(0, 9)}.{rng.randint(0, 9)}",
            "userId": f"user{rng.randint(1000, 9999)}",
            "userNm": rng.choice(["Kim", "Lee", "Choi", "Smith", "Suzuki", "Garcia"]),
            "birthDay": rng.choice(["1990-01-15", "1985-07-08", "1995-12-01", None]),
            "clientNm": rng.choice(["MAXY", "ThinkM", "Guest", None]),
            "pageEndTm": ts,
            "pageStartTm": page_start,
            "wtfFlag": warning and rng.random() < 0.3,
            "osType": os_type,
            "mxPageId": f"PAGE-{rng.randint(1, 999):04d}",
        }

        dataset.append(item)

    dataset.sort(key=lambda item: item["pageEndTm"], reverse=True)
    return dataset
