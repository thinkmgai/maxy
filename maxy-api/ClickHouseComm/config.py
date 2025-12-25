"""
Environment-driven ClickHouse settings loader.
"""

from dataclasses import dataclass
import os


def _as_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.lower() in {"1", "true", "yes", "y", "on"}


@dataclass(slots=True)
class ClickHouseSettings:
    host: str = os.getenv("CLICKHOUSE_HOST", "localhost")
    port: int = int(os.getenv("CLICKHOUSE_PORT", "8123"))
    username: str = os.getenv("CLICKHOUSE_USER", "default")
    password: str = os.getenv("CLICKHOUSE_PASSWORD", "")
    database: str = os.getenv("CLICKHOUSE_DB", "default")
    secure: bool = _as_bool(os.getenv("CLICKHOUSE_SECURE"), False)

    @property
    def url(self) -> str:
        scheme = "https" if self.secure else "http"
        return f"{scheme}://{self.host}:{self.port}/{self.database}"
