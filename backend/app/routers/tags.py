from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, select
from app.database import get_db
from app.models.tag import Tag, TAG_COLORS, ticket_tags
from app.models.user import User, Role
from app.core.permissions import get_current_user, require_admin
from app.schemas.tag import TagCreate, TagOut, TagUpdate, TagMerge

router = APIRouter()


@router.get("", response_model=List[TagOut])
def list_tags(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    tags = db.query(Tag).all()
    result = []
    for tag in tags:
        count = db.execute(
            select(func.count()).where(ticket_tags.c.tag_id == tag.id)
        ).scalar()
        t = TagOut.model_validate(tag)
        t.usage_count = count
        result.append(t)
    return result


@router.post("", response_model=TagOut, status_code=201)
def create_tag(
    body: TagCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing = db.query(Tag).filter(Tag.name == body.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Tag already exists")
    # Count existing tags to determine color index
    count = db.query(func.count(Tag.id)).scalar() or 0
    color = TAG_COLORS[count % len(TAG_COLORS)]
    tag = Tag(name=body.name, color=color)
    db.add(tag)
    db.commit()
    db.refresh(tag)
    result = TagOut.model_validate(tag)
    result.usage_count = 0
    return result


@router.put("/{tag_id}", response_model=TagOut)
def update_tag(
    tag_id: int,
    body: TagUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    tag = db.get(Tag, tag_id)
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    tag.name = body.name
    db.commit()
    db.refresh(tag)
    result = TagOut.model_validate(tag)
    result.usage_count = 0
    return result


@router.delete("/{tag_id}", status_code=204)
def delete_tag(
    tag_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    tag = db.get(Tag, tag_id)
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    # Remove from all tickets
    tag.tickets = []
    db.delete(tag)
    db.commit()


@router.post("/merge", response_model=TagOut)
def merge_tags(
    body: TagMerge,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    source = db.get(Tag, body.source_id)
    target = db.get(Tag, body.target_id)
    if not source or not target:
        raise HTTPException(status_code=404, detail="Tag not found")

    # Move all ticket associations from source to target
    for ticket in list(source.tickets):
        if target not in ticket.tags:
            ticket.tags.append(target)
        ticket.tags.remove(source)

    db.delete(source)
    db.commit()
    db.refresh(target)
    result = TagOut.model_validate(target)
    result.usage_count = len(target.tickets)
    return result
