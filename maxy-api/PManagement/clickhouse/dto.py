from typing import Optional
from pydantic import BaseModel


class UserSearch(BaseModel):
    keyword: Optional[str] = None
    limit: int = 100


class UserRow(BaseModel):
    user_no: int
    user_id: str
    level: int
    app_name: Optional[str] = None
