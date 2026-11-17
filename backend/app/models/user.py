import enum
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, Enum as SAEnum, ForeignKey, Table, Column, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database import Base

if TYPE_CHECKING:
    from app.models.category import Category
    from app.models.ticket import Ticket


class Role(str, enum.Enum):
    ADMIN = "ADMIN"
    SUB_ADMIN = "SUB_ADMIN"
    USER = "USER"


class UserStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"


# Association table for SUB_ADMIN <-> Category memberships
user_categories = Table(
    "user_categories",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id"), primary_key=True),
    Column("category_id", Integer, ForeignKey("categories.id"), primary_key=True),
)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    role: Mapped[Role] = mapped_column(SAEnum(Role), default=Role.USER)
    status: Mapped[UserStatus] = mapped_column(SAEnum(UserStatus), default=UserStatus.PENDING)
    requested_role: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    requested_categories: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    rejection_reason: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now(), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        default=func.now(), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    categories: Mapped[List["Category"]] = relationship(
        "Category", secondary=user_categories, back_populates="sub_admins"
    )
    created_tickets: Mapped[List["Ticket"]] = relationship(
        "Ticket", foreign_keys="Ticket.created_by", back_populates="creator"
    )
    assigned_tickets: Mapped[List["Ticket"]] = relationship(
        "Ticket", foreign_keys="Ticket.assigned_to", back_populates="assignee"
    )
