import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserStatus, Role
from app.core.security import hash_password
from app.core.permissions import get_current_user
from app.services.auth_service import login_user
from app.schemas.auth import SignupRequest, Token
from app.schemas.user import UserOut

router = APIRouter()


@router.post("/signup", response_model=UserOut, status_code=201)
def signup(body: SignupRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    requested_role = body.requested_role.upper() if body.requested_role else "USER"
    req_cats = json.dumps(body.requested_categories) if body.requested_categories else None

    user = User(
        name=body.name,
        email=body.email,
        hashed_password=hash_password(body.password),
        role=Role.USER,
        status=UserStatus.PENDING,
        requested_role=requested_role,
        requested_categories=req_cats,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=Token)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    return login_user(db, form.username, form.password)


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user
