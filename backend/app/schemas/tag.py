from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class TagCreate(BaseModel):
    name: str


class TagUpdate(BaseModel):
    name: str


class TagOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    color: str
    created_at: datetime
    usage_count: Optional[int] = None


class TagMerge(BaseModel):
    source_id: int
    target_id: int
