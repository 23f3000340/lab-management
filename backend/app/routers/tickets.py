from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_
from datetime import date, datetime
from app.database import get_db
from app.models.ticket import Ticket, TicketStatus
from app.models.user import User, Role
from app.models.tag import Tag
from app.models.activity_log import ActivityLog, LogAction
from app.core.permissions import get_current_user, require_admin_or_sub_admin, require_admin
from app.schemas.ticket import (
    TicketCreate, TicketOut, TicketStatusUpdate, TicketAssign,
    TicketTagsUpdate, TicketFieldsUpdate, CommentRequest, ApprovalNoteRequest
)
from app.services import ticket_service

router = APIRouter()


def _can_view_ticket(ticket: Ticket, user: User) -> bool:
    if user.role == Role.ADMIN:
        return True
    if user.role == Role.SUB_ADMIN:
        user_cat_ids = {c.id for c in user.categories}
        return ticket.category_id in user_cat_ids
    return ticket.created_by == user.id


@router.post("", response_model=TicketOut, status_code=201)
def create_ticket(
    body: TicketCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ticket = ticket_service.create_ticket(
        db=db,
        actor=current_user,
        title=body.title,
        description=body.description,
        category_id=body.category_id,
        priority=body.priority,
        tag_ids=body.tag_ids,
        due_date=body.due_date,
        note=body.note,
    )
    return ticket


@router.get("", response_model=List[TicketOut])
def list_tickets(
    status: Optional[TicketStatus] = Query(None),
    category_id: Optional[int] = Query(None),
    priority: Optional[str] = Query(None),
    tag_id: Optional[int] = Query(None),
    assignee_id: Optional[int] = Query(None),
    waiting_on: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    sort_by: Optional[str] = Query("created_at"),
    sort_dir: Optional[str] = Query("desc"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Ticket)

    # Role-based filtering
    if current_user.role == Role.USER:
        query = query.filter(Ticket.created_by == current_user.id)
    elif current_user.role == Role.SUB_ADMIN:
        cat_ids = [c.id for c in current_user.categories]
        query = query.filter(Ticket.category_id.in_(cat_ids))
    # ADMIN: no additional filter

    if status:
        query = query.filter(Ticket.status == status)
    if category_id:
        query = query.filter(Ticket.category_id == category_id)
    if priority:
        query = query.filter(Ticket.priority == priority)
    if assignee_id:
        query = query.filter(Ticket.assigned_to == assignee_id)
    if waiting_on:
        query = query.filter(Ticket.waiting_on == waiting_on)
    if search:
        query = query.filter(
            or_(Ticket.title.ilike(f"%{search}%"), Ticket.description.ilike(f"%{search}%"))
        )
    if date_from:
        query = query.filter(Ticket.created_at >= datetime.combine(date_from, datetime.min.time()))
    if date_to:
        query = query.filter(Ticket.created_at <= datetime.combine(date_to, datetime.max.time()))
    if tag_id:
        query = query.filter(Ticket.tags.any(Tag.id == tag_id))

    # Sorting
    sort_col = getattr(Ticket, sort_by, Ticket.created_at)
    if sort_dir == "asc":
        query = query.order_by(sort_col.asc())
    else:
        query = query.order_by(sort_col.desc())

    return query.all()


@router.get("/{ticket_id}", response_model=TicketOut)
def get_ticket(
    ticket_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ticket = (
        db.query(Ticket)
        .options(
            joinedload(Ticket.activity_logs).joinedload(ActivityLog.actor),
            joinedload(Ticket.creator),
            joinedload(Ticket.assignee),
            joinedload(Ticket.category),
            joinedload(Ticket.tags),
        )
        .filter(Ticket.id == ticket_id)
        .first()
    )
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if not _can_view_ticket(ticket, current_user):
        raise HTTPException(status_code=403, detail="Access denied")
    return ticket


@router.put("/{ticket_id}/status", response_model=TicketOut)
def update_status(
    ticket_id: int,
    body: TicketStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if not _can_view_ticket(ticket, current_user):
        raise HTTPException(status_code=403, detail="Access denied")
    return ticket_service.update_ticket_status(db, ticket, current_user, body.status, body.note)


@router.put("/{ticket_id}/assign", response_model=TicketOut)
def assign_ticket(
    ticket_id: int,
    body: TicketAssign,
    current_user: User = Depends(require_admin_or_sub_admin),
    db: Session = Depends(get_db),
):
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket_service.assign_ticket(db, ticket, current_user, body.assignee_id, body.note)


@router.put("/{ticket_id}/tags", response_model=TicketOut)
def update_tags(
    ticket_id: int,
    body: TicketTagsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    # Only creator, sub_admin (in category), or admin
    is_creator = ticket.created_by == current_user.id
    is_admin = current_user.role == Role.ADMIN
    is_sub_admin_in_cat = (
        current_user.role == Role.SUB_ADMIN
        and ticket.category_id in {c.id for c in current_user.categories}
    )
    if not (is_creator or is_admin or is_sub_admin_in_cat):
        raise HTTPException(status_code=403, detail="Not authorized to update tags")
    return ticket_service.update_ticket_tags(db, ticket, current_user, body.tag_ids)


@router.put("/{ticket_id}/fields", response_model=TicketOut)
def update_fields(
    ticket_id: int,
    body: TicketFieldsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    is_creator = ticket.created_by == current_user.id
    is_admin = current_user.role == Role.ADMIN
    if not (is_creator or is_admin):
        raise HTTPException(status_code=403, detail="Not authorized to update ticket fields")
    if body.title is not None:
        ticket.title = body.title
    if body.description is not None:
        ticket.description = body.description
    if body.priority is not None:
        ticket.priority = body.priority
    if body.due_date is not None:
        ticket.due_date = body.due_date
    db.commit()
    db.refresh(ticket)
    return ticket


@router.post("/{ticket_id}/comment", response_model=TicketOut)
def add_comment(
    ticket_id: int,
    body: CommentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if not _can_view_ticket(ticket, current_user):
        raise HTTPException(status_code=403, detail="Access denied")
    log = ActivityLog(
        ticket_id=ticket.id,
        actor_id=current_user.id,
        action=LogAction.commented,
        note=body.note,
    )
    db.add(log)
    db.commit()
    db.refresh(ticket)
    return ticket


@router.post("/{ticket_id}/request_approval", response_model=TicketOut)
def request_approval(
    ticket_id: int,
    body: ApprovalNoteRequest,
    current_user: User = Depends(require_admin_or_sub_admin),
    db: Session = Depends(get_db),
):
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket_service.request_approval(db, ticket, current_user, body.note)


@router.post("/{ticket_id}/approve", response_model=TicketOut)
def approve_ticket(
    ticket_id: int,
    body: ApprovalNoteRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket_service.approve_ticket(
        db, ticket, current_user, body.note, fulfill_directly=bool(body.fulfill_directly)
    )


@router.post("/{ticket_id}/reject", response_model=TicketOut)
def reject_ticket(
    ticket_id: int,
    body: ApprovalNoteRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket_service.reject_ticket(db, ticket, current_user, body.note)
