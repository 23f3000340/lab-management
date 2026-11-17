"""
Seed script for Lab Request Tracker (Production Clean Seed).
Seeds ONLY Categories, Tags, and the 1 Professor Admin user.
No dummy test users or sample tickets are created.
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, SessionLocal, Base
from app.models import (
    User, Role, UserStatus,
    Category,
    Tag, TAG_COLORS,
)
from app.core.security import hash_password
from app.config import settings


def clear_tables(db):
    if "sqlite" in engine.url.drivername:
        db.execute(__import__("sqlalchemy").text("PRAGMA foreign_keys = OFF"))
        for table in reversed(Base.metadata.sorted_tables):
            db.execute(table.delete())
        db.execute(__import__("sqlalchemy").text("PRAGMA foreign_keys = ON"))
    else:
        for table in reversed(Base.metadata.sorted_tables):
            db.execute(__import__("sqlalchemy").text(f'TRUNCATE TABLE "{table.name}" CASCADE'))
    db.commit()


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    clear_tables(db)

    # 1. Categories
    cat_it = Category(name="IT/System", description="IT and system infrastructure requests")
    cat_fin = Category(name="Finance", description="Finance and budget requests")
    cat_ops = Category(name="Operations", description="Lab operations and logistics")
    cat_other = Category(name="Other", description="Miscellaneous requests")
    db.add_all([cat_it, cat_fin, cat_ops, cat_other])
    db.flush()

    # 2. Only ADMIN (Professor)
    admin_email = getattr(settings, "ADMIN_EMAIL", "admin@lab.local")
    admin_password = getattr(settings, "ADMIN_PASSWORD", "admin123")

    admin = User(
        name="Professor Admin",
        email=admin_email,
        hashed_password=hash_password(admin_password),
        role=Role.ADMIN,
        status=UserStatus.ACTIVE,
    )
    db.add(admin)
    db.flush()

    # 3. Standard Tags
    tag_names = [
        "urgent", "hardware", "software", "budget", "research",
        "maintenance", "network", "compliance", "equipment", "data"
    ]
    for i, tn in enumerate(tag_names):
        t = Tag(name=tn, color=TAG_COLORS[i % len(TAG_COLORS)])
        db.add(t)
    db.flush()

    db.commit()
    print("✅ Clean production seed completed successfully!")
    print("   Categories: 4 (IT/System, Finance, Operations, Other)")
    print(f"   Users: 1 Admin ({admin_email})")
    print(f"   Tags: {len(tag_names)}")
    print("   Tickets: 0 (Fresh clean state)")
    db.close()


if __name__ == "__main__":
    seed()
