import enum
from datetime import date, datetime
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, Enum as SAEnum, ForeignKey, Boolean, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database import Base
from app.models.tag import ticket_tags

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.category import Category
    from app.models.tag import Tag
    from app.models.activity_log import ActivityLog


class Priority(str, enum.Enum):
    Low = "Low"
    Medium = "Medium"
    High = "High"
    Urgent = "Urgent"


class TicketStatus(str, enum.Enum):
    OPEN = "OPEN"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    NEEDS_INFO = "NEEDS_INFO"
    AWAITING_APPROVAL = "AWAITING_APPROVAL"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    FULFILLED = "FULFILLED"
    CLOSED = "CLOSED"


class Ticket(Base):
    __tablename__ = "tickets"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(512))
    description: Mapped[str] = mapped_column(String(4096))
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id"))
    priority: Mapped[Priority] = mapped_column(SAEnum(Priority), default=Priority.Medium)
    status: Mapped[TicketStatus] = mapped_column(SAEnum(TicketStatus), default=TicketStatus.OPEN)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    assigned_to: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    waiting_on: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    requires_admin_approval: Mapped[bool] = mapped_column(Boolean, default=False)
    approval_status: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now(), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        default=func.now(), server_default=func.now(), onupdate=func.now()
    )
    resolved_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)

    # Relationships
    creator: Mapped["User"] = relationship("User", foreign_keys=[created_by], back_populates="created_tickets")
    assignee: Mapped[Optional["User"]] = relationship("User", foreign_keys=[assigned_to], back_populates="assigned_tickets")
    category: Mapped["Category"] = relationship("Category", back_populates="tickets")
    tags: Mapped[List["Tag"]] = relationship("Tag", secondary=ticket_tags, back_populates="tickets")
    activity_logs: Mapped[List["ActivityLog"]] = relationship("ActivityLog", back_populates="ticket", order_by="ActivityLog.timestamp")
