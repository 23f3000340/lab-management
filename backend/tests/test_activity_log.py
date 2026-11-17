import pytest
from tests.conftest import auth_headers, create_ticket_via_api


def test_log_created_on_ticket_creation(client, regular_user, admin_user, category):
    h_user = auth_headers(client, "user_test@lab.local", "user123")
    r = create_ticket_via_api(client, h_user, category.id, note="Creating this ticket now")
    assert r.status_code == 201
    ticket = r.json()
    logs = ticket["activity_logs"]
    assert len(logs) >= 1
    assert logs[0]["action"] == "created"
    assert logs[0]["actor_id"] == regular_user.id


def test_log_created_on_status_change(client, regular_user, sub_admin_user, admin_user, category):
    h_user = auth_headers(client, "user_test@lab.local", "user123")
    h_sub = auth_headers(client, "sub_admin_test@lab.local", "sub123")
    h_admin = auth_headers(client, "admin_test@lab.local", "admin123")

    r = create_ticket_via_api(client, h_user, category.id)
    tid = r.json()["id"]

    # Admin assigns
    client.put(f"/api/tickets/{tid}/assign", json={"assignee_id": sub_admin_user.id, "note": "assigning now"}, headers=h_admin)

    # Sub_admin changes to IN_PROGRESS
    note = "Starting work on this ticket"
    r2 = client.put(f"/api/tickets/{tid}/status", json={"status": "IN_PROGRESS", "note": note}, headers=h_sub)
    assert r2.status_code == 200

    ticket = r2.json()
    logs = ticket["activity_logs"]
    status_logs = [l for l in logs if l["action"] == "status_changed"]
    assert len(status_logs) >= 1

    last_status_log = status_logs[-1]
    assert last_status_log["old_value"] == "ASSIGNED"
    assert last_status_log["new_value"] == "IN_PROGRESS"
    assert note in last_status_log["note"]


def test_log_created_on_assignment(client, regular_user, sub_admin_user, admin_user, category):
    h_user = auth_headers(client, "user_test@lab.local", "user123")
    h_admin = auth_headers(client, "admin_test@lab.local", "admin123")

    r = create_ticket_via_api(client, h_user, category.id)
    tid = r.json()["id"]

    r2 = client.put(f"/api/tickets/{tid}/assign", json={"assignee_id": sub_admin_user.id, "note": "assigning this ticket"}, headers=h_admin)
    assert r2.status_code == 200

    ticket = r2.json()
    logs = ticket["activity_logs"]
    assign_logs = [l for l in logs if l["action"] in ("assigned", "reassigned")]
    assert len(assign_logs) >= 1
    assert assign_logs[-1]["new_value"] == str(sub_admin_user.id)


def test_no_log_update_endpoint_exists(client, regular_user, admin_user):
    h_admin = auth_headers(client, "admin_test@lab.local", "admin123")
    r = client.put("/api/activity_log/1", json={"note": "trying to edit log"}, headers=h_admin)
    assert r.status_code in (404, 405)


def test_no_log_delete_endpoint_exists(client, regular_user, admin_user):
    h_admin = auth_headers(client, "admin_test@lab.local", "admin123")
    r = client.delete("/api/activity_log/1", headers=h_admin)
    assert r.status_code in (404, 405)


def test_log_count_increases_on_each_action(client, regular_user, sub_admin_user, admin_user, category):
    h_user = auth_headers(client, "user_test@lab.local", "user123")
    h_sub = auth_headers(client, "sub_admin_test@lab.local", "sub123")
    h_admin = auth_headers(client, "admin_test@lab.local", "admin123")

    r = create_ticket_via_api(client, h_user, category.id)
    assert r.status_code == 201
    tid = r.json()["id"]
    initial_logs = len(r.json()["activity_logs"])
    assert initial_logs == 1  # created log

    # Assign
    client.put(f"/api/tickets/{tid}/assign", json={"assignee_id": sub_admin_user.id, "note": "assigning now"}, headers=h_admin)
    r2 = client.get(f"/api/tickets/{tid}", headers=h_admin)
    assert len(r2.json()["activity_logs"]) == initial_logs + 1

    # Status change
    client.put(f"/api/tickets/{tid}/status", json={"status": "IN_PROGRESS", "note": "starting now"}, headers=h_sub)
    r3 = client.get(f"/api/tickets/{tid}", headers=h_admin)
    assert len(r3.json()["activity_logs"]) == initial_logs + 2

    # Comment
    client.post(f"/api/tickets/{tid}/comment", json={"note": "Adding a comment here"}, headers=h_user)
    r4 = client.get(f"/api/tickets/{tid}", headers=h_admin)
    assert len(r4.json()["activity_logs"]) == initial_logs + 3
