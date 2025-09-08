from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlmodel import Session, select
from ..db import get_session
from ..models import User
from ..auth import verify_password, create_access_token, verify_token, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/login")
def login(body: LoginRequest, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == body.email)).first()
    if not user or not user.password:
        raise HTTPException(401, "Invalid credentials")
    if not verify_password(body.password, user.password):
        raise HTTPException(401, "Invalid credentials")
    token = create_access_token(user.id)
    user_dict = user.dict()
    user_dict.pop("password", None)
    return {"access_token": token, "token_type": "bearer", "user": user_dict}


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    d = current_user.dict()
    d.pop("password", None)
    return d
