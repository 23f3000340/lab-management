import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import Base, get_db
from app.core.security import hash_password
from app.models.user import User, Role, UserStatus
from app.models.category import Category
from app.models.ticket import Ticket, Priority, TicketStatus
from app.models.tag import Tag, TAG_COLORS
from app.models.activity_log import ActivityLog, LogAction

from sqlalchemy.pool import StaticPool

SQLALCHEMY_TEST_URL = "sqlite:///:memory:"


@pytest.fixture(scope="session")
def engine():
    eng = create_engine(
        SQLALCHEMY_TEST_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    yield eng


@pytest.fixture(scope="function")
def db(engine):
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# --- Helper fixtures ---

@pytest.fixture
def admin_user(db):
    user = User(
        name="Admin User",
        email="admin_test@lab.local",
        hashed_password=hash_password("admin123"),
        role=Role.ADMIN,
        status=UserStatus.ACTIVE,
    )
    db.add(user)
    db.flush()
    return user


@pytest.fixture
def category(db):
    cat = Category(name="IT/System Test", description="Test category")
    db.add(cat)
    db.flush()
    return cat


@pytest.fixture
def category_fin(db):
    cat = Category(name="Finance Test", description="Finance test category")
    db.add(cat)
    db.flush()
    return cat


@pytest.fixture
def sub_admin_user(db, category):
    user = User(
        name="Sub Admin User",
        email="sub_admin_test@lab.local",
        hashed_password=hash_password("sub123"),
        role=Role.SUB_ADMIN,
        status=UserStatus.ACTIVE,
    )
    db.add(user)
    db.flush()
    user.categories = [category]
    db.flush()
    return user


@pytest.fixture
def regular_user(db):
    user = User(
        name="Regular User",
        email="user_test@lab.local",
        hashed_password=hash_password("user123"),
        role=Role.USER,
        status=UserStatus.ACTIVE,
    )
    db.add(user)
    db.flush()
    return user


@pytest.fixture
def regular_user2(db):
    user = User(
        name="Regular User 2",
        email="user2_test@lab.local",
        hashed_password=hash_password("user123"),
        role=Role.USER,
        status=UserStatus.ACTIVE,
    )
    db.add(user)
    db.flush()
    return user


@pytest.fixture
def pending_user(db):
    user = User(
        name="Pending User",
        email="pending_test@lab.local",
        hashed_password=hash_password("pending123"),
        role=Role.USER,
        status=UserStatus.PENDING,
        requested_role="USER",
    )
    db.add(user)
    db.flush()
    return user


@pytest.fixture
def inactive_user(db):
    user = User(
        name="Inactive User",
        email="inactive_test@lab.local",
        hashed_password=hash_password("inactive123"),
        role=Role.USER,
        status=UserStatus.INACTIVE,
    )
    db.add(user)
    db.flush()
    return user


@pytest.fixture
def test_tag(db):
    tag = Tag(name="test-tag", color=TAG_COLORS[0])
    db.add(tag)
    db.flush()
    return tag


@pytest.fixture
def test_tag2(db):
    tag = Tag(name="test-tag2", color=TAG_COLORS[1])
    db.add(tag)
    db.flush()
    return tag


def get_token(client, email, password):
    r = client.post("/api/auth/login", data={"username": email, "password": password})
    assert r.status_code == 200, f"Login failed: {r.text}"
    return r.json()["access_token"]


def auth_headers(client, email, password):
    return {"Authorization": f"Bearer {get_token(client, email, password)}"}


def create_ticket_via_api(client, headers, category_id, title="Test Ticket", note="This is a test note"):
    return client.post("/api/tickets", json={
        "title": title,
        "description": "Test description for the ticket",
        "category_id": category_id,
        "priority": "Medium",
        "note": note,
        "tag_ids": [],
    }, headers=headers)
