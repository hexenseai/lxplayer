from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select
from sqlalchemy.exc import IntegrityError
import uuid
from ..db import get_session
from ..models import User, CompanyTraining, Company
from ..auth import hash_password, get_current_user, is_super_admin, check_same_company, is_admin
from ..auth import check_company_access, can_manage_user

router = APIRouter(prefix="/users", tags=["users"])


class UserIn(BaseModel):
    email: str
    username: str | None = None
    full_name: str | None = None
    company_id: str | None = None
    role: str | None = None
    department: str | None = None
    password: str | None = None
    gpt_prefs: str | None = None


class UserUpdateIn(BaseModel):
    email: str | None = None
    username: str | None = None
    full_name: str | None = None
    company_id: str | None = None
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
def list_users(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if is_super_admin(current_user):
        # Süper admin tüm kullanıcıları görebilir
        users = session.exec(select(User)).all()
    elif is_admin(current_user):
        # Admin sadece kendi firmasındaki kullanıcıları görebilir
        if not current_user.company_id:
            raise HTTPException(400, "Admin user must be associated with a company")
        users = session.exec(
            select(User).where(User.company_id == current_user.company_id)
        ).all()
    else:
        # Normal kullanıcı sadece kendini görebilir
        users = [current_user]
    
    return [redact(u) for u in users]


@router.get("/{user_id}")
def get_user(
    user_id: str, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if user_id == current_user.id:
        # Kullanıcı kendini görebilir
        user = current_user
    else:
        user = session.get(User, user_id)
        if not user:
            raise HTTPException(404, "User not found")
        
        # Yetki kontrolü
        if not check_same_company(current_user, user):
            raise HTTPException(403, "Access denied")
    
    return redact(user)


@router.post("")
def create_user(
    body: UserIn, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Sadece admin ve süper admin kullanıcı ekleyebilir
    if not is_admin(current_user):
        raise HTTPException(403, "Only admins can create users")
    
    # Admin kullanıcı sadece kendi firmasına kullanıcı ekleyebilir
    if is_admin(current_user) and not is_super_admin(current_user):
        if body.company_id and body.company_id != current_user.company_id:
            raise HTTPException(403, "Admin can only create users in their own company")
        if not body.company_id:
            body.company_id = current_user.company_id
    # SuperAdmin herhangi bir firmaya kullanıcı ekleyebilir
    
    data = body.model_dump()
    print(f"Create user data: {data}")
    if data.get("password"):
        data["password"] = hash_password(data["password"])
    
    user = User(**data)
    session.add(user)
    try:
        session.commit()
        print(f"User created successfully: {user.email}")
    except IntegrityError as e:
        session.rollback()
        print(f"IntegrityError: {e}")
        if "foreign key constraint" in str(e):
            raise HTTPException(400, "Invalid company ID. Please select a valid company.")
        else:
            raise HTTPException(409, "Email already exists")
    session.refresh(user)
    return redact(user)


@router.put("/{user_id}")
def update_user(
    user_id: str, 
    body: UserUpdateIn, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    
    # Yetki kontrolü - SuperAdmin tüm kullanıcıları güncelleyebilir
    if not can_manage_user(current_user, user):
        raise HTTPException(403, "Access denied")
    
    # Admin kullanıcı sadece kendi firmasındaki kullanıcıları güncelleyebilir
    if is_admin(current_user) and not is_super_admin(current_user):
        if body.company_id and body.company_id != current_user.company_id:
            raise HTTPException(403, "Admin can only update users in their own company")
    
    data = body.model_dump()
    print(f"Update data received: {data}")
    for k, v in data.items():
        if v is None:
            print(f"Skipping {k} because it's None")
            continue
        if k == "password":
            if v == "":
                continue
            setattr(user, k, hash_password(v))
        elif k == "email":
            # Email adresi değiştirildiyse kontrol et
            if v != user.email:
                # Aynı email adresine sahip başka kullanıcı var mı kontrol et
                existing_user = session.exec(select(User).where(User.email == v, User.id != user.id)).first()
                if existing_user:
                    raise HTTPException(409, "Email already exists")
                setattr(user, k, v)
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
def delete_user(
    user_id: str, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if user_id == current_user.id:
        raise HTTPException(400, "Cannot delete yourself")
    
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    
    # Yetki kontrolü - SuperAdmin tüm kullanıcıları silebilir
    if not can_manage_user(current_user, user):
        raise HTTPException(403, "Access denied")
    
    # Sadece admin ve süper admin kullanıcı silebilir
    if not is_admin(current_user):
        raise HTTPException(403, "Only admins can delete users")
    
    session.delete(user)
    session.commit()
    return {"ok": True}


# User Training Endpoints
@router.post("/{user_id}/trainings")
def create_user_training(
    user_id: str, 
    body: UserTrainingIn, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    
    # Yetki kontrolü
    if not check_same_company(current_user, user):
        raise HTTPException(403, "Access denied")
    
    # Kullanıcının firmasını al
    if not user.company_id:
        raise HTTPException(400, "User must be associated with a company")
    
    # Access code oluştur
    access_code = str(uuid.uuid4())[:8].upper()
    
    # CompanyTraining oluştur
    company_training = CompanyTraining(
        company_id=user.company_id,
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
def list_user_trainings(
    user_id: str, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    
    # Yetki kontrolü
    if not check_same_company(current_user, user):
        raise HTTPException(403, "Access denied")
    
    # Kullanıcının firmasına ait eğitimleri al
    if not user.company_id:
        return []
    
    company_trainings = session.exec(
        select(CompanyTraining).where(CompanyTraining.company_id == user.company_id)
    ).all()
    
    return company_trainings


@router.put("/{user_id}/trainings/{training_id}")
def update_user_training(
    user_id: str, 
    training_id: str, 
    body: UserTrainingIn, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    
    # Yetki kontrolü
    if not check_same_company(current_user, user):
        raise HTTPException(403, "Access denied")
    
    company_training = session.get(CompanyTraining, training_id)
    if not company_training:
        raise HTTPException(404, "Company training not found")
    
    # Kullanıcının firmasına ait olduğunu kontrol et
    if company_training.company_id != user.company_id:
        raise HTTPException(403, "Access denied")
    
    company_training.training_id = body.training_id
    company_training.expectations = body.expectations
    
    session.add(company_training)
    session.commit()
    session.refresh(company_training)
    
    return company_training


@router.delete("/{user_id}/trainings/{training_id}")
def delete_user_training(
    user_id: str, 
    training_id: str, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    
    # Yetki kontrolü
    if not check_same_company(current_user, user):
        raise HTTPException(403, "Access denied")
    
    company_training = session.get(CompanyTraining, training_id)
    if not company_training:
        raise HTTPException(404, "Company training not found")
    
    # Kullanıcının firmasına ait olduğunu kontrol et
    if company_training.company_id != user.company_id:
        raise HTTPException(403, "Access denied")
    
    session.delete(company_training)
    session.commit()
    
    return {"ok": True}
