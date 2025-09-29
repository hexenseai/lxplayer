from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, and_
from typing import List, Optional
from datetime import datetime

from app.db import get_session
from app.auth import get_current_user
from app.models import User, EvaluationCriteria, Training, TrainingSection, Company
from app.schemas import (
    EvaluationCriteriaCreate, 
    EvaluationCriteriaUpdate, 
    EvaluationCriteriaResponse
)

router = APIRouter(prefix="/evaluation-criteria", tags=["evaluation-criteria"])


@router.get("/", response_model=List[EvaluationCriteriaResponse])
def get_evaluation_criteria(
    training_id: Optional[str] = None,
    section_id: Optional[str] = None,
    is_active: Optional[bool] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Değerlendirme kriterlerini listele"""
    query = select(EvaluationCriteria)
    
    # Kullanıcı yetkisi kontrolü
    if current_user.role not in ["SuperAdmin", "Admin"]:
        # Kullanıcı sadece kendi şirketinin kriterlerini görebilir
        query = query.where(EvaluationCriteria.company_id == current_user.company_id)
    
    # Filtreleme
    if training_id:
        query = query.where(EvaluationCriteria.training_id == training_id)
    
    if section_id:
        query = query.where(EvaluationCriteria.section_id == section_id)
    
    if is_active is not None:
        query = query.where(EvaluationCriteria.is_active == is_active)
    
    # Sıralama
    query = query.order_by(EvaluationCriteria.order_index, EvaluationCriteria.created_at)
    
    criteria = session.exec(query).all()
    return criteria


@router.get("/{criteria_id}", response_model=EvaluationCriteriaResponse)
def get_evaluation_criteria_by_id(
    criteria_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Belirli bir değerlendirme kriterini getir"""
    criteria = session.get(EvaluationCriteria, criteria_id)
    if not criteria:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Değerlendirme kriteri bulunamadı"
        )
    
    # Yetki kontrolü
    if current_user.role not in ["SuperAdmin", "Admin"]:
        if criteria.company_id != current_user.company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bu değerlendirme kriterine erişim yetkiniz yok"
            )
    
    return criteria


@router.post("/", response_model=EvaluationCriteriaResponse)
def create_evaluation_criteria(
    criteria_data: EvaluationCriteriaCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Yeni değerlendirme kriteri oluştur"""
    # Sadece Admin ve SuperAdmin kriter oluşturabilir
    if current_user.role not in ["SuperAdmin", "Admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Değerlendirme kriteri oluşturma yetkiniz yok"
        )
    
    # Eğitimin varlığını kontrol et
    training = session.get(Training, criteria_data.training_id)
    if not training:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Belirtilen eğitim bulunamadı"
        )
    
    # Bölüm kontrolü (eğer belirtilmişse)
    if criteria_data.section_id:
        section = session.get(TrainingSection, criteria_data.section_id)
        if not section:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Belirtilen bölüm bulunamadı"
            )
        if section.training_id != criteria_data.training_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bölüm belirtilen eğitime ait değil"
            )
    
    # Kriter oluştur
    criteria = EvaluationCriteria(
        **criteria_data.model_dump(),
        created_by=current_user.id,
        company_id=current_user.company_id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    session.add(criteria)
    session.commit()
    session.refresh(criteria)
    
    return criteria


@router.put("/{criteria_id}", response_model=EvaluationCriteriaResponse)
def update_evaluation_criteria(
    criteria_id: str,
    criteria_data: EvaluationCriteriaUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Değerlendirme kriterini güncelle"""
    # Sadece Admin ve SuperAdmin güncelleyebilir
    if current_user.role not in ["SuperAdmin", "Admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Değerlendirme kriteri güncelleme yetkiniz yok"
        )
    
    criteria = session.get(EvaluationCriteria, criteria_id)
    if not criteria:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Değerlendirme kriteri bulunamadı"
        )
    
    # Yetki kontrolü
    if current_user.role not in ["SuperAdmin"] and criteria.company_id != current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu değerlendirme kriterini güncelleme yetkiniz yok"
        )
    
    # Bölüm kontrolü (eğer değiştiriliyorsa)
    if criteria_data.section_id is not None:
        if criteria_data.section_id:
            section = session.get(TrainingSection, criteria_data.section_id)
            if not section:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Belirtilen bölüm bulunamadı"
                )
            if section.training_id != criteria.training_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Bölüm belirtilen eğitime ait değil"
                )
    
    # Güncelleme
    update_data = criteria_data.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()
    
    for field, value in update_data.items():
        setattr(criteria, field, value)
    
    session.add(criteria)
    session.commit()
    session.refresh(criteria)
    
    return criteria


@router.delete("/{criteria_id}")
def delete_evaluation_criteria(
    criteria_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Değerlendirme kriterini sil"""
    # Sadece Admin ve SuperAdmin silebilir
    if current_user.role not in ["SuperAdmin", "Admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Değerlendirme kriteri silme yetkiniz yok"
        )
    
    criteria = session.get(EvaluationCriteria, criteria_id)
    if not criteria:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Değerlendirme kriteri bulunamadı"
        )
    
    # Yetki kontrolü
    if current_user.role not in ["SuperAdmin"] and criteria.company_id != current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu değerlendirme kriterini silme yetkiniz yok"
        )
    
    session.delete(criteria)
    session.commit()
    
    return {"message": "Değerlendirme kriteri başarıyla silindi"}


@router.post("/{criteria_id}/duplicate", response_model=EvaluationCriteriaResponse)
def duplicate_evaluation_criteria(
    criteria_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Değerlendirme kriterini kopyala"""
    # Sadece Admin ve SuperAdmin kopyalayabilir
    if current_user.role not in ["SuperAdmin", "Admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Değerlendirme kriteri kopyalama yetkiniz yok"
        )
    
    original_criteria = session.get(EvaluationCriteria, criteria_id)
    if not original_criteria:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Değerlendirme kriteri bulunamadı"
        )
    
    # Yetki kontrolü
    if current_user.role not in ["SuperAdmin"] and original_criteria.company_id != current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu değerlendirme kriterini kopyalama yetkiniz yok"
        )
    
    # Kopya oluştur
    duplicate_data = original_criteria.model_dump(exclude={"id", "created_at", "updated_at"})
    duplicate_data["title"] = f"{original_criteria.title} (Kopya)"
    duplicate_data["created_by"] = current_user.id
    duplicate_data["company_id"] = current_user.company_id
    duplicate_data["created_at"] = datetime.utcnow()
    duplicate_data["updated_at"] = datetime.utcnow()
    
    duplicate_criteria = EvaluationCriteria(**duplicate_data)
    
    session.add(duplicate_criteria)
    session.commit()
    session.refresh(duplicate_criteria)
    
    return duplicate_criteria


@router.get("/training/{training_id}/sections/", response_model=List[dict])
def get_training_sections_for_criteria(
    training_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Bir eğitimin bölümlerini değerlendirme kriteri oluşturma için listele"""
    # Eğitimin varlığını kontrol et
    training = session.get(Training, training_id)
    if not training:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Eğitim bulunamadı"
        )
    
    # Yetki kontrolü
    if current_user.role not in ["SuperAdmin"] and training.company_id != current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu eğitimin bölümlerine erişim yetkiniz yok"
        )
    
    # Bölümleri getir
    sections = session.exec(
        select(TrainingSection)
        .where(TrainingSection.training_id == training_id)
        .order_by(TrainingSection.order_index)
    ).all()
    
    return [
        {
            "id": section.id,
            "title": section.title,
            "description": section.description,
            "order_index": section.order_index,
            "type": section.type
        }
        for section in sections
    ]
