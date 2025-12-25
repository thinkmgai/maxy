from pathlib import Path

from ClickHouseComm import ClickHouseSettings, SqlMapper, get_client

SQL = SqlMapper(str(Path(__file__).parent / "sql" / "resources" / "*.xml"))

__all__ = ["SQL", "ClickHouseSettings", "get_client"]

