from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from app.models.user import user_categories

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.ticket import Ticket


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), unique=True)
    description: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    default_sub_admin_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )

    # Relationships
    default_sub_admin: Mapped[Optional["User"]] = relationship(
        "User", foreign_keys=[default_sub_admin_id]
    )
    sub_admins: Mapped[List["User"]] = relationship(
        "User", secondary=user_categories, back_populates="categories"
    )
    tickets: Mapped[List["Ticket"]] = relationship("Ticket", back_populates="category")
