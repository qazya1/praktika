from collections.abc import Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Staff, User
from app.security import decode_token

bearer = HTTPBearer(auto_error=True)


def current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    payload = decode_token(credentials.credentials)
    if payload.get("kind") != "client":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Client token required")
    user = db.get(User, int(payload["sub"]))
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def current_staff(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
) -> Staff:
    payload = decode_token(credentials.credentials)
    if payload.get("kind") != "staff":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Staff token required")
    staff = db.get(Staff, int(payload["sub"]))
    if staff is None:
        raise HTTPException(status_code=401, detail="Staff not found")
    return staff


def require_roles(*roles: str) -> Callable:
    def dependency(staff: Staff = Depends(current_staff)) -> Staff:
        if staff.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient role")
        return staff

    return dependency
