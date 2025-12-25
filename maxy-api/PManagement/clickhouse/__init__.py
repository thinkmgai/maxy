from pathlib import Path

from ClickHouseComm import SqlMapper, get_client, ClickHouseSettings

SQL = SqlMapper(str(Path(__file__).parent / "sql" / "resources" / "*.xml"))

__all__ = ["SQL", "ClickHouseSettings", "get_client"]
