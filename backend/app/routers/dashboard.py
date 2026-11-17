from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.ticket import Ticket, TicketStatus
from app.models.user import User, Role
from app.models.category import Category
from app.models.tag import Tag, ticket_tags
from app.core.permissions import get_current_user
from app.config import settings
from app.schemas.ticket import TicketOut

router = APIRouter()


def _base_ticket_query(db: Session, user: User):
    q = db.query(Ticket)
    if user.role == Role.USER:
        q = q.filter(Ticket.created_by == user.id)
    elif user.role == Role.SUB_ADMIN:
        cat_ids = [c.id for c in user.categories]
        q = q.filter(Ticket.category_id.in_(cat_ids))
    return q


@router.get("/summary")
def dashboard_summary(
    stuck_days: int = Query(settings.STUCK_TICKET_DAYS),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    base = _base_ticket_query(db, current_user)
    open_count = base.filter(Ticket.status == TicketStatus.OPEN).count()
    awaiting = base.filter(Ticket.status == TicketStatus.AWAITING_APPROVAL).count()

    cutoff = datetime.now(timezone.utc) - timedelta(days=stuck_days)
    # Stuck: not closed/rejected, updated_at < cutoff
    active_statuses = [
        TicketStatus.OPEN, TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS,
        TicketStatus.NEEDS_INFO, TicketStatus.AWAITING_APPROVAL, TicketStatus.APPROVED
    ]
    stuck = base.filter(
        Ticket.status.in_(active_statuses),
        Ticket.updated_at < cutoff,
    ).count()

    overdue = base.filter(
        Ticket.due_date < datetime.now(timezone.utc).date(),
        Ticket.status.notin_([TicketStatus.CLOSED, TicketStatus.REJECTED, TicketStatus.FULFILLED]),
    ).count()

    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    resolved_this_week = base.filter(
        Ticket.resolved_at >= week_ago,
        Ticket.status.in_([TicketStatus.CLOSED, TicketStatus.FULFILLED, TicketStatus.REJECTED]),
    ).count()

    pending_onboarding = 0
    if current_user.role == Role.ADMIN:
        from app.models.user import UserStatus
        pending_onboarding = db.query(User).filter(User.status == UserStatus.PENDING).count()

    return {
        "open": open_count,
        "awaiting_my_approval": awaiting,
        "stuck": stuck,
        "overdue": overdue,
        "resolved_this_week": resolved_this_week,
        "pending_onboarding": pending_onboarding,
    }


@router.get("/charts")
def dashboard_charts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    base = _base_ticket_query(db, current_user)

    # By status
    by_status_rows = base.with_entities(Ticket.status, func.count(Ticket.id)).group_by(Ticket.status).all()
    by_status = [{"status": r[0].value, "count": r[1]} for r in by_status_rows]

    # By category
    by_cat_rows = (
        base.join(Category, Ticket.category_id == Category.id)
        .with_entities(Category.name, func.count(Ticket.id))
        .group_by(Category.name)
        .all()
    )
    by_category = [{"category": r[0], "count": r[1]} for r in by_cat_rows]

    # By tag
    tag_counts = (
        db.query(Tag.name, func.count(ticket_tags.c.ticket_id))
        .join(ticket_tags, Tag.id == ticket_tags.c.tag_id)
        .group_by(Tag.name)
        .all()
    )
    by_tag = [{"tag": r[0], "count": r[1]} for r in tag_counts]

    # Workload per sub_admin
    sub_admins = db.query(User).filter(User.role == Role.SUB_ADMIN).all()
    workload = []
    for sa in sub_admins:
        assigned_count = db.query(Ticket).filter(
            Ticket.assigned_to == sa.id,
            Ticket.status == TicketStatus.ASSIGNED,
        ).count()
        in_progress_count = db.query(Ticket).filter(
            Ticket.assigned_to == sa.id,
            Ticket.status == TicketStatus.IN_PROGRESS,
        ).count()
        workload.append({
            "name": sa.name,
            "assigned_count": assigned_count,
            "in_progress_count": in_progress_count,
        })

    return {
        "by_status": by_status,
        "by_category": by_category,
        "by_tag": by_tag,
        "workload_per_sub_admin": workload,
    }


@router.get("/stuck", response_model=List[TicketOut])
def stuck_tickets(
    stuck_days: int = Query(settings.STUCK_TICKET_DAYS),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    base = _base_ticket_query(db, current_user)
    cutoff = datetime.now(timezone.utc) - timedelta(days=stuck_days)
    active_statuses = [
        TicketStatus.OPEN, TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS,
        TicketStatus.NEEDS_INFO, TicketStatus.AWAITING_APPROVAL, TicketStatus.APPROVED
    ]
    return base.filter(
        Ticket.status.in_(active_statuses),
        Ticket.updated_at < cutoff,
    ).all()
