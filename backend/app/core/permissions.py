from typing import Optional, List
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.security import decode_token
from app.models.user import User, Role, UserStatus

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_token(token)
    user_id: Optional[int] = payload.get("sub")
    if user_id is None:
        raise credentials_exception
    user = db.get(User, int(user_id))
    if user is None:
        raise credentials_exception
    if user.status == UserStatus.INACTIVE:
        raise HTTPException(status_code=403, detail="account_inactive")
    if user.status == UserStatus.PENDING:
        raise HTTPException(status_code=403, detail="pending_approval")
    return user


def require_role(*roles: Role):
    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return current_user
    return dependency


require_admin = require_role(Role.ADMIN)
require_admin_or_sub_admin = require_role(Role.ADMIN, Role.SUB_ADMIN)
