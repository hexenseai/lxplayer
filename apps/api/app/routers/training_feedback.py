from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, and_
from typing import List, Optional
from datetime import datetime

from app.db import get_session
from app.auth import get_current_user
from app.models import User, TrainingFeedback, InteractionSession, Training
from app.schemas import TrainingFeedbackCreate, TrainingFeedbackResponse

router = APIRouter(prefix="/training-feedback", tags=["training-feedback"])


@router.get("/", response_model=List[TrainingFeedbackResponse])
def get_training_feedback(
    session_id: Optional[str] = None,
    user_id: Optional[str] = None,
    training_id: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Eğitim feedback'lerini listele"""
    query = select(TrainingFeedback)
    
    # Kullanıcı yetkisi kontrolü
    if current_user.role not in ["SuperAdmin", "Admin"]:
        # Kullanıcı sadece kendi feedback'lerini görebilir
        query = query.where(TrainingFeedback.user_id == current_user.id)
    
    # Filtreleme
    if session_id:
        query = query.where(TrainingFeedback.session_id == session_id)
    
    if user_id:
        # Admin/SuperAdmin başka kullanıcıların feedback'lerini görebilir
        if current_user.role in ["SuperAdmin", "Admin"]:
            query = query.where(TrainingFeedback.user_id == user_id)
        else:
            # Normal kullanıcı sadece kendi feedback'lerini görebilir
            query = query.where(TrainingFeedback.user_id == current_user.id)
    
    if training_id:
        query = query.where(TrainingFeedback.training_id == training_id)
    
    # Sıralama
    query = query.order_by(TrainingFeedback.created_at.desc())
    
    feedbacks = session.exec(query).all()
    return feedbacks


@router.get("/{feedback_id}", response_model=TrainingFeedbackResponse)
def get_training_feedback_by_id(
    feedback_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """ID'ye göre feedback getir"""
    feedback = session.get(TrainingFeedback, feedback_id)
    if not feedback:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feedback bulunamadı"
        )
    
    # Kullanıcı yetkisi kontrolü
    if current_user.role not in ["SuperAdmin", "Admin"]:
        if feedback.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bu feedback'e erişim yetkiniz yok"
            )
    
    return feedback


@router.post("/", response_model=TrainingFeedbackResponse)
def create_training_feedback(
    feedback_data: TrainingFeedbackCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Yeni eğitim feedback'i oluştur"""
    
    # Oturumun varlığını kontrol et
    interaction_session = session.get(InteractionSession, feedback_data.session_id)
    if not interaction_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Belirtilen oturum bulunamadı"
        )
    
    # Eğitim uyumluluğunu kontrol et
    if interaction_session.training_id != feedback_data.training_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Oturum ve eğitim uyumsuz"
        )
    
    # Aynı oturum için daha önce feedback verilmiş mi kontrol et
    existing_feedback = session.exec(
        select(TrainingFeedback).where(
            and_(
                TrainingFeedback.session_id == feedback_data.session_id,
                TrainingFeedback.user_id == current_user.id
            )
        )
    ).first()
    
    if existing_feedback:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu oturum için zaten feedback verdiniz"
        )
    
    # Feedback oluştur
    feedback = TrainingFeedback(
        session_id=feedback_data.session_id,
        user_id=current_user.id,
        training_id=feedback_data.training_id,
        overall_rating=feedback_data.overall_rating,
        content_quality=feedback_data.content_quality,
        ease_of_understanding=feedback_data.ease_of_understanding,
        interactivity=feedback_data.interactivity,
        technical_quality=feedback_data.technical_quality,
        what_did_you_like=feedback_data.what_did_you_like,
        what_could_be_improved=feedback_data.what_could_be_improved,
        additional_comments=feedback_data.additional_comments,
        is_anonymous=feedback_data.is_anonymous,
        company_id=current_user.company_id,
        metadata_json=feedback_data.metadata_json
    )
    
    session.add(feedback)
    session.commit()
    session.refresh(feedback)
    
    return feedback


@router.get("/training/{training_id}/analytics")
def get_training_feedback_analytics(
    training_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Eğitim için feedback analitikleri"""
    # Kullanıcı yetkisi kontrolü
    if current_user.role not in ["SuperAdmin", "Admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Feedback analitikleri görme yetkiniz yok"
        )
    
    # Eğitimin varlığını kontrol et
    training = session.get(Training, training_id)
    if not training:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Eğitim bulunamadı"
        )
    
    # Bu eğitim için tüm feedback'leri getir
    feedbacks = session.exec(
        select(TrainingFeedback).where(TrainingFeedback.training_id == training_id)
    ).all()
    
    if not feedbacks:
        return {
            "training_id": training_id,
            "total_feedbacks": 0,
            "average_ratings": {},
            "feedback_summary": "Henüz feedback alınmamış"
        }
    
    # Ortalama puanları hesapla
    total_feedbacks = len(feedbacks)
    avg_overall = sum(f.overall_rating for f in feedbacks) / total_feedbacks
    avg_content = sum(f.content_quality for f in feedbacks) / total_feedbacks
    avg_understanding = sum(f.ease_of_understanding for f in feedbacks) / total_feedbacks
    avg_interactivity = sum(f.interactivity for f in feedbacks) / total_feedbacks
    avg_technical = sum(f.technical_quality for f in feedbacks) / total_feedbacks
    
    # Puan dağılımını hesapla
    rating_distribution = {}
    for i in range(1, 6):
        rating_distribution[i] = sum(1 for f in feedbacks if f.overall_rating == i)
    
    return {
        "training_id": training_id,
        "training_title": training.title,
        "total_feedbacks": total_feedbacks,
        "average_ratings": {
            "overall": round(avg_overall, 2),
            "content_quality": round(avg_content, 2),
            "ease_of_understanding": round(avg_understanding, 2),
            "interactivity": round(avg_interactivity, 2),
            "technical_quality": round(avg_technical, 2)
        },
        "rating_distribution": rating_distribution,
        "feedback_summary": f"{total_feedbacks} kullanıcıdan ortalama {round(avg_overall, 2)} puan alınmış"
    }


@router.get("/session/{session_id}/exists")
def check_feedback_exists(
    session_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Bu oturum için feedback verilip verilmediğini kontrol et"""
    
    # Oturumun varlığını kontrol et
    interaction_session = session.get(InteractionSession, session_id)
    if not interaction_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Oturum bulunamadı"
        )
    
    # Bu oturum için feedback var mı kontrol et
    existing_feedback = session.exec(
        select(TrainingFeedback).where(
            and_(
                TrainingFeedback.session_id == session_id,
                TrainingFeedback.user_id == current_user.id
            )
        )
    ).first()
    
    return {
        "session_id": session_id,
        "feedback_exists": existing_feedback is not None,
        "feedback_id": existing_feedback.id if existing_feedback else None
    }
