from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from ..db import get_session
from ..models import CompanyTraining, Training, Organization

router = APIRouter(prefix="/company-trainings", tags=["company-trainings"])


@router.get("")
def list_company_trainings(session: Session = Depends(get_session)):
    """Tüm CompanyTraining'leri listele"""
    company_trainings = session.exec(select(CompanyTraining)).all()
    
    # Training ve Organization bilgilerini de ekle
    result = []
    for ct in company_trainings:
        training = session.get(Training, ct.training_id)
        organization = session.get(Organization, ct.organization_id)
        
        result.append({
            "id": ct.id,
            "organization_id": ct.organization_id,
            "training_id": ct.training_id,
            "expectations": ct.expectations,
            "access_code": ct.access_code,
            "training": {
                "id": training.id,
                "title": training.title,
                "description": training.description
            } if training else None,
            "organization": {
                "id": organization.id,
                "name": organization.name,
                "business_topic": organization.business_topic
            } if organization else None
        })
    
    return result


@router.get("/{company_training_id}")
def get_company_training(company_training_id: str, session: Session = Depends(get_session)):
    """Belirli bir CompanyTraining'i getir"""
    company_training = session.get(CompanyTraining, company_training_id)
    if not company_training:
        raise HTTPException(404, "Company training not found")
    
    training = session.get(Training, company_training.training_id)
    organization = session.get(Organization, company_training.organization_id)
    
    return {
        "id": company_training.id,
        "organization_id": company_training.organization_id,
        "training_id": company_training.training_id,
        "expectations": company_training.expectations,
        "access_code": company_training.access_code,
        "training": {
            "id": training.id,
            "title": training.title,
            "description": training.description
        } if training else None,
        "organization": {
            "id": organization.id,
            "name": organization.name,
            "business_topic": organization.business_topic
        } if organization else None
    }
