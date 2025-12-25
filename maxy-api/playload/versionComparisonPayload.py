"""Synthetic payload builders for the Version Comparison widget."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Dict, Iterable, List, Tuple
import math
import random


@dataclass(frozen=True)
class VersionComparisonConfig:
    """Configuration used to synthesise version-comparison datasets."""

    application_id: str
    access_date: str
    os_type_a: str
    app_ver_a: str
    os_type_b: str
    app_ver_b: str
    tmzutc: int


@dataclass(frozen=True)
class VersionComparisonEntry:
    """Single row of the version comparison table."""

    applicationId: str
    osType: str
    appVer: str
    install: int
    dau: int
    error: int
    crash: int
    loadingTime: int
    responseTime: int


@dataclass(frozen=True)
class VersionComparisonDataset:
    """Synthetic dataset containing the two version rows and aggregated totals."""

    rows: Tuple[VersionComparisonEntry, VersionComparisonEntry]
    totals: Dict[str, int]

    def as_payload(self) -> Dict[str, object]:
        """Return the dictionary payload structure expected by the API layer."""

        return {
            "versionData": [entry.__dict__ for entry in self.rows],
            "totalVersionData": self.totals,
        }


@dataclass(frozen=True)
class VersionComparisonAllConfig:
    """Parameters for producing the All popup table."""

    application_id: str
    date_type: str
    tmzutc: int
    size: int = 8


@dataclass(frozen=True)
class VersionComparisonRowConfig:
    """Parameters for producing the row drill-down series."""

    application_id: str
    os_type: str
    app_ver: str
    date_type: str
    tmzutc: int


def _make_rng(*keys: object) -> random.Random:
    seed = 0
    for key in keys:
        seed ^= hash(key)
    return random.Random(seed)


def _build_entry(
    cfg: VersionComparisonConfig,
    os_type: str,
    app_ver: str,
    install_baseline: float,
    rng: random.Random,
) -> VersionComparisonEntry:
    install = max(int(round(install_baseline * rng.uniform(0.9, 1.1))), 500)
    dau = max(int(round(install * rng.uniform(0.58, 0.82))), 320)
    error = max(int(round(dau * rng.uniform(0.011, 0.024))), 5)
    crash = max(int(round(error * rng.uniform(0.05, 0.16))), 1)
    loading_time = int(round(rng.uniform(1100, 2600)))
    response_time = int(round(rng.uniform(850, 2100)))

    return VersionComparisonEntry(
        applicationId=cfg.application_id,
        osType=os_type,
        appVer=app_ver,
        install=install,
        dau=dau,
        error=error,
        crash=crash,
        loadingTime=loading_time,
        responseTime=response_time,
    )


def _aggregate(keys: Iterable[str], rows: Iterable[VersionComparisonEntry]) -> Dict[str, int]:
    totals: Dict[str, int] = {key: 0 for key in keys}

    for row in rows:
        for key in keys:
            totals[key] += getattr(row, key)

    return totals


def build_version_comparison_dataset(cfg: VersionComparisonConfig) -> VersionComparisonDataset:
    """Assemble deterministic yet lifelike comparison data for two versions."""

    rng = _make_rng(
        "version-comparison",
        cfg.application_id,
        cfg.access_date,
        cfg.os_type_a,
        cfg.app_ver_a,
        cfg.os_type_b,
        cfg.app_ver_b,
        cfg.tmzutc,
    )

    install_anchor = rng.uniform(12_000, 28_000)
    bias = rng.uniform(0.76, 1.24)

    primary = _build_entry(cfg, cfg.os_type_a, cfg.app_ver_a, install_anchor, rng)
    secondary = _build_entry(cfg, cfg.os_type_b, cfg.app_ver_b, install_anchor * bias, rng)

    rows = (primary, secondary)
    keys = ("install", "dau", "error", "crash", "loadingTime", "responseTime")
    totals = _aggregate(keys, rows)

    return VersionComparisonDataset(rows=rows, totals=totals)


def build_version_comparison_all_list(cfg: VersionComparisonAllConfig) -> List[Dict[str, int]]:
    """Return synthetic rows for the Version Comparison All popup."""

    rng = _make_rng(
        "version-comparison-all", cfg.application_id, cfg.date_type, cfg.size, cfg.tmzutc
    )
    os_variants = ["Android", "iOS", "HarmonyOS"]
    base_install = rng.uniform(11_000, 26_000)
    base_loading = rng.uniform(1300, 2500)
    base_response = rng.uniform(1000, 2100)

    rows: List[Dict[str, int]] = []
    for index in range(max(2, cfg.size)):
        os_type = os_variants[index % len(os_variants)]
        if rng.random() > 0.72:
            os_type = rng.choice(os_variants)

        major = rng.randint(3, 8)
        minor = rng.randint(0, 9)
        patch = rng.randint(0, 9)
        app_ver = f"{major}.{minor}.{patch}"

        popularity = max(0.32, 1.05 - index * 0.09 + rng.uniform(-0.08, 0.08))
        install = max(int(round(base_install * popularity)), 500)
        dau = max(int(round(install * rng.uniform(0.55, 0.82))), 240)
        error = max(int(round(dau * rng.uniform(0.012, 0.026))), 4)
        crash = max(int(round(error * rng.uniform(0.05, 0.18))), 1)
        loading_time = int(round(base_loading * rng.uniform(0.8, 1.15)))
        response_time = int(round(base_response * rng.uniform(0.85, 1.12)))

        rows.append(
            {
                "applicationId": cfg.application_id,
                "osType": os_type,
                "appVer": app_ver,
                "install": install,
                "dau": dau,
                "error": error,
                "crash": crash,
                "loadingTime": loading_time,
                "responseTime": response_time,
            }
        )

    rows.sort(key=lambda item: item["dau"], reverse=True)
    return rows[: cfg.size]


def build_version_comparison_row_series(cfg: VersionComparisonRowConfig) -> Dict[str, List[List[int]]]:
    """Return synthetic timeseries for the Version Comparison row drill-down."""

    rng = _make_rng(
        "version-comparison-row",
        cfg.application_id,
        cfg.os_type,
        cfg.app_ver,
        cfg.date_type,
        cfg.tmzutc,
    )

    if cfg.date_type.upper() == "MONTH":
        points = 30
        step = timedelta(days=1)
    elif cfg.date_type.upper() == "WEEK":
        points = 7
        step = timedelta(days=1)
    else:
        points = 24
        step = timedelta(hours=1)

    end_time = datetime.utcnow()

    install_series: List[List[int]] = []
    dau_series: List[List[int]] = []
    error_series: List[List[int]] = []
    crash_series: List[List[int]] = []
    loading_series: List[List[int]] = []
    response_series: List[List[int]] = []

    base_volume = 820 + abs(hash((cfg.application_id, cfg.os_type, cfg.app_ver))) % 1100
    base_loading = 1400 + abs(hash((cfg.app_ver, "loading"))) % 900
    base_response = 1050 + abs(hash((cfg.os_type, "response"))) % 650

    for index in range(points):
        timestamp = end_time - step * (points - index - 1)
        ts_value = int(timestamp.timestamp())

        phase = index / max(points - 1, 1)
        seasonal = 1.0 + rng.uniform(-0.08, 0.08) + 0.25 * math.sin(phase * math.pi)

        install_value = max(int(round(base_volume * seasonal)), 400)
        dau_value = max(int(round(install_value * rng.uniform(0.58, 0.8))), 200)
        error_value = max(int(round(dau_value * rng.uniform(0.012, 0.028))), 2)
        crash_value = max(int(round(error_value * rng.uniform(0.05, 0.18))), 0)

        loading_value = int(round(base_loading * (1 + math.cos(phase * math.pi * 1.55) * 0.16) * rng.uniform(0.88, 1.12)))
        response_value = int(
            round(base_response * (1 + math.sin(phase * math.pi * 1.8) * 0.14) * rng.uniform(0.9, 1.1))
        )

        install_series.append([ts_value, install_value])
        dau_series.append([ts_value, dau_value])
        error_series.append([ts_value, error_value])
        crash_series.append([ts_value, crash_value])
        loading_series.append([ts_value, loading_value])
        response_series.append([ts_value, response_value])

    return {
        "install": install_series,
        "dau": dau_series,
        "error": error_series,
        "crash": crash_series,
        "loadingTime": loading_series,
        "responseTime": response_series,
    }
