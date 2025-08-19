from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlmodel import Session, select
from ..db import get_session
from ..models import User
from ..auth import verify_password, create_access_token, verify_token

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
def me(authorization: str | None = Header(default=None), session: Session = Depends(get_session)):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Missing token")
    token = authorization.split(" ", 1)[1]
    payload = verify_token(token)
    if not payload or not payload.get("sub"):
        raise HTTPException(401, "Invalid token")
    user = session.get(User, payload["sub"])
    if not user:
        raise HTTPException(401, "Invalid token")
    d = user.dict()
    d.pop("password", None)
    return d
