from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    default_sub_admin_id: Optional[int] = None


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    default_sub_admin_id: Optional[int] = None


class SubAdminBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: str


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: Optional[str] = None
    default_sub_admin_id: Optional[int] = None
    sub_admin_count: Optional[int] = None
