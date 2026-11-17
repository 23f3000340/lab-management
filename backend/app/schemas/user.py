from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, ConfigDict
from app.models.user import Role, UserStatus


class CategoryBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str


class UserBase(BaseModel):
    name: str
    email: EmailStr


class UserCreate(UserBase):
    password: str
    role: Role = Role.USER
    status: UserStatus = UserStatus.ACTIVE
    category_ids: List[int] = []


class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[Role] = None
    status: Optional[UserStatus] = None
    category_ids: Optional[List[int]] = None


class UserApprove(BaseModel):
    role: Optional[Role] = None
    category_ids: Optional[List[int]] = []


class UserReject(BaseModel):
    reason: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    role: Role
    status: UserStatus
    requested_role: Optional[str] = None
    requested_categories: Optional[str] = None
    rejection_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    categories: List[CategoryBrief] = []
