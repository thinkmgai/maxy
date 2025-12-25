from typing import List

from ClickHouseComm import get_client
from . import SQL
from .dto import UserRow, UserSearch


def search_users(params: UserSearch) -> List[UserRow]:
    payload = params.model_dump()
    sql = SQL.render("management.searchUsers", payload)
    client = get_client()
    result = client.query(sql, payload)
    return [UserRow.model_validate(dict(zip(result.column_names, row))) for row in result.result_rows]
