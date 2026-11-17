import pytest
from tests.conftest import auth_headers, create_ticket_via_api


def test_user_sees_only_own_tickets(client, regular_user, regular_user2, admin_user, category):
    # regular_user creates a ticket
    h1 = auth_headers(client, "user_test@lab.local", "user123")
    r = create_ticket_via_api(client, h1, category.id, title="User1 ticket")
    assert r.status_code == 201

    # regular_user2 creates a ticket
    h2 = auth_headers(client, "user2_test@lab.local", "user123")
    r2 = create_ticket_via_api(client, h2, category.id, title="User2 ticket")
    assert r2.status_code == 201

    # user1 lists tickets - should only see their own
    r3 = client.get("/api/tickets", headers=h1)
    assert r3.status_code == 200
    tickets = r3.json()
    for t in tickets:
        assert t["created_by"] == regular_user.id


def test_user_cannot_fulfill_ticket(client, regular_user, admin_user, sub_admin_user, category):
    h_user = auth_headers(client, "user_test@lab.local", "user123")
    h_admin = auth_headers(client, "admin_test@lab.local", "admin123")
    h_sub = auth_headers(client, "sub_admin_test@lab.local", "sub123")

    # Create ticket as user
    r = create_ticket_via_api(client, h_user, category.id)
    assert r.status_code == 201
    tid = r.json()["id"]

    # Admin assigns
    client.put(f"/api/tickets/{tid}/assign", json={"assignee_id": sub_admin_user.id, "note": "assigning"}, headers=h_admin)
    # Sub_admin moves to IN_PROGRESS
    client.put(f"/api/tickets/{tid}/status", json={"status": "IN_PROGRESS", "note": "starting work"}, headers=h_sub)

    # User tries to fulfill - should fail (403)
    r2 = client.put(f"/api/tickets/{tid}/status", json={"status": "FULFILLED", "note": "user fulfills"}, headers=h_user)
    assert r2.status_code == 403


def test_sub_admin_sees_only_category_tickets(client, regular_user, sub_admin_user, admin_user, category, category_fin):
    h_user = auth_headers(client, "user_test@lab.local", "user123")
    h_sub = auth_headers(client, "sub_admin_test@lab.local", "sub123")

    # Create ticket in IT/System Test (sub_admin's category)
    r1 = create_ticket_via_api(client, h_user, category.id, title="IT ticket")
    assert r1.status_code == 201

    # Create ticket in Finance Test (not sub_admin's category)
    r2 = create_ticket_via_api(client, h_user, category_fin.id, title="Finance ticket")
    assert r2.status_code == 201

    # Sub admin lists - should only see IT/System tickets
    r3 = client.get("/api/tickets", headers=h_sub)
    assert r3.status_code == 200
    tickets = r3.json()
    for t in tickets:
        assert t["category_id"] == category.id


def test_admin_sees_all_tickets(client, regular_user, admin_user, category, category_fin):
    h_user = auth_headers(client, "user_test@lab.local", "user123")
    h_admin = auth_headers(client, "admin_test@lab.local", "admin123")

    create_ticket_via_api(client, h_user, category.id, title="Ticket A")
    create_ticket_via_api(client, h_user, category_fin.id, title="Ticket B")

    r = client.get("/api/tickets", headers=h_admin)
    assert r.status_code == 200
    tickets = r.json()
    cat_ids = {t["category_id"] for t in tickets}
    assert category.id in cat_ids
    assert category_fin.id in cat_ids


def test_only_admin_can_approve_ticket(client, regular_user, sub_admin_user, admin_user, category):
    h_user = auth_headers(client, "user_test@lab.local", "user123")
    h_sub = auth_headers(client, "sub_admin_test@lab.local", "sub123")
    h_admin = auth_headers(client, "admin_test@lab.local", "admin123")

    r = create_ticket_via_api(client, h_user, category.id)
    tid = r.json()["id"]

    # Assign and move to IN_PROGRESS
    client.put(f"/api/tickets/{tid}/assign", json={"assignee_id": sub_admin_user.id, "note": "assigning"}, headers=h_admin)
    client.put(f"/api/tickets/{tid}/status", json={"status": "IN_PROGRESS", "note": "starting"}, headers=h_sub)

    # Sub_admin requests approval
    client.post(f"/api/tickets/{tid}/request_approval", json={"note": "requesting approval"}, headers=h_sub)

    # User tries to approve - should 403
    r2 = client.post(f"/api/tickets/{tid}/approve", json={"note": "user approves"}, headers=h_user)
    assert r2.status_code in (401, 403)

    # Sub admin tries to approve - should 403
    r3 = client.post(f"/api/tickets/{tid}/approve", json={"note": "sub approves"}, headers=h_sub)
    assert r3.status_code == 403

    # Admin approves - should 200
    r4 = client.post(f"/api/tickets/{tid}/approve", json={"note": "admin approves it"}, headers=h_admin)
    assert r4.status_code == 200


def test_only_admin_can_manage_users(client, regular_user, sub_admin_user, admin_user):
    h_user = auth_headers(client, "user_test@lab.local", "user123")
    h_sub = auth_headers(client, "sub_admin_test@lab.local", "sub123")
    h_admin = auth_headers(client, "admin_test@lab.local", "admin123")

    # Non-admin cannot list users
    r1 = client.get("/api/users", headers=h_user)
    assert r1.status_code == 403

    r2 = client.get("/api/users", headers=h_sub)
    assert r2.status_code == 403

    # Admin can list users
    r3 = client.get("/api/users", headers=h_admin)
    assert r3.status_code == 200
