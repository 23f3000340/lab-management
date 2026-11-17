from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, Role, UserStatus
from app.models.category import Category
from app.core.security import hash_password
from app.core.permissions import get_current_user, require_admin
from app.schemas.user import UserOut, UserCreate, UserUpdate, UserApprove, UserReject

router = APIRouter()


@router.get("", response_model=List[UserOut])
def list_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")
    return db.query(User).all()


@router.post("", response_model=UserOut, status_code=201)
def create_user(
    body: UserCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        name=body.name,
        email=body.email,
        hashed_password=hash_password(body.password),
        role=body.role,
        status=UserStatus.ACTIVE,
    )
    if body.category_ids:
        cats = db.query(Category).filter(Category.id.in_(body.category_ids)).all()
        user.categories = cats
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/pending", response_model=List[UserOut])
def list_pending(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return db.query(User).filter(User.status == UserStatus.PENDING).all()


@router.put("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    body: UserUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if body.name is not None:
        user.name = body.name
    if body.role is not None:
        user.role = body.role
    if body.status is not None:
        user.status = body.status
    if body.category_ids is not None:
        cats = db.query(Category).filter(Category.id.in_(body.category_ids)).all()
        user.categories = cats
    db.commit()
    db.refresh(user)
    return user


@router.post("/{user_id}/approve", response_model=UserOut)
def approve_user(
    user_id: int,
    body: UserApprove,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.status != UserStatus.PENDING:
        raise HTTPException(status_code=400, detail="User is not pending")

    user.status = UserStatus.ACTIVE
    if body.role:
        user.role = body.role
    elif user.requested_role:
        try:
            user.role = Role(user.requested_role)
        except ValueError:
            user.role = Role.USER

    if body.category_ids:
        cats = db.query(Category).filter(Category.id.in_(body.category_ids)).all()
        user.categories = cats

    user.rejection_reason = None
    db.commit()
    db.refresh(user)
    return user


@router.post("/{user_id}/reject", response_model=UserOut)
def reject_user(
    user_id: int,
    body: UserReject,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.status = UserStatus.INACTIVE
    user.rejection_reason = body.reason
    db.commit()
    db.refresh(user)
    return user
