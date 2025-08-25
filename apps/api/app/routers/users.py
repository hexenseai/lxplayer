from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select
from sqlalchemy.exc import IntegrityError
import uuid
from ..db import get_session
from ..models import User, CompanyTraining, Organization
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


class UserTrainingIn(BaseModel):
    training_id: str
    expectations: str | None = None


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


# User Training Endpoints
@router.post("/{user_id}/trainings")
def create_user_training(user_id: str, body: UserTrainingIn, session: Session = Depends(get_session)):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    
    # Kullanıcının organizasyonunu al
    if not user.organization_id:
        raise HTTPException(400, "User must be associated with an organization")
    
    # Access code oluştur
    access_code = str(uuid.uuid4())[:8].upper()
    
    # CompanyTraining oluştur
    company_training = CompanyTraining(
        organization_id=user.organization_id,
        training_id=body.training_id,
        expectations=body.expectations,
        access_code=access_code
    )
    
    session.add(company_training)
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise HTTPException(409, "Training already assigned to user's organization")
    
    session.refresh(company_training)
    return company_training


@router.get("/{user_id}/trainings")
def list_user_trainings(user_id: str, session: Session = Depends(get_session)):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    
    # Kullanıcının organizasyonuna ait eğitimleri al
    if not user.organization_id:
        return []
    
    company_trainings = session.exec(
        select(CompanyTraining).where(CompanyTraining.organization_id == user.organization_id)
    ).all()
    
    return company_trainings


@router.put("/{user_id}/trainings/{training_id}")
def update_user_training(user_id: str, training_id: str, body: UserTrainingIn, session: Session = Depends(get_session)):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    
    company_training = session.get(CompanyTraining, training_id)
    if not company_training:
        raise HTTPException(404, "Company training not found")
    
    # Kullanıcının organizasyonuna ait olduğunu kontrol et
    if company_training.organization_id != user.organization_id:
        raise HTTPException(403, "Access denied")
    
    company_training.training_id = body.training_id
    company_training.expectations = body.expectations
    
    session.add(company_training)
    session.commit()
    session.refresh(company_training)
    
    return company_training


@router.delete("/{user_id}/trainings/{training_id}")
def delete_user_training(user_id: str, training_id: str, session: Session = Depends(get_session)):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    
    company_training = session.get(CompanyTraining, training_id)
    if not company_training:
        raise HTTPException(404, "Company training not found")
    
    # Kullanıcının organizasyonuna ait olduğunu kontrol et
    if company_training.organization_id != user.organization_id:
        raise HTTPException(403, "Access denied")
    
    session.delete(company_training)
    session.commit()
    
    return {"ok": True}
