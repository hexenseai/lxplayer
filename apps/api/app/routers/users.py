from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select
from sqlalchemy.exc import IntegrityError
from ..db import get_session
from ..models import User
from ..auth import hash_password

router = APIRouter(prefix="/users", tags=["users"])


class UserIn(BaseModel):
    email: str
    username: str | None = None
    full_name: str | None = None
    organization_id: str | None = None
    role: str | None = None
    department: str | None = None
    password: str | None = None
    gpt_prefs: str | None = None


def redact(u: User) -> dict:
    d = u.dict()
    d.pop("password", None)
    return d


@router.get("")
def list_users(session: Session = Depends(get_session)):
    users = session.exec(select(User)).all()
    return [redact(u) for u in users]


@router.get("/{user_id}")
def get_user(user_id: str, session: Session = Depends(get_session)):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    return redact(user)


@router.post("")
def create_user(body: UserIn, session: Session = Depends(get_session)):
    data = body.model_dump()
    if data.get("password"):
        data["password"] = hash_password(data["password"])  # type: ignore[index]
    user = User(**data)
    session.add(user)
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise HTTPException(409, "Email already exists")
    session.refresh(user)
    return redact(user)


@router.put("/{user_id}")
def update_user(user_id: str, body: UserIn, session: Session = Depends(get_session)):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    data = body.model_dump()
    for k, v in data.items():
        if v is None:
            continue
        if k == "password":
            if v == "":
                continue
            setattr(user, k, hash_password(v))
        else:
            setattr(user, k, v)
    session.add(user)
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise HTTPException(409, "Email already exists")
    session.refresh(user)
    return redact(user)


@router.delete("/{user_id}")
def delete_user(user_id: str, session: Session = Depends(get_session)):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    session.delete(user)
    session.commit()
    return {"ok": True}
