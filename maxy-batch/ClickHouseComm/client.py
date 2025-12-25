"""
Thin wrapper around clickhouse_connect client with lazy singleton for batch jobs.
"""

from functools import lru_cache

try:
    import clickhouse_connect  # type: ignore
except ImportError:  # pragma: no cover - optional dependency warning only
    clickhouse_connect = None  # type: ignore

from .config import ClickHouseSettings


# @lru_cache(maxsize=8)
def _get_client_internal(host: str, port: int, username: str, password: str, database: str, secure: bool):
    if clickhouse_connect is None:
        raise RuntimeError(
            "clickhouse-connect is required. Install with `pip install clickhouse-connect`."
        )
    return clickhouse_connect.get_client(
        host=host,
        port=port,
        username=username,
        password=password,
        database=database,
        secure=secure,
    )


def get_client(settings: ClickHouseSettings | None = None):
    """
    Return a cached clickhouse_connect client. Pass settings to override env.
    """
    s = settings or ClickHouseSettings()
    return _get_client_internal(s.host, s.port, s.username, s.password, s.database, s.secure)
