from typing import List

from ClickHouseComm import get_client
from . import SQL
from .dto import PerformanceQuery, PerformanceRow


def fetch_metrics(query: PerformanceQuery) -> List[PerformanceRow]:
    params = query.model_dump()
    sql = SQL.render("performance.selectMetrics", params)
    client = get_client()
    result = client.query(sql, params)
    return [PerformanceRow.model_validate(dict(zip(result.column_names, row))) for row in result.result_rows]
