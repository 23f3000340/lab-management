from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.ticket import Ticket, TicketStatus
from app.models.activity_log import ActivityLog, LogAction
from app.models.user import User, Role
from app.models.tag import Tag, TAG_COLORS
from app.models.category import Category
from app.core.transitions import validate_transition, get_waiting_on
from app.services.notification_service import notify


def _add_log(
    db: Session,
    ticket_id: int,
    actor_id: int,
    action: LogAction,
    note: str,
    old_value: Optional[str] = None,
    new_value: Optional[str] = None,
) -> ActivityLog:
    log = ActivityLog(
        ticket_id=ticket_id,
        actor_id=actor_id,
        action=action,
        note=note,
        old_value=old_value,
        new_value=new_value,
    )
    db.add(log)
    return log


def create_ticket(
    db: Session,
    actor: User,
    title: str,
    description: str,
    category_id: int,
    priority,
    tag_ids: List[int],
    due_date,
    note: str,
) -> Ticket:
    category = db.get(Category, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    tags = db.query(Tag).filter(Tag.id.in_(tag_ids)).all() if tag_ids else []

    ticket = Ticket(
        title=title,
        description=description,
        category_id=category_id,
        priority=priority,
        status=TicketStatus.OPEN,
        created_by=actor.id,
        waiting_on="SUB_ADMIN",
    )

    if due_date:
        ticket.due_date = due_date
    if tags:
        ticket.tags = tags

    # Auto-assign if category has default sub_admin
    if category.default_sub_admin_id:
        ticket.assigned_to = category.default_sub_admin_id
        ticket.status = TicketStatus.ASSIGNED

    db.add(ticket)
    db.flush()  # get ticket.id

    _add_log(db, ticket.id, actor.id, LogAction.created, note, new_value=TicketStatus.OPEN.value)

    if category.default_sub_admin_id:
        _add_log(
            db, ticket.id, actor.id, LogAction.assigned, "Auto-assigned to default sub-admin",
            new_value=str(category.default_sub_admin_id),
        )

    db.commit()
    db.refresh(ticket)
    return ticket


def update_ticket_status(
    db: Session,
    ticket: Ticket,
    actor: User,
    new_status: TicketStatus,
    note: str,
) -> Ticket:
    old_status = ticket.status
    validate_transition(old_status, new_status, actor, ticket.created_by)

    old_val = old_status.value
    ticket.status = new_status
    ticket.waiting_on = get_waiting_on(new_status)

    if new_status in (TicketStatus.FULFILLED, TicketStatus.CLOSED, TicketStatus.REJECTED):
        ticket.resolved_at = datetime.now(timezone.utc)

    _add_log(db, ticket.id, actor.id, LogAction.status_changed, note, old_value=old_val, new_value=new_status.value)
    db.commit()
    db.refresh(ticket)
    notify("status_changed", ticket.id, actor.id, note)
    return ticket


def assign_ticket(
    db: Session,
    ticket: Ticket,
    actor: User,
    assignee_id: int,
    note: str,
) -> Ticket:
    assignee = db.get(User, assignee_id)
    if not assignee:
        raise HTTPException(status_code=404, detail="Assignee not found")

    old_assignee = ticket.assigned_to
    action = LogAction.reassigned if old_assignee else LogAction.assigned
    ticket.assigned_to = assignee_id

    if ticket.status == TicketStatus.OPEN:
        ticket.status = TicketStatus.ASSIGNED
        ticket.waiting_on = "SUB_ADMIN"

    _add_log(
        db, ticket.id, actor.id, action, note or f"Assigned to {assignee.name}",
        old_value=str(old_assignee) if old_assignee else None,
        new_value=str(assignee_id),
    )
    db.commit()
    db.refresh(ticket)
    notify("assigned", ticket.id, actor.id, note)
    return ticket


def update_ticket_tags(
    db: Session,
    ticket: Ticket,
    actor: User,
    tag_ids: List[int],
) -> Ticket:
    old_tag_ids = {t.id for t in ticket.tags}
    new_tag_ids = set(tag_ids)

    added_ids = new_tag_ids - old_tag_ids
    removed_ids = old_tag_ids - new_tag_ids

    new_tags = db.query(Tag).filter(Tag.id.in_(new_tag_ids)).all() if new_tag_ids else []
    ticket.tags = new_tags

    for tid in added_ids:
        _add_log(db, ticket.id, actor.id, LogAction.tag_added, f"Tag {tid} added", new_value=str(tid))
    for tid in removed_ids:
        _add_log(db, ticket.id, actor.id, LogAction.tag_removed, f"Tag {tid} removed", old_value=str(tid))

    db.commit()
    db.refresh(ticket)
    return ticket


def request_approval(
    db: Session,
    ticket: Ticket,
    actor: User,
    note: str,
) -> Ticket:
    if ticket.status != TicketStatus.IN_PROGRESS:
        raise HTTPException(status_code=400, detail="Ticket must be IN_PROGRESS to request approval")
    ticket.status = TicketStatus.AWAITING_APPROVAL
    ticket.requires_admin_approval = True
    ticket.approval_status = "Pending"
    ticket.waiting_on = "ADMIN"
    _add_log(db, ticket.id, actor.id, LogAction.approval_requested, note, new_value="Pending")
    db.commit()
    db.refresh(ticket)
    notify("approval_requested", ticket.id, actor.id, note)
    return ticket


def approve_ticket(
    db: Session,
    ticket: Ticket,
    actor: User,
    note: str,
    fulfill_directly: bool = False,
) -> Ticket:
    if ticket.status != TicketStatus.AWAITING_APPROVAL:
        raise HTTPException(status_code=400, detail="Ticket is not awaiting approval")

    if fulfill_directly:
        ticket.status = TicketStatus.FULFILLED
        ticket.approval_status = "Approved"
        ticket.waiting_on = None
        ticket.resolved_at = datetime.now(timezone.utc)
        _add_log(db, ticket.id, actor.id, LogAction.approved, f"[Approved & Fulfilled directly] {note}", old_value="Pending", new_value="Fulfilled")
        db.commit()
        db.refresh(ticket)
        notify("approved_and_fulfilled", ticket.id, actor.id, note)
        return ticket

    ticket.status = TicketStatus.APPROVED
    ticket.approval_status = "Approved"
    ticket.waiting_on = "SUB_ADMIN"
    _add_log(db, ticket.id, actor.id, LogAction.approved, note, old_value="Pending", new_value="Approved")
    db.commit()
    db.refresh(ticket)
    notify("approved", ticket.id, actor.id, note)
    return ticket


def reject_ticket(
    db: Session,
    ticket: Ticket,
    actor: User,
    note: str,
) -> Ticket:
    if ticket.status != TicketStatus.AWAITING_APPROVAL:
        raise HTTPException(status_code=400, detail="Ticket is not awaiting approval")
    ticket.status = TicketStatus.REJECTED
    ticket.approval_status = "Rejected"
    ticket.waiting_on = None
    ticket.resolved_at = datetime.now(timezone.utc)
    _add_log(db, ticket.id, actor.id, LogAction.rejected, note, old_value="Pending", new_value="Rejected")
    db.commit()
    db.refresh(ticket)
    notify("rejected", ticket.id, actor.id, note)
    return ticket
