from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, and_
from typing import List, Optional
from datetime import datetime

from app.db import get_session
from app.auth import get_current_user
from app.models import User, EvaluationResult, EvaluationCriteria, InteractionSession, Training
from app.schemas import (
    EvaluationResultCreate, 
    EvaluationResultUpdate, 
    EvaluationResultResponse
)

router = APIRouter(prefix="/evaluation-results", tags=["evaluation-results"])


@router.get("/", response_model=List[EvaluationResultResponse])
def get_evaluation_results(
    session_id: Optional[str] = None,
    user_id: Optional[str] = None,
    training_id: Optional[str] = None,
    criteria_id: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Değerlendirme sonuçlarını listele"""
    query = select(EvaluationResult)
    
    # Kullanıcı yetkisi kontrolü
    if current_user.role not in ["SuperAdmin", "Admin"]:
        # Kullanıcı sadece kendi sonuçlarını görebilir
        query = query.where(EvaluationResult.user_id == current_user.id)
    
    # Filtreleme
    if session_id:
        query = query.where(EvaluationResult.session_id == session_id)
    
    if user_id:
        # Admin/SuperAdmin başka kullanıcıların sonuçlarını görebilir
        if current_user.role in ["SuperAdmin", "Admin"]:
            query = query.where(EvaluationResult.user_id == user_id)
        else:
            # Normal kullanıcı sadece kendi sonuçlarını görebilir
            query = query.where(EvaluationResult.user_id == current_user.id)
    
    if training_id:
        query = query.where(EvaluationResult.training_id == training_id)
    
    if criteria_id:
        query = query.where(EvaluationResult.criteria_id == criteria_id)
    
    # Sıralama
    query = query.order_by(EvaluationResult.evaluated_at.desc())
    
    results = session.exec(query).all()
    return results


@router.get("/{result_id}", response_model=EvaluationResultResponse)
def get_evaluation_result_by_id(
    result_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Belirli bir değerlendirme sonucunu getir"""
    result = session.get(EvaluationResult, result_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Değerlendirme sonucu bulunamadı"
        )
    
    # Yetki kontrolü
    if current_user.role not in ["SuperAdmin", "Admin"]:
        if result.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bu değerlendirme sonucuna erişim yetkiniz yok"
            )
    
    return result


@router.post("/", response_model=EvaluationResultResponse)
def create_evaluation_result(
    result_data: EvaluationResultCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Yeni değerlendirme sonucu oluştur"""
    # Sadece Admin ve SuperAdmin sonuç oluşturabilir (LLM tarafından)
    if current_user.role not in ["SuperAdmin", "Admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Değerlendirme sonucu oluşturma yetkiniz yok"
        )
    
    # Kriterin varlığını kontrol et
    criteria = session.get(EvaluationCriteria, result_data.criteria_id)
    if not criteria:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Belirtilen değerlendirme kriteri bulunamadı"
        )
    
    # Oturumun varlığını kontrol et
    interaction_session = session.get(InteractionSession, result_data.session_id)
    if not interaction_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Belirtilen oturum bulunamadı"
        )
    
    # Eğitim uyumluluğunu kontrol et
    if criteria.training_id != result_data.training_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kriter ve eğitim uyumsuz"
        )
    
    if interaction_session.training_id != result_data.training_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Oturum ve eğitim uyumsuz"
        )
    
    # Aynı kriter için daha önce değerlendirme yapılmış mı kontrol et
    existing_result = session.exec(
        select(EvaluationResult).where(
            and_(
                EvaluationResult.criteria_id == result_data.criteria_id,
                EvaluationResult.session_id == result_data.session_id
            )
        )
    ).first()
    
    if existing_result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu kriter için bu oturumda zaten değerlendirme yapılmış"
        )
    
    # Sonuç oluştur
    result = EvaluationResult(
        **result_data.model_dump(),
        evaluated_at=datetime.utcnow(),
        created_at=datetime.utcnow()
    )
    
    session.add(result)
    session.commit()
    session.refresh(result)
    
    return result


@router.put("/{result_id}", response_model=EvaluationResultResponse)
def update_evaluation_result(
    result_id: str,
    result_data: EvaluationResultUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Değerlendirme sonucunu güncelle"""
    # Sadece Admin ve SuperAdmin güncelleyebilir
    if current_user.role not in ["SuperAdmin", "Admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Değerlendirme sonucu güncelleme yetkiniz yok"
        )
    
    result = session.get(EvaluationResult, result_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Değerlendirme sonucu bulunamadı"
        )
    
    # Güncelleme (sadece belirli alanlar)
    update_data = result_data.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(result, field, value)
    
    session.add(result)
    session.commit()
    session.refresh(result)
    
    return result


@router.delete("/{result_id}")
def delete_evaluation_result(
    result_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Değerlendirme sonucunu sil"""
    # Sadece Admin ve SuperAdmin silebilir
    if current_user.role not in ["SuperAdmin", "Admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Değerlendirme sonucu silme yetkiniz yok"
        )
    
    result = session.get(EvaluationResult, result_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Değerlendirme sonucu bulunamadı"
        )
    
    session.delete(result)
    session.commit()
    
    return {"message": "Değerlendirme sonucu başarıyla silindi"}


@router.get("/session/{session_id}/summary", response_model=dict)
def get_session_evaluation_summary(
    session_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Bir oturumun değerlendirme özetini getir"""
    # Oturumun varlığını kontrol et
    interaction_session = session.get(InteractionSession, session_id)
    if not interaction_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Oturum bulunamadı"
        )
    
    # Yetki kontrolü
    if current_user.role not in ["SuperAdmin", "Admin"]:
        if interaction_session.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bu oturumun değerlendirme özetine erişim yetkiniz yok"
            )
    
    # Oturumun tüm değerlendirme sonuçlarını getir
    results = session.exec(
        select(EvaluationResult)
        .where(EvaluationResult.session_id == session_id)
        .order_by(EvaluationResult.evaluated_at)
    ).all()
    
    if not results:
        return {
            "session_id": session_id,
            "training_id": interaction_session.training_id,
            "user_id": interaction_session.user_id,
            "total_criteria": 0,
            "evaluated_criteria": 0,
            "average_score": None,
            "results": []
        }
    
    # İstatistikleri hesapla
    total_criteria = len(session.exec(
        select(EvaluationCriteria)
        .where(EvaluationCriteria.training_id == interaction_session.training_id)
        .where(EvaluationCriteria.is_active == True)
    ).all())
    
    evaluated_criteria = len(results)
    scores = [r.evaluation_score for r in results if r.evaluation_score is not None]
    average_score = sum(scores) / len(scores) if scores else None
    
    return {
        "session_id": session_id,
        "training_id": interaction_session.training_id,
        "user_id": interaction_session.user_id,
        "total_criteria": total_criteria,
        "evaluated_criteria": evaluated_criteria,
        "average_score": average_score,
        "results": [
            {
                "id": r.id,
                "criteria_id": r.criteria_id,
                "evaluation_score": r.evaluation_score,
                "evaluation_result": r.evaluation_result,
                "explanation": r.explanation,
                "evaluated_at": r.evaluated_at,
                "llm_model": r.llm_model
            }
            for r in results
        ]
    }


@router.post("/evaluate-session/{session_id}")
def evaluate_session_with_llm(
    session_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Bir oturumu LLM ile değerlendir (placeholder - gerçek LLM entegrasyonu gerekli)"""
    # Sadece Admin ve SuperAdmin değerlendirme başlatabilir
    if current_user.role not in ["SuperAdmin", "Admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="LLM değerlendirme başlatma yetkiniz yok"
        )
    
    # Oturumun varlığını kontrol et
    interaction_session = session.get(InteractionSession, session_id)
    if not interaction_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Oturum bulunamadı"
        )
    
    # Bu oturum için aktif kriterleri getir
    criteria = session.exec(
        select(EvaluationCriteria)
        .where(EvaluationCriteria.training_id == interaction_session.training_id)
        .where(EvaluationCriteria.is_active == True)
        .order_by(EvaluationCriteria.order_index)
    ).all()
    
    if not criteria:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu eğitim için değerlendirme kriteri bulunamadı"
        )
    
    # TODO: Burada gerçek LLM entegrasyonu yapılacak
    # Şimdilik placeholder döndürüyoruz
    return {
        "message": "LLM değerlendirmesi başlatıldı",
        "session_id": session_id,
        "training_id": interaction_session.training_id,
        "criteria_count": len(criteria),
        "status": "processing",
        "note": "Bu bir placeholder yanıttır. Gerçek LLM entegrasyonu geliştirilmelidir."
    }
