from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.messenger_auth import validate_messenger_user
from app.models import Staff, User
from app.schemas import MessengerLogin, StaffLogin, TokenResponse
from app.security import create_token, verify_password

router = APIRouter()


@router.post("/auth/messenger", response_model=TokenResponse)
def messenger_login(payload: MessengerLogin, db: Session = Depends(get_db)):
    identity = validate_messenger_user(payload.platform, payload.init_data)
    user = db.scalar(
        select(User).where(User.platform == payload.platform, User.external_id == identity.external_id)
    )
    if user is None:
        user = User(platform=payload.platform, external_id=identity.external_id, name=identity.name)
        db.add(user)
    else:
        user.name = identity.name
    db.commit()
    db.refresh(user)
    return TokenResponse(access_token=create_token(str(user.id), "client"), name=user.name)


@router.post("/staff/login", response_model=TokenResponse)
def staff_login(payload: StaffLogin, db: Session = Depends(get_db)):
    staff = db.scalar(select(Staff).where(Staff.username == payload.username))
    if staff is None or not verify_password(payload.password, staff.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return TokenResponse(
        access_token=create_token(str(staff.id), "staff", role=staff.role),
        role=staff.role,
        name=staff.name,
    )
