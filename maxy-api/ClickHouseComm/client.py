"""
Thin wrapper around clickhouse_connect client with lazy singleton.
"""

import logging
import os
import time
from functools import lru_cache
from typing import Any
import inspect

try:
    import clickhouse_connect  # type: ignore
except ImportError as exc:  # pragma: no cover - runtime warning only
    raise RuntimeError(
        "clickhouse-connect is required. Install with `pip install clickhouse-connect`."
    ) from exc

from .config import ClickHouseSettings


_TRUTHY = {"1", "true", "yes", "y", "on"}
_THIS_FILE = __file__


def _log_sql_enabled() -> bool:
    return str(os.getenv("CLICKHOUSE_LOG_SQL") or "").strip().lower() in _TRUTHY


def _caller_name() -> str:
    for frame in inspect.stack()[2:]:
        if frame.filename != _THIS_FILE:
            return frame.function
    return "unknown"


class _LoggingClient:
    def __init__(self, inner: Any):
        self._inner = inner

    def query(self, query: str, parameters: Any = None, *args: Any, **kwargs: Any) -> Any:
        caller = _caller_name()
        started = time.perf_counter()
        try:
            result = self._inner.query(query, parameters, *args, **kwargs)
        except Exception:
            logging.exception("[clickhouse] caller=%s query failed sql=%s params=%s", caller, query, parameters)
            raise

        elapsed_ms = (time.perf_counter() - started) * 1000.0
        rows = getattr(result, "result_rows", None)
        row_count = len(rows) if isinstance(rows, list) else None
        logging.info(
            "[clickhouse] caller=%s %.1fms rows=%s sql=%s params=%s",
            caller,
            elapsed_ms,
            row_count,
            query,
            parameters,
        )
        return result

    def __getattr__(self, name: str) -> Any:
        return getattr(self._inner, name)


# @lru_cache(maxsize=1)
def get_client(settings: ClickHouseSettings | None = None):
    """
    Return a cached clickhouse_connect client. Pass settings to override env.
    """
    s = settings or ClickHouseSettings()
    client = clickhouse_connect.get_client(
        host=s.host,
        port=s.port,
        username=s.username,
        password=s.password,    
        database=s.database,
        secure=s.secure,
    )
    if _log_sql_enabled():
        return _LoggingClient(client)
    return client
