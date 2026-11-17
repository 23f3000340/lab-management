from datetime import datetime
from typing import List, TYPE_CHECKING
from sqlalchemy import String, Table, Column, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database import Base

if TYPE_CHECKING:
    from app.models.ticket import Ticket

TAG_COLORS = [
    "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4",
    "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#f59e0b"
]

# Association table for Ticket <-> Tag
ticket_tags = Table(
    "ticket_tags",
    Base.metadata,
    Column("ticket_id", Integer, ForeignKey("tickets.id"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id"), primary_key=True),
)


class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    color: Mapped[str] = mapped_column(String(10))
    created_at: Mapped[datetime] = mapped_column(default=func.now(), server_default=func.now())

    tickets: Mapped[List["Ticket"]] = relationship(
        "Ticket", secondary=ticket_tags, back_populates="tags"
    )
