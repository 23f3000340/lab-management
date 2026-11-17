from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from app.models.activity_log import LogAction


class ActivityLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ticket_id: int
    actor_id: int
    actor_name: Optional[str] = None
    actor_role: Optional[str] = None
    actor_email: Optional[str] = None
    action: LogAction
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    note: str
    timestamp: datetime
