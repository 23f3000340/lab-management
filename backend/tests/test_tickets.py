import pytest
from app.models.category import Category
from tests.conftest import auth_headers, create_ticket_via_api


def test_auto_assignment_to_default_sub_admin(client, regular_user, sub_admin_user, admin_user, category, db):
    # Set category's default_sub_admin
    category.default_sub_admin_id = sub_admin_user.id
    db.flush()

    h_user = auth_headers(client, "user_test@lab.local", "user123")
    r = create_ticket_via_api(client, h_user, category.id)
    assert r.status_code == 201
    ticket = r.json()
    assert ticket["assigned_to"] == sub_admin_user.id
    assert ticket["status"] == "ASSIGNED"


def test_waiting_on_updates_with_status(client, regular_user, sub_admin_user, admin_user, category):
    h_user = auth_headers(client, "user_test@lab.local", "user123")
    h_sub = auth_headers(client, "sub_admin_test@lab.local", "sub123")
    h_admin = auth_headers(client, "admin_test@lab.local", "admin123")

    r = create_ticket_via_api(client, h_user, category.id)
    tid = r.json()["id"]
    assert r.json()["waiting_on"] == "SUB_ADMIN"

    # Assign -> still SUB_ADMIN
    client.put(f"/api/tickets/{tid}/assign", json={"assignee_id": sub_admin_user.id, "note": "assigning"}, headers=h_admin)
    r2 = client.get(f"/api/tickets/{tid}", headers=h_admin)
    assert r2.json()["waiting_on"] == "SUB_ADMIN"

    # IN_PROGRESS -> SUB_ADMIN
    client.put(f"/api/tickets/{tid}/status", json={"status": "IN_PROGRESS", "note": "starting now"}, headers=h_sub)
    r3 = client.get(f"/api/tickets/{tid}", headers=h_admin)
    assert r3.json()["waiting_on"] == "SUB_ADMIN"

    # NEEDS_INFO -> USER
    client.put(f"/api/tickets/{tid}/status", json={"status": "NEEDS_INFO", "note": "need more details"}, headers=h_sub)
    r4 = client.get(f"/api/tickets/{tid}", headers=h_admin)
    assert r4.json()["waiting_on"] == "USER"

    # Back to IN_PROGRESS -> SUB_ADMIN
    client.put(f"/api/tickets/{tid}/status", json={"status": "IN_PROGRESS", "note": "got the info needed"}, headers=h_user)
    r5 = client.get(f"/api/tickets/{tid}", headers=h_admin)
    assert r5.json()["waiting_on"] == "SUB_ADMIN"


def test_tags_add_remove_by_creator(client, regular_user, admin_user, category, test_tag, test_tag2):
    h_user = auth_headers(client, "user_test@lab.local", "user123")

    r = create_ticket_via_api(client, h_user, category.id)
    tid = r.json()["id"]

    # Add tags
    r2 = client.put(f"/api/tickets/{tid}/tags", json={"tag_ids": [test_tag.id, test_tag2.id]}, headers=h_user)
    assert r2.status_code == 200
    tag_ids_in_resp = [t["id"] for t in r2.json()["tags"]]
    assert test_tag.id in tag_ids_in_resp
    assert test_tag2.id in tag_ids_in_resp

    # Remove one tag
    r3 = client.put(f"/api/tickets/{tid}/tags", json={"tag_ids": [test_tag.id]}, headers=h_user)
    assert r3.status_code == 200
    tag_ids_in_resp2 = [t["id"] for t in r3.json()["tags"]]
    assert test_tag.id in tag_ids_in_resp2
    assert test_tag2.id not in tag_ids_in_resp2


def test_tags_blocked_for_non_creator_user(client, regular_user, regular_user2, admin_user, category, test_tag):
    h_user = auth_headers(client, "user_test@lab.local", "user123")
    h_user2 = auth_headers(client, "user2_test@lab.local", "user123")

    # user1 creates ticket
    r = create_ticket_via_api(client, h_user, category.id)
    tid = r.json()["id"]

    # user2 tries to update tags - should 403
    r2 = client.put(f"/api/tickets/{tid}/tags", json={"tag_ids": [test_tag.id]}, headers=h_user2)
    assert r2.status_code == 403


def test_search_by_tag(client, regular_user, admin_user, category, test_tag, test_tag2):
    h_user = auth_headers(client, "user_test@lab.local", "user123")
    h_admin = auth_headers(client, "admin_test@lab.local", "admin123")

    # Create two tickets
    r1 = create_ticket_via_api(client, h_user, category.id, title="Ticket with tag one")
    t1_id = r1.json()["id"]
    r2 = create_ticket_via_api(client, h_user, category.id, title="Ticket without tag")
    t2_id = r2.json()["id"]

    # Add test_tag to ticket 1 only
    client.put(f"/api/tickets/{t1_id}/tags", json={"tag_ids": [test_tag.id]}, headers=h_user)

    # Search by tag
    r3 = client.get(f"/api/tickets?tag_id={test_tag.id}", headers=h_admin)
    assert r3.status_code == 200
    ticket_ids = [t["id"] for t in r3.json()]
    assert t1_id in ticket_ids
    assert t2_id not in ticket_ids


def test_dashboard_summary_counts(client, regular_user, sub_admin_user, admin_user, category):
    h_user = auth_headers(client, "user_test@lab.local", "user123")
    h_sub = auth_headers(client, "sub_admin_test@lab.local", "sub123")
    h_admin = auth_headers(client, "admin_test@lab.local", "admin123")

    # Create some tickets
    for i in range(3):
        create_ticket_via_api(client, h_user, category.id, title=f"Open ticket {i}")

    r = client.get("/api/dashboard/summary", headers=h_admin)
    assert r.status_code == 200
    data = r.json()
    assert "open" in data
    assert "awaiting_my_approval" in data
    assert "stuck" in data
    assert "overdue" in data
    assert "resolved_this_week" in data
    assert "pending_onboarding" in data
    assert data["open"] >= 3
