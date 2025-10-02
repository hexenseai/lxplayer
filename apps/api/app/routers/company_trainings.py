from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select
from ..db import get_session
from ..models import CompanyTraining, Training, Company, User
from ..auth import get_current_user, is_super_admin
import uuid

router = APIRouter(prefix="/company-trainings", tags=["company-trainings"])

print("Company trainings router loaded!")

@router.get("/test")
def test_endpoint():
    """Test endpoint to verify router is working"""
    return {"message": "Company trainings router is working!"}


@router.get("/list-endpoints")
def list_endpoints():
    """List all available endpoints in this router"""
    endpoints = []
    for route in router.routes:
        if hasattr(route, 'methods') and hasattr(route, 'path'):
            endpoints.append({
                "path": route.path,
                "methods": list(route.methods),
                "name": getattr(route, 'name', 'unnamed')
            })
    return {"endpoints": endpoints}




class CompanyTrainingIn(BaseModel):
    company_id: str
    training_id: str
    expectations: str | None = None


@router.get("")
def list_company_trainings(
    company_id: str | None = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """CompanyTraining'leri listele - SuperAdmin tümünü, Admin sadece kendi şirketini görebilir"""
    
    print(f"🔍 Company trainings requested by: {current_user.email}")
    print(f"🔍 Company ID filter: {company_id}")
    print(f"🔍 Is SuperAdmin: {is_super_admin(current_user)}")
    print(f"🔍 User company ID: {current_user.company_id}")
    
    # Build query
    query = select(CompanyTraining)
    
    # Apply company filter based on user role
    if not is_super_admin(current_user):
        if not current_user.company_id:
            print("❌ User has no company ID")
            return []
        query = query.where(CompanyTraining.company_id == current_user.company_id)
    elif company_id:
        query = query.where(CompanyTraining.company_id == company_id)
    
    company_trainings = session.exec(query).all()
    print(f"📊 Found {len(company_trainings)} company trainings")
    
    # Training ve Company bilgilerini de ekle
    result = []
    for ct in company_trainings:
        training = session.get(Training, ct.training_id)
        company = session.get(Company, ct.company_id)
        
        result.append({
            "id": ct.id,
            "company_id": ct.company_id,
            "training_id": ct.training_id,
            "expectations": ct.expectations,
            "access_code": ct.access_code,
            "training": {
                "id": training.id,
                "title": training.title,
                "description": training.description
            } if training else None,
            "company": {
                "id": company.id,
                "name": company.name,
                "description": company.description
            } if company else None
        })
    
    return result


@router.get("/{company_training_id}")
def get_company_training(company_training_id: str, session: Session = Depends(get_session)):
    """Belirli bir CompanyTraining'i getir"""
    company_training = session.get(CompanyTraining, company_training_id)
    if not company_training:
        raise HTTPException(404, "Company training not found")
    
    training = session.get(Training, company_training.training_id)
    company = session.get(Company, company_training.company_id)
    
    return {
        "id": company_training.id,
        "company_id": company_training.company_id,
        "training_id": company_training.training_id,
        "expectations": company_training.expectations,
        "access_code": company_training.access_code,
        "training": {
            "id": training.id,
            "title": training.title,
            "description": training.description
        } if training else None,
        "company": {
            "id": company.id,
            "name": company.name,
            "description": company.description
        } if company else None
    }


@router.post("", operation_id="assign_training_to_company")
def assign_training_to_company(
    company_training: CompanyTrainingIn,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Firmaya eğitim ata - Sadece SuperAdmin yapabilir"""
    
    # Sadece SuperAdmin eğitim atayabilir
    if not is_super_admin(current_user):
        raise HTTPException(403, "Only SuperAdmin can assign trainings to companies")
    
    # Training ve Company'nin var olduğunu kontrol et
    training = session.get(Training, company_training.training_id)
    if not training:
        raise HTTPException(404, "Training not found")
    
    company = session.get(Company, company_training.company_id)
    if not company:
        raise HTTPException(404, "Company not found")
    
    # Aynı eğitim daha önce bu firmaya atanmış mı kontrol et
    existing = session.exec(
        select(CompanyTraining).where(
            CompanyTraining.company_id == company_training.company_id,
            CompanyTraining.training_id == company_training.training_id
        )
    ).first()
    
    if existing:
        raise HTTPException(400, "This training is already assigned to this company")
    
    # Benzersiz access_code oluştur
    access_code = str(uuid.uuid4())[:8].upper()
    
    # CompanyTraining oluştur
    ct = CompanyTraining(
        company_id=company_training.company_id,
        training_id=company_training.training_id,
        expectations=company_training.expectations,
        access_code=access_code
    )
    
    session.add(ct)
    session.commit()
    session.refresh(ct)
    
    return {
        "id": ct.id,
        "company_id": ct.company_id,
        "training_id": ct.training_id,
        "expectations": ct.expectations,
        "access_code": ct.access_code,
        "training": {
            "id": training.id,
            "title": training.title,
            "description": training.description
        },
        "company": {
            "id": company.id,
            "name": company.name,
            "description": company.description
        }
    }


@router.delete("/{company_training_id}", operation_id="remove_training_from_company")
def remove_training_from_company(
    company_training_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Firmadan eğitim atamasını kaldır - Sadece SuperAdmin yapabilir"""
    
    # Sadece SuperAdmin eğitim atamasını kaldırabilir
    if not is_super_admin(current_user):
        raise HTTPException(403, "Only SuperAdmin can remove training assignments")
    
    # CompanyTraining'i bul
    company_training = session.get(CompanyTraining, company_training_id)
    if not company_training:
        raise HTTPException(404, "Company training assignment not found")
    
    session.delete(company_training)
    session.commit()
    
    return {"message": "Training assignment removed successfully"}


@router.get("/available-trainings", operation_id="list_available_trainings_for_assignment")
def list_available_trainings_for_assignment(
    company_id: str | None = None
):
    """Atanabilir eğitimleri listele - SuperAdmin için (simplified)"""
    
    print(f"🔍 Available trainings endpoint called!")
    print(f"🔍 Company ID filter: {company_id}")
    
    try:
        # Basit response döndür
        return [
            {
                "id": "test-training-1",
                "title": "Test Training 1",
                "description": "Test training for debugging",
                "assigned": False
            },
            {
                "id": "test-training-2", 
                "title": "Test Training 2",
                "description": "Another test training",
                "assigned": False
            }
        ]
        
    except Exception as e:
        print(f"❌ Error in available-trainings endpoint: {str(e)}")
        raise HTTPException(500, f"Internal server error: {str(e)}")


@router.get("/available-trainings-alt", operation_id="list_available_trainings_alt")
def list_available_trainings_alt():
    """Alternative available trainings endpoint"""
    print("🔍 Alternative available trainings endpoint called!")
    return {"message": "Alternative endpoint working!", "trainings": []}


