import pytest
from tests.conftest import auth_headers, get_token


def test_pending_user_blocked(client, pending_user):
    r = client.post("/api/auth/login", data={"username": "pending_test@lab.local", "password": "pending123"})
    assert r.status_code == 403
    assert r.json()["detail"] == "pending_approval"


def test_inactive_user_blocked(client, inactive_user):
    r = client.post("/api/auth/login", data={"username": "inactive_test@lab.local", "password": "inactive123"})
    assert r.status_code == 403
    assert r.json()["detail"] == "account_inactive"


def test_active_user_login(client, regular_user):
    r = client.post("/api/auth/login", data={"username": "user_test@lab.local", "password": "user123"})
    assert r.status_code == 200
    data = r.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_me_endpoint(client, regular_user):
    headers = auth_headers(client, "user_test@lab.local", "user123")
    r = client.get("/api/auth/me", headers=headers)
    assert r.status_code == 200
    data = r.json()
    assert data["email"] == "user_test@lab.local"
    assert data["name"] == "Regular User"
    assert data["role"] == "USER"
