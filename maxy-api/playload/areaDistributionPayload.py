"""Synthetic payload builders for the Area Distribution widget."""

from __future__ import annotations

import random
import time
from dataclasses import dataclass
from typing import Dict, List, Optional


_REGION_BASELINES: Dict[str, Dict[str, float]] = {
    "kr-so": {"users": 21000, "error_rate": 0.024, "crash_rate": 0.12},  # Seoul
    "kr-kg": {"users": 18200, "error_rate": 0.021, "crash_rate": 0.11},  # Gyeonggi
    "kr-in": {"users": 9400, "error_rate": 0.019, "crash_rate": 0.1},  # Incheon
    "kr-pu": {"users": 8600, "error_rate": 0.022, "crash_rate": 0.11},  # Busan
    "kr-tg": {"users": 7800, "error_rate": 0.021, "crash_rate": 0.105},  # Daegu
    "kr-ul": {"users": 6600, "error_rate": 0.019, "crash_rate": 0.1},  # Ulsan
    "kr-tj": {"users": 5400, "error_rate": 0.0185, "crash_rate": 0.098},  # Daejeon
    "kr-kj": {"users": 5000, "error_rate": 0.018, "crash_rate": 0.095},  # Gwangju
    "kr-sj": {"users": 3600, "error_rate": 0.017, "crash_rate": 0.09},  # Sejong
    "kr-kw": {"users": 6100, "error_rate": 0.017, "crash_rate": 0.094},  # Gangwon
    "kr-gb": {"users": 5900, "error_rate": 0.0165, "crash_rate": 0.092},  # North Chungcheong
    "kr-gn": {"users": 6000, "error_rate": 0.0175, "crash_rate": 0.094},  # South Chungcheong
    "kr-cb": {"users": 5800, "error_rate": 0.017, "crash_rate": 0.093},  # North Jeolla
    "kr-2685": {"users": 5400, "error_rate": 0.0175, "crash_rate": 0.094},  # South Jeolla
    "kr-2688": {"users": 6200, "error_rate": 0.018, "crash_rate": 0.096},  # North Gyeongsang
    "kr-kn": {"users": 6400, "error_rate": 0.0185, "crash_rate": 0.098},  # South Gyeongsang
    "kr-cj": {"users": 3200, "error_rate": 0.0155, "crash_rate": 0.088},  # Jeju
}

_ANDROID_MODELS: tuple[str, ...] = (
    "Galaxy S23",
    "Galaxy S22",
    "Galaxy Note 20",
    "Galaxy A54",
    "Galaxy Z Flip5",
    "Pixel 8",
    "Pixel 7 Pro",
    "OnePlus 11",
    "Xiaomi 13",
    "LG Velvet",
)

_IOS_MODELS: tuple[str, ...] = (
    "iPhone 15 Pro",
    "iPhone 15",
    "iPhone 14 Pro",
    "iPhone 14",
    "iPhone 13 mini",
    "iPhone SE (2022)",
    "iPad Pro 12.9",
    "iPad Air (5th)",
)


def _make_rng(*keys: object) -> random.Random:
    seed = 0
    for key in keys:
        seed ^= hash(key)
    return random.Random(seed)


def _normalise_request_type(value: str) -> str:
    upper = value.upper()
    if upper not in {"TOTAL", "ERROR", "CRASH"}:
        return "TOTAL"
    return upper


@dataclass(frozen=True)
class AreaDistributionConfig:
    """Parameters used to synthesise the area distribution map."""

    application_id: str
    os_type: Optional[str]
    tmzutc: int
    date_type: str = "DAY"


@dataclass(frozen=True)
class AreaDistributionDetailConfig:
    """Parameters used to synthesise the drill-down list."""

    application_id: str
    os_type: Optional[str]
    location_code: str
    tmzutc: int
    request_type: str = "TOTAL"
    next_offset: int = 0
    size: int = 50


def build_area_distribution_map(cfg: AreaDistributionConfig) -> Dict[str, object]:
    """Return synthetic map data keyed by Korean administrative region."""

    date_multiplier = {"DAY": 1.0, "WEEK": 7.0, "MONTH": 28.0}.get(cfg.date_type.upper(), 1.0)
    os_bias = 1.0
    if cfg.os_type:
        lowered = cfg.os_type.lower()
        if lowered.startswith("ios"):
            os_bias = 0.9
        elif lowered.startswith("and"):
            os_bias = 1.08

    by_location: Dict[str, Dict[str, int]] = {}
    total_dau = 0
    total_error = 0
    total_crash = 0

    for code, baseline in _REGION_BASELINES.items():
        base_users = baseline["users"]
        error_rate = baseline["error_rate"]
        crash_rate = baseline["crash_rate"]

        dau = max(int(round(base_users * date_multiplier * os_bias)), 10)
        error = max(int(round(dau * error_rate)), 0)
        crash = max(int(round(error * crash_rate)), 0)

        by_location[code] = {
            "dau": dau,
            "error": error,
            "crash": crash,
        }

        total_dau += dau
        total_error += error
        total_crash += crash

    return {
        "byLocation": by_location,
        "totals": {
            "dau": total_dau,
            "error": total_error,
            "crash": total_crash,
        },
        "lastUpdated": int(time.time() * 1000),
    }


def build_area_distribution_detail_rows(cfg: AreaDistributionDetailConfig) -> Dict[str, object]:
    """Return synthetic drill-down rows for a specific region."""

    request_type = _normalise_request_type(cfg.request_type)
    rng = _make_rng(
        "area-detail",
        cfg.application_id,
        cfg.os_type,
        cfg.location_code,
        request_type,
        cfg.next_offset,
    )

    page_size = max(1, min(cfg.size, 100))
    now_ms = int(time.time() * 1000)

    rows: List[Dict[str, object]] = []
    has_more = False

    for index in range(page_size):
        absolute_index = cfg.next_offset + index
        if absolute_index >= 200:
            has_more = False
            break

        minutes_ago = 8 + absolute_index * 5 + rng.randint(-3, 4)
        timestamp = now_ms - minutes_ago * 60 * 1000

        os_type = cfg.os_type or rng.choice(["Android", "iOS"])
        model_pool = _ANDROID_MODELS if os_type.lower().startswith("and") else _IOS_MODELS
        device_model = model_pool[(absolute_index + rng.randint(0, len(model_pool) - 1)) % len(model_pool)]

        log_type = request_type
        if request_type == "TOTAL":
            log_type = "CRASH" if rng.random() < 0.35 else "ERROR"

        doc_id = f"{cfg.location_code}-{absolute_index:04d}-{abs(hash((cfg.application_id, absolute_index))) & 0xFFFF:04X}"
        user_id = f"user{1000 + abs(hash((cfg.location_code, absolute_index))) % 9000}"
        device_id = f"{os_type[:3].upper()}-{rng.randint(100000, 999999)}"

        rows.append(
            {
                "logTm": timestamp,
                "deviceId": device_id,
                "deviceModel": device_model,
                "userId": user_id,
                "logType": log_type,
                "appVer": f"{1 + (absolute_index % 3)}.{rng.randint(0, 9)}.{rng.randint(0, 9)}",
                "applicationId": cfg.application_id,
                "osType": os_type,
                "reqUrl": f"/page/{cfg.location_code}/{1 + (absolute_index % 12)}",
                "pageUrl": f"https://app.example.com/page/{cfg.location_code}/{1 + (absolute_index % 12)}",
                "statusCode": 500 if log_type == "ERROR" else 0,
                "durationMs": rng.randint(800, 4200),
                "docId": doc_id,
            }
        )

    next_offset = cfg.next_offset + len(rows)
    if next_offset < 200:
        has_more = True

    return {
        "rows": rows,
        "next": next_offset,
        "hasMore": has_more,
    }
