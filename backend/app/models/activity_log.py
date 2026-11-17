import enum
from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Enum as SAEnum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database import Base

if TYPE_CHECKING:
    from app.models.ticket import Ticket
    from app.models.user import User


class LogAction(str, enum.Enum):
    created = "created"
    assigned = "assigned"
    reassigned = "reassigned"
    status_changed = "status_changed"
    commented = "commented"
    tag_added = "tag_added"
    tag_removed = "tag_removed"
    approval_requested = "approval_requested"
    approved = "approved"
    rejected = "rejected"


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("tickets.id"))
    actor_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    action: Mapped[LogAction] = mapped_column(SAEnum(LogAction))
    old_value: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    new_value: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    note: Mapped[str] = mapped_column(String(2048))
    timestamp: Mapped[datetime] = mapped_column(default=func.now(), server_default=func.now())

    ticket: Mapped["Ticket"] = relationship("Ticket", back_populates="activity_logs")
    actor: Mapped["User"] = relationship("User", foreign_keys=[actor_id])

    @property
    def actor_name(self) -> str:
        return self.actor.name if self.actor else f"User #{self.actor_id}"

    @property
    def actor_role(self) -> str:
        return self.actor.role.value if self.actor else ""

    @property
    def actor_email(self) -> str:
        return self.actor.email if self.actor else ""
