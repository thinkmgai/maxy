"""Synthetic payload builders for the Accessibility widget."""

from __future__ import annotations

import math
import random
import time
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple


@dataclass(frozen=True)
class AccessibilityConfig:
    """Configuration values that shape the Accessibility dataset."""

    application_id: str
    os_type: Optional[str]
    date_type: str = "DAY"
    tmzutc: int = 0


def _make_rng(*keys: object) -> random.Random:
    seed = 0
    for key in keys:
        seed ^= hash(key)
    return random.Random(seed)


def _normalise_date_type(value: str) -> str:
    upper = value.upper()
    if upper not in {"DAY", "WEEK", "MONTH"}:
        return "DAY"
    return upper


def _resolve_interval(date_type: str, tmzutc: int) -> Tuple[str, datetime, timedelta, int]:
    """Return (date_type, start_local_dt, step, count) for the requested period."""

    upper = _normalise_date_type(date_type)
    local_now = datetime.utcnow() + timedelta(minutes=tmzutc)
    local_midnight = local_now.replace(hour=0, minute=0, second=0, microsecond=0)

    if upper == "WEEK":
        return upper, local_midnight - timedelta(days=6), timedelta(days=1), 7
    if upper == "MONTH":
        return upper, local_midnight - timedelta(days=29), timedelta(days=1), 30
    return upper, local_midnight, timedelta(hours=1), 24


def _local_to_epoch_ms(local_dt: datetime, tmzutc: int) -> int:
    """Convert a naive datetime anchored to tmzutc into a UTC epoch timestamp."""

    utc_dt = local_dt - timedelta(minutes=tmzutc)
    aware = utc_dt.replace(tzinfo=timezone.utc)
    return int(aware.timestamp() * 1000)


def _os_bias(os_type: Optional[str]) -> float:
    if not os_type:
        return 1.0
    lowered = os_type.lower()
    if lowered.startswith("ios"):
        return 0.92
    if lowered.startswith("android"):
        return 1.05
    return 1.0


def _login_bias(os_type: Optional[str]) -> float:
    if not os_type:
        return 0.0
    lowered = os_type.lower()
    if lowered.startswith("ios"):
        return 0.03
    if lowered.startswith("android"):
        return -0.02
    return 0.0


def _base_volume(date_type: str) -> Tuple[int, float]:
    """Return (base, seasonal_amp) tuned per aggregation window."""

    if date_type == "WEEK":
        return 11_200, 0.3
    if date_type == "MONTH":
        return 10_500, 0.28
    return 860, 0.6


def _curve_factor(date_type: str, index: int, count: int) -> float:
    if count <= 1:
        return 1.0

    phase = index / (count - 1)
    if date_type == "DAY":
        # mimic morning and evening peaks with a blended sine curve
        morning = math.sin(math.pi * min(max(phase * 1.35, 0.0), 1.0))
        evening = math.sin(math.pi * min(max((phase - 0.35) * 1.35, 0.0), 1.0))
        return 0.45 + 0.35 * max(morning, 0.0) + 0.25 * max(evening, 0.0)

    # smoother weekly/monthly undulation
    return 0.8 + 0.2 * math.sin(math.pi * phase)


def _login_ratio(date_type: str, os_type: Optional[str], rng: random.Random) -> float:
    base = {"DAY": 0.72, "WEEK": 0.69, "MONTH": 0.66}.get(date_type, 0.72)
    jitter = rng.uniform(-0.035, 0.04)
    return min(max(base + _login_bias(os_type) + jitter, 0.5), 0.9)


def build_accessibility_series(cfg: AccessibilityConfig) -> Dict[str, object]:
    """Return a deterministic yet lifelike dataset for the Accessibility widget."""

    upper, start_local, step, bucket_count = _resolve_interval(cfg.date_type, cfg.tmzutc)
    rng = _make_rng("accessibility", cfg.application_id, cfg.os_type, upper, cfg.tmzutc)
    base_volume, seasonal_amp = _base_volume(upper)
    os_factor = _os_bias(cfg.os_type)

    login_series: List[Dict[str, int]] = []
    no_login_series: List[Dict[str, int]] = []
    dau_series: List[Dict[str, int]] = []

    total_login = 0
    total_no_login = 0
    total_dau = 0

    for idx in range(bucket_count):
        local_point = start_local + step * idx
        timestamp = _local_to_epoch_ms(local_point, cfg.tmzutc)

        curve = _curve_factor(upper, idx, bucket_count)
        seasonal = 1.0 + seasonal_amp * (curve - 0.5)
        raw_dau = base_volume * seasonal * os_factor * rng.uniform(0.92, 1.08)

        if upper == "DAY":
            raw_dau = max(raw_dau, 60.0)
        else:
            raw_dau = max(raw_dau, 1200.0)

        dau_value = int(round(raw_dau))
        login_ratio = _login_ratio(upper, cfg.os_type, rng)
        login_value = int(round(dau_value * login_ratio))
        no_login_value = max(dau_value - login_value, 0)

        # Mild jitter keeps columns visually distinct.
        login_value = max(int(login_value * rng.uniform(0.95, 1.05)), 0)
        no_login_value = max(int(no_login_value * rng.uniform(0.94, 1.06)), 0)
        dau_value = login_value + no_login_value

        login_series.append({"key": timestamp, "value": login_value})
        no_login_series.append({"key": timestamp, "value": no_login_value})
        dau_series.append({"key": timestamp, "value": dau_value})

        total_login += login_value
        total_no_login += no_login_value
        total_dau += dau_value

    avg_dau = int(round(total_dau / bucket_count)) if bucket_count else 0

    return {
        "login": login_series,
        "noLogin": no_login_series,
        "dau": dau_series,
        "dauAvg": avg_dau,
        "totals": {
            "login": total_login,
            "noLogin": total_no_login,
            "dau": total_dau,
        },
        "lastUpdated": int(time.time() * 1000),
        "dateType": upper,
    }
