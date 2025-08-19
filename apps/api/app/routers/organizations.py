from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select
from ..db import get_session
from ..models import Organization, CompanyTraining
import secrets

router = APIRouter(prefix="/organizations", tags=["organizations"])


class OrganizationIn(BaseModel):
    name: str
    business_topic: str | None = None


class CompanyTrainingIn(BaseModel):
    training_id: str
    expectations: str | None = None


@router.get("")
def list_orgs(session: Session = Depends(get_session)):
    return session.exec(select(Organization)).all()


@router.get("/{org_id}")
def get_org(org_id: str, session: Session = Depends(get_session)):
    org = session.get(Organization, org_id)
    if not org:
        raise HTTPException(404, "Organization not found")
    return org


@router.post("")
def create_org(body: OrganizationIn, session: Session = Depends(get_session)):
    org = Organization(**body.model_dump())
    session.add(org)
    session.commit()
    session.refresh(org)
    return org


@router.put("/{org_id}")
def update_org(org_id: str, body: OrganizationIn, session: Session = Depends(get_session)):
    org = session.get(Organization, org_id)
    if not org:
        raise HTTPException(404, "Organization not found")
    for k, v in body.model_dump().items():
        setattr(org, k, v)
    session.add(org)
    session.commit()
    session.refresh(org)
    return org


@router.delete("/{org_id}")
def delete_org(org_id: str, session: Session = Depends(get_session)):
    org = session.get(Organization, org_id)
    if not org:
        raise HTTPException(404, "Organization not found")
    session.delete(org)
    session.commit()
    return {"ok": True}


@router.post("/{org_id}/trainings")
def attach_training(org_id: str, body: CompanyTrainingIn, session: Session = Depends(get_session)):
    access_code = secrets.token_urlsafe(8)
    ct = CompanyTraining(
        organization_id=org_id,
        training_id=body.training_id,
        expectations=body.expectations,
        access_code=access_code,
    )
    session.add(ct)
    session.commit()
    session.refresh(ct)
    return ct


@router.get("/{org_id}/trainings")
def list_company_trainings(org_id: str, session: Session = Depends(get_session)):
    return session.exec(select(CompanyTraining).where(CompanyTraining.organization_id == org_id)).all()


@router.put("/{org_id}/trainings/{training_id}")
def update_company_training(org_id: str, training_id: str, body: CompanyTrainingIn, session: Session = Depends(get_session)):
    ct = session.exec(select(CompanyTraining).where(
        CompanyTraining.organization_id == org_id,
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


@router.delete("/{org_id}/trainings/{training_id}")
def delete_company_training(org_id: str, training_id: str, session: Session = Depends(get_session)):
    ct = session.exec(select(CompanyTraining).where(
        CompanyTraining.organization_id == org_id,
        CompanyTraining.id == training_id
    )).first()
    if not ct:
        raise HTTPException(404, "Company training not found")
    
    session.delete(ct)
    session.commit()
    return {"ok": True}
