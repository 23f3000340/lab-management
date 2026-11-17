from typing import Optional, Set, Tuple
from fastapi import HTTPException
from app.models.ticket import TicketStatus
from app.models.user import Role, User

# (from_status, to_status) -> set of roles allowed
VALID_TRANSITIONS: dict[Tuple[TicketStatus, TicketStatus], Set[Role]] = {
    (TicketStatus.OPEN, TicketStatus.ASSIGNED): {Role.SUB_ADMIN, Role.ADMIN},
    (TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS): {Role.SUB_ADMIN, Role.ADMIN},
    (TicketStatus.IN_PROGRESS, TicketStatus.NEEDS_INFO): {Role.SUB_ADMIN, Role.ADMIN},
    (TicketStatus.IN_PROGRESS, TicketStatus.AWAITING_APPROVAL): {Role.SUB_ADMIN, Role.ADMIN},
    (TicketStatus.IN_PROGRESS, TicketStatus.FULFILLED): {Role.SUB_ADMIN, Role.ADMIN},
    (TicketStatus.NEEDS_INFO, TicketStatus.IN_PROGRESS): {Role.USER, Role.SUB_ADMIN, Role.ADMIN},
    (TicketStatus.AWAITING_APPROVAL, TicketStatus.APPROVED): {Role.ADMIN},
    (TicketStatus.AWAITING_APPROVAL, TicketStatus.REJECTED): {Role.ADMIN},
    (TicketStatus.AWAITING_APPROVAL, TicketStatus.FULFILLED): {Role.ADMIN},
    (TicketStatus.APPROVED, TicketStatus.FULFILLED): {Role.SUB_ADMIN, Role.ADMIN},
    (TicketStatus.FULFILLED, TicketStatus.CLOSED): {Role.USER, Role.ADMIN},
    # Any -> CLOSED (admin only) handled specially
    # CLOSED -> OPEN (admin only, re-open)
    (TicketStatus.CLOSED, TicketStatus.OPEN): {Role.ADMIN},
}

# Admin can close any ticket
ADMIN_CAN_CLOSE_ANY = True


def validate_transition(
    from_status: TicketStatus,
    to_status: TicketStatus,
    actor: User,
    ticket_creator_id: int,
) -> None:
    """
    Validate a status transition. Raises HTTP 400 on invalid transition,
    HTTP 403 on insufficient role.
    """
    # Admin can close any ticket regardless of current status
    if to_status == TicketStatus.CLOSED and actor.role == Role.ADMIN:
        return

    key = (from_status, to_status)
    allowed_roles = VALID_TRANSITIONS.get(key)

    if allowed_roles is None:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid transition: {from_status.value} -> {to_status.value}",
        )

    # Special case: NEEDS_INFO -> IN_PROGRESS allows user only if they are creator
    if key == (TicketStatus.NEEDS_INFO, TicketStatus.IN_PROGRESS):
        if actor.role == Role.USER:
            if actor.id != ticket_creator_id:
                raise HTTPException(
                    status_code=403,
                    detail="Only the ticket creator can respond to info requests",
                )
            return
        # sub_admin and admin allowed freely
        if actor.role not in allowed_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions for this transition")
        return

    # Special case: FULFILLED -> CLOSED allows user only if they are creator
    if key == (TicketStatus.FULFILLED, TicketStatus.CLOSED):
        if actor.role == Role.USER:
            if actor.id != ticket_creator_id:
                raise HTTPException(
                    status_code=403,
                    detail="Only the ticket creator or admin can close a fulfilled ticket",
                )
            return
        if actor.role not in allowed_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions for this transition")
        return

    if actor.role not in allowed_roles:
        raise HTTPException(
            status_code=403,
            detail=f"Role {actor.role.value} cannot perform transition {from_status.value} -> {to_status.value}",
        )


def get_waiting_on(status: TicketStatus) -> Optional[str]:
    mapping = {
        TicketStatus.OPEN: "SUB_ADMIN",
        TicketStatus.ASSIGNED: "SUB_ADMIN",
        TicketStatus.IN_PROGRESS: "SUB_ADMIN",
        TicketStatus.APPROVED: "SUB_ADMIN",
        TicketStatus.FULFILLED: None,
        TicketStatus.NEEDS_INFO: "USER",
        TicketStatus.AWAITING_APPROVAL: "ADMIN",
        TicketStatus.CLOSED: None,
        TicketStatus.REJECTED: None,
    }
    return mapping.get(status)
