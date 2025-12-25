"""Synthetic payload builders for the Logmeter widget."""

from __future__ import annotations

import math
import random
import time
from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class LogmeterWeights:
    """Configuration weights that mirror the legacy Logmeter component."""

    log_weight: int = 2
    error_weight: int = 10_000
    crash_weight: int = 50


@dataclass
class LogmeterInterval:
    """Minute-level aggregates used to draw stack charts and counters."""

    timestamp: int
    log_count: int
    error_count: int
    crash_count: int


@dataclass
class LogmeterSnapshotConfig:
    """Input parameters for building a Logmeter snapshot."""

    application_id: int
    os_type: Optional[str]
    tmzutc: int
    window_minutes: int = 5
    sample_size: int = 60
    throttle_ms: int = 10
    weights: LogmeterWeights = field(default_factory=LogmeterWeights)


@dataclass
class LogmeterSnapshot:
    """Synthetic snapshot that mimics the data delivered by the Java dashboard."""

    last_updated: int
    window_minutes: int
    throttle_ms: int
    weights: LogmeterWeights
    realtime_stream: str
    app_log_count: int
    app_error_count: int
    app_crash_count: int
    avg_error: int
    avg_crash: int
    timeline: List[LogmeterInterval]


def _make_rng(*keys: object) -> random.Random:
    seed = 0
    for key in keys:
        seed ^= hash(key)
    return random.Random(seed)


def _generate_timeline(cfg: LogmeterSnapshotConfig, rng: random.Random) -> List[LogmeterInterval]:
    """Create a rolling window of minute aggregates with gentle variation."""

    now_ts = int(time.time())
    window = max(cfg.window_minutes, 1)
    timeline: List[LogmeterInterval] = []

    for minute_index in range(window):
        phase = minute_index / max(window - 1, 1)
        phase_wave = math.sin(phase * math.pi * 1.15)

        log_base = rng.uniform(90, 180) * (1 + phase_wave * 0.25)
        log_count = max(int(log_base), 30)

        error_ratio = 0.02 + rng.uniform(0.0, 0.025) + max(phase_wave, 0.0) * 0.015
        crash_ratio = 0.0015 + rng.uniform(0.0, 0.004) + max(math.cos(phase * math.pi * 1.4), 0.0) * 0.003

        error_count = max(int(log_count * error_ratio), 0)
        crash_count = max(int(error_count * crash_ratio * 6), 0)

        timestamp = now_ts - (window - minute_index - 1) * 60
        timeline.append(
            LogmeterInterval(
                timestamp=timestamp,
                log_count=log_count,
                error_count=error_count,
                crash_count=crash_count,
            )
        )

    return timeline


def _build_realtime_stream(cfg: LogmeterSnapshotConfig, rng: random.Random, error_rate: float, crash_rate: float) -> str:
    """Generate the scrolling indicator string (0: log, 1: error, 2: crash)."""

    sample_size = max(cfg.sample_size, 5)
    events: List[str] = []

    crash_prob = min(0.15, crash_rate * 2.8 + 0.02)
    error_prob = min(0.55, error_rate * 2.2 + 0.1)
    log_prob = max(0.0, 1.0 - crash_prob - error_prob)

    for _ in range(sample_size):
        roll = rng.random()
        if roll < crash_prob:
            events.append("2")
        elif roll < crash_prob + error_prob:
            events.append("1")
        else:
            events.append("0")

    if events:
        if "1" not in events:
            events[rng.randrange(len(events))] = "1"
        if "2" not in events:
            events[rng.randrange(len(events))] = "2"

    return "".join(events)


def build_logmeter_snapshot(cfg: LogmeterSnapshotConfig) -> LogmeterSnapshot:
    """Assemble a synthetic dataset aligned with the legacy dashboard behaviour."""

    rng = _make_rng("logmeter", cfg.application_id, cfg.os_type, cfg.window_minutes, cfg.tmzutc)

    timeline = _generate_timeline(cfg, rng)
    total_logs = sum(item.log_count for item in timeline)
    total_errors = sum(item.error_count for item in timeline)
    total_crashes = sum(item.crash_count for item in timeline)

    window = max(cfg.window_minutes, 1)
    avg_error = int(round(total_errors / window)) if total_errors else 0
    avg_crash = int(round(total_crashes / window)) if total_crashes else 0

    error_rate = total_errors / total_logs if total_logs else 0.0
    crash_rate = total_crashes / total_logs if total_logs else 0.0
    realtime_stream = _build_realtime_stream(cfg, rng, error_rate, crash_rate)

    return LogmeterSnapshot(
        last_updated=int(time.time()),
        window_minutes=window,
        throttle_ms=cfg.throttle_ms,
        weights=cfg.weights,
        realtime_stream=realtime_stream,
        app_log_count=total_logs,
        app_error_count=total_errors,
        app_crash_count=total_crashes,
        avg_error=avg_error,
        avg_crash=avg_crash,
        timeline=timeline,
    )
