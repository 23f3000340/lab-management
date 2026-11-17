from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, field_validator
from app.models.ticket import Priority, TicketStatus


class TagBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    color: str


class UserBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: str


class CategoryBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str


class ActivityLogBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    ticket_id: int
    actor_id: int
    actor_name: Optional[str] = None
    actor_role: Optional[str] = None
    actor_email: Optional[str] = None
    action: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    note: str
    timestamp: datetime


class TicketCreate(BaseModel):
    title: str
    description: str
    category_id: int
    priority: Priority = Priority.Medium
    tag_ids: List[int] = []
    due_date: Optional[date] = None
    note: str

    @field_validator("note")
    @classmethod
    def note_min_length(cls, v: str) -> str:
        if len(v.strip()) < 5:
            raise ValueError("Note must be at least 5 characters")
        return v


class TicketStatusUpdate(BaseModel):
    status: TicketStatus
    note: str

    @field_validator("note")
    @classmethod
    def note_min_length(cls, v: str) -> str:
        if len(v.strip()) < 5:
            raise ValueError("Note must be at least 5 characters")
        return v


class TicketAssign(BaseModel):
    assignee_id: int
    note: str = ""


class TicketTagsUpdate(BaseModel):
    tag_ids: List[int]


class TicketFieldsUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[Priority] = None
    due_date: Optional[date] = None


class CommentRequest(BaseModel):
    note: str


class ApprovalNoteRequest(BaseModel):
    note: str
    fulfill_directly: Optional[bool] = False


class TicketOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str
    category_id: int
    priority: Priority
    status: TicketStatus
    created_by: int
    assigned_to: Optional[int] = None
    waiting_on: Optional[str] = None
    requires_admin_approval: bool
    approval_status: Optional[str] = None
    due_date: Optional[date] = None
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None
    creator: Optional[UserBrief] = None
    assignee: Optional[UserBrief] = None
    category: Optional[CategoryBrief] = None
    tags: List[TagBrief] = []
    activity_logs: List[ActivityLogBrief] = []
