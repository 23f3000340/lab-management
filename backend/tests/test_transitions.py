import pytest
from tests.conftest import auth_headers, create_ticket_via_api


def setup_ticket_at_status(client, h_user, h_sub, h_admin, category_id, sub_admin_id, target_status):
    """Helper to create a ticket and advance it to the given status."""
    r = create_ticket_via_api(client, h_user, category_id)
    tid = r.json()["id"]

    if target_status == "OPEN":
        return tid

    client.put(f"/api/tickets/{tid}/assign", json={"assignee_id": sub_admin_id, "note": "assigning now"}, headers=h_admin)
    if target_status == "ASSIGNED":
        return tid

    client.put(f"/api/tickets/{tid}/status", json={"status": "IN_PROGRESS", "note": "starting work now"}, headers=h_sub)
    if target_status == "IN_PROGRESS":
        return tid

    if target_status == "NEEDS_INFO":
        client.put(f"/api/tickets/{tid}/status", json={"status": "NEEDS_INFO", "note": "need more info please"}, headers=h_sub)
        return tid

    if target_status == "AWAITING_APPROVAL":
        client.post(f"/api/tickets/{tid}/request_approval", json={"note": "requesting admin approval"}, headers=h_sub)
        return tid

    if target_status == "APPROVED":
        client.post(f"/api/tickets/{tid}/request_approval", json={"note": "requesting approval now"}, headers=h_sub)
        client.post(f"/api/tickets/{tid}/approve", json={"note": "approved by admin"}, headers=h_admin)
        return tid

    if target_status == "FULFILLED":
        client.post(f"/api/tickets/{tid}/request_approval", json={"note": "request approval first"}, headers=h_sub)
        client.post(f"/api/tickets/{tid}/approve", json={"note": "admin approves"}, headers=h_admin)
        client.put(f"/api/tickets/{tid}/status", json={"status": "FULFILLED", "note": "work completed fully"}, headers=h_sub)
        return tid

    return tid


@pytest.mark.parametrize("from_status,to_status,actor_role,expected_code", [
    ("OPEN", "ASSIGNED", "sub_admin", 200),
    ("ASSIGNED", "IN_PROGRESS", "sub_admin", 200),
    ("IN_PROGRESS", "NEEDS_INFO", "sub_admin", 200),
    ("IN_PROGRESS", "FULFILLED", "sub_admin", 200),
    ("AWAITING_APPROVAL", "APPROVED", "admin", 200),
    ("AWAITING_APPROVAL", "REJECTED", "admin", 200),
])
def test_valid_transitions(client, regular_user, sub_admin_user, admin_user, category, from_status, to_status, actor_role, expected_code):
    h_user = auth_headers(client, "user_test@lab.local", "user123")
    h_sub = auth_headers(client, "sub_admin_test@lab.local", "sub123")
    h_admin = auth_headers(client, "admin_test@lab.local", "admin123")

    tid = setup_ticket_at_status(client, h_user, h_sub, h_admin, category.id, sub_admin_user.id, from_status)

    headers = h_admin if actor_role == "admin" else (h_sub if actor_role == "sub_admin" else h_user)

    if to_status == "APPROVED":
        r = client.post(f"/api/tickets/{tid}/approve", json={"note": "approving the ticket"}, headers=headers)
    elif to_status == "REJECTED":
        r = client.post(f"/api/tickets/{tid}/reject", json={"note": "rejecting the ticket"}, headers=headers)
    else:
        r = client.put(f"/api/tickets/{tid}/status", json={"status": to_status, "note": "valid transition note"}, headers=headers)

    assert r.status_code == expected_code, f"Expected {expected_code}, got {r.status_code}: {r.text}"


def test_invalid_transition_returns_400(client, regular_user, sub_admin_user, admin_user, category):
    h_user = auth_headers(client, "user_test@lab.local", "user123")
    h_sub = auth_headers(client, "sub_admin_test@lab.local", "sub123")
    h_admin = auth_headers(client, "admin_test@lab.local", "admin123")

    # Create ticket (OPEN) and try to jump to FULFILLED directly
    r = create_ticket_via_api(client, h_user, category.id)
    tid = r.json()["id"]

    r2 = client.put(f"/api/tickets/{tid}/status", json={"status": "FULFILLED", "note": "skipping states bad"}, headers=h_sub)
    assert r2.status_code == 400


def test_status_change_requires_note(client, regular_user, sub_admin_user, admin_user, category):
    h_user = auth_headers(client, "user_test@lab.local", "user123")
    h_sub = auth_headers(client, "sub_admin_test@lab.local", "sub123")
    h_admin = auth_headers(client, "admin_test@lab.local", "admin123")

    tid = setup_ticket_at_status(client, h_user, h_sub, h_admin, category.id, sub_admin_user.id, "OPEN")

    # Empty note should fail validation
    r = client.put(f"/api/tickets/{tid}/status", json={"status": "ASSIGNED", "note": ""}, headers=h_sub)
    assert r.status_code == 422

    # Short note (< 5 chars)
    r2 = client.put(f"/api/tickets/{tid}/status", json={"status": "ASSIGNED", "note": "hi"}, headers=h_sub)
    assert r2.status_code == 422


def test_fulfilled_to_closed_by_creator(client, regular_user, sub_admin_user, admin_user, category):
    h_user = auth_headers(client, "user_test@lab.local", "user123")
    h_sub = auth_headers(client, "sub_admin_test@lab.local", "sub123")
    h_admin = auth_headers(client, "admin_test@lab.local", "admin123")

    tid = setup_ticket_at_status(client, h_user, h_sub, h_admin, category.id, sub_admin_user.id, "FULFILLED")

    r = client.put(f"/api/tickets/{tid}/status", json={"status": "CLOSED", "note": "ticket resolved thank you"}, headers=h_user)
    assert r.status_code == 200
    assert r.json()["status"] == "CLOSED"


def test_fulfilled_to_closed_by_non_creator_non_admin_blocked(client, regular_user, regular_user2, sub_admin_user, admin_user, category):
    h_user = auth_headers(client, "user_test@lab.local", "user123")
    h_user2 = auth_headers(client, "user2_test@lab.local", "user123")
    h_sub = auth_headers(client, "sub_admin_test@lab.local", "sub123")
    h_admin = auth_headers(client, "admin_test@lab.local", "admin123")

    tid = setup_ticket_at_status(client, h_user, h_sub, h_admin, category.id, sub_admin_user.id, "FULFILLED")

    # user2 (not creator) tries to close
    r = client.put(f"/api/tickets/{tid}/status", json={"status": "CLOSED", "note": "closing this ticket now"}, headers=h_user2)
    assert r.status_code in (403, 400)


def test_awaiting_approval_to_approved_admin_only(client, regular_user, sub_admin_user, admin_user, category):
    h_user = auth_headers(client, "user_test@lab.local", "user123")
    h_sub = auth_headers(client, "sub_admin_test@lab.local", "sub123")
    h_admin = auth_headers(client, "admin_test@lab.local", "admin123")

    tid = setup_ticket_at_status(client, h_user, h_sub, h_admin, category.id, sub_admin_user.id, "AWAITING_APPROVAL")

    # Sub admin cannot approve
    r = client.post(f"/api/tickets/{tid}/approve", json={"note": "sub approves ticket"}, headers=h_sub)
    assert r.status_code == 403

    # Admin can approve
    r2 = client.post(f"/api/tickets/{tid}/approve", json={"note": "admin approves ticket"}, headers=h_admin)
    assert r2.status_code == 200
    assert r2.json()["approval_status"] == "Approved"
