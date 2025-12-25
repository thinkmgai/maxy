"""
Centralized environment settings for batch jobs.
"""

from dataclasses import dataclass, field
import os

from ClickHouseComm.config import ClickHouseSettings


def _as_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.lower() in {"1", "true", "yes", "y", "on"}


@dataclass(frozen=True)
class BatchSettings:
    batch_log_index: str = "scheduler"

    valkey_host: str = os.getenv("VALKEY_HOST", "localhost")
    valkey_port: int = int(os.getenv("VALKEY_PORT", "6379"))
    valkey_password: str | None = os.getenv("VALKEY_PASSWORD")
    valkey_db: int = int(os.getenv("VALKEY_DB", "0"))
    valkey_ssl: bool = _as_bool(os.getenv("VALKEY_SSL"), False)
    valkey_prefix: str = os.getenv("VALKEY_PREFIX", "stats:realtime")

    clickhouse: ClickHouseSettings = field(default_factory=ClickHouseSettings)


SETTINGS = BatchSettings()

__all__ = ["SETTINGS", "BatchSettings", "ClickHouseSettings"]
