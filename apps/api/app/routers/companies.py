from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select
from ..db import get_session
from ..models import Company, CompanyTraining, User
from ..auth import get_current_user, is_super_admin, check_company_access
import secrets

router = APIRouter(prefix="/companies", tags=["companies"])


class CompanyIn(BaseModel):
    name: str
    business_topic: str | None = None
    description: str | None = None
    address: str | None = None
    phone: str | None = None
    email: str | None = None
    website: str | None = None


class CompanyTrainingIn(BaseModel):
    training_id: str
    expectations: str | None = None


@router.get("")
def list_companies(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if is_super_admin(current_user):
        # Süper admin tüm firmaları görebilir
        return session.exec(select(Company)).all()
    else:
        # Admin kullanıcılar sadece kendi firmalarını görebilir
        if not current_user.company_id:
            return []
        company = session.get(Company, current_user.company_id)
        return [company] if company else []


@router.get("/{company_id}")
def get_company(
    company_id: str, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Yetki kontrolü
    if not check_company_access(current_user, company_id):
        raise HTTPException(403, "Access denied")
    
    company = session.get(Company, company_id)
    if not company:
        raise HTTPException(404, "Company not found")
    return company


@router.post("")
def create_company(
    body: CompanyIn, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Sadece süper admin firma oluşturabilir
    if not is_super_admin(current_user):
        raise HTTPException(403, "Only super admins can create companies")
    
    company = Company(**body.model_dump())
    session.add(company)
    session.commit()
    session.refresh(company)
    return company


@router.put("/{company_id}")
def update_company(
    company_id: str, 
    body: CompanyIn, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Yetki kontrolü
    if not check_company_access(current_user, company_id):
        raise HTTPException(403, "Access denied")
    
    company = session.get(Company, company_id)
    if not company:
        raise HTTPException(404, "Company not found")
    
    for k, v in body.model_dump().items():
        setattr(company, k, v)
    
    session.add(company)
    session.commit()
    session.refresh(company)
    return company


@router.delete("/{company_id}")
def delete_company(
    company_id: str, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Sadece süper admin firma silebilir
    if not is_super_admin(current_user):
        raise HTTPException(403, "Only super admins can delete companies")
    
    company = session.get(Company, company_id)
    if not company:
        raise HTTPException(404, "Company not found")
    
    session.delete(company)
    session.commit()
    return {"ok": True}


@router.post("/{company_id}/trainings")
def attach_training(
    company_id: str, 
    body: CompanyTrainingIn, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Yetki kontrolü
    if not check_company_access(current_user, company_id):
        raise HTTPException(403, "Access denied")
    
    access_code = secrets.token_urlsafe(8)
    ct = CompanyTraining(
        company_id=company_id,
        training_id=body.training_id,
        expectations=body.expectations,
        access_code=access_code,
    )
    session.add(ct)
    session.commit()
    session.refresh(ct)
    return ct


@router.get("/{company_id}/trainings")
def list_company_trainings(
    company_id: str, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Yetki kontrolü
    if not check_company_access(current_user, company_id):
        raise HTTPException(403, "Access denied")
    
    return session.exec(select(CompanyTraining).where(CompanyTraining.company_id == company_id)).all()


@router.put("/{company_id}/trainings/{training_id}")
def update_company_training(
    company_id: str, 
    training_id: str, 
    body: CompanyTrainingIn, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Yetki kontrolü
    if not check_company_access(current_user, company_id):
        raise HTTPException(403, "Access denied")
    
    ct = session.exec(select(CompanyTraining).where(
        CompanyTraining.company_id == company_id,
        CompanyTraining.id == training_id
    )).first()
    if not ct:
        raise HTTPException(404, "Company training not found")
    
    ct.training_id = body.training_id
    ct.expectations = body.expectations
    session.add(ct)
    session.commit()
    session.refresh(ct)
    return ct


@router.delete("/{company_id}/trainings/{training_id}")
def delete_company_training(
    company_id: str, 
    training_id: str, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Yetki kontrolü
    if not check_company_access(current_user, company_id):
        raise HTTPException(403, "Access denied")
    
    ct = session.exec(select(CompanyTraining).where(
        CompanyTraining.company_id == company_id,
        CompanyTraining.id == training_id
    )).first()
    if not ct:
        raise HTTPException(404, "Company training not found")
    
    session.delete(ct)
    session.commit()
    return {"ok": True}
