from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.user import User, UserStatus
from app.core.security import verify_password, create_access_token, hash_password


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def login_user(db: Session, email: str, password: str) -> dict:
    user = authenticate_user(db, email, password)
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    if user.status == UserStatus.PENDING:
        raise HTTPException(status_code=403, detail="pending_approval")
    if user.status == UserStatus.INACTIVE:
        raise HTTPException(status_code=403, detail="account_inactive")
    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer"}
