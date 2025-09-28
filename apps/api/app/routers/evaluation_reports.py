from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, and_
from typing import List, Optional
from datetime import datetime

from app.db import get_session
from app.auth import get_current_user
from app.models import User, EvaluationReport, InteractionSession, Training
from app.schemas import (
    EvaluationReportCreate, 
    EvaluationReportUpdate, 
    EvaluationReportResponse
)

router = APIRouter(prefix="/evaluation-reports", tags=["evaluation-reports"])


@router.get("/", response_model=List[EvaluationReportResponse])
def get_evaluation_reports(
    session_id: Optional[str] = None,
    user_id: Optional[str] = None,
    training_id: Optional[str] = None,
    status: Optional[str] = None,
    is_public: Optional[bool] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Değerlendirme raporlarını listele"""
    query = select(EvaluationReport)
    
    # Kullanıcı yetkisi kontrolü
    if current_user.role not in ["SuperAdmin", "Admin"]:
        # Kullanıcı sadece kendi raporlarını ve public raporları görebilir
        query = query.where(
            (EvaluationReport.user_id == current_user.id) | 
            (EvaluationReport.is_public == True)
        )
    
    # Filtreleme
    if session_id:
        query = query.where(EvaluationReport.session_id == session_id)
    
    if user_id:
        # Admin/SuperAdmin başka kullanıcıların raporlarını görebilir
        if current_user.role in ["SuperAdmin", "Admin"]:
            query = query.where(EvaluationReport.user_id == user_id)
        else:
            # Normal kullanıcı sadece kendi raporlarını görebilir
            query = query.where(EvaluationReport.user_id == current_user.id)
    
    if training_id:
        query = query.where(EvaluationReport.training_id == training_id)
    
    if status:
        query = query.where(EvaluationReport.status == status)
    
    if is_public is not None:
        query = query.where(EvaluationReport.is_public == is_public)
    
    # Sıralama
    query = query.order_by(EvaluationReport.generated_at.desc())
    
    reports = session.exec(query).all()
    return reports


@router.get("/{report_id}", response_model=EvaluationReportResponse)
def get_evaluation_report_by_id(
    report_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Belirli bir değerlendirme raporunu getir"""
    report = session.get(EvaluationReport, report_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Değerlendirme raporu bulunamadı"
        )
    
    # Yetki kontrolü
    if current_user.role not in ["SuperAdmin", "Admin"]:
        if report.user_id != current_user.id and not report.is_public:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bu değerlendirme raporuna erişim yetkiniz yok"
            )
    
    return report


@router.post("/", response_model=EvaluationReportResponse)
def create_evaluation_report(
    report_data: EvaluationReportCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Yeni değerlendirme raporu oluştur"""
    # Sadece Admin ve SuperAdmin rapor oluşturabilir
    if current_user.role not in ["SuperAdmin", "Admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Değerlendirme raporu oluşturma yetkiniz yok"
        )
    
    # Oturumun varlığını kontrol et
    interaction_session = session.get(InteractionSession, report_data.session_id)
    if not interaction_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Belirtilen oturum bulunamadı"
        )
    
    # Eğitim uyumluluğunu kontrol et
    if interaction_session.training_id != report_data.training_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Oturum ve eğitim uyumsuz"
        )
    
    if interaction_session.user_id != report_data.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Oturum ve kullanıcı uyumsuz"
        )
    
    # Aynı oturum için daha önce rapor oluşturulmuş mu kontrol et
    existing_report = session.exec(
        select(EvaluationReport).where(EvaluationReport.session_id == report_data.session_id)
    ).first()
    
    if existing_report:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu oturum için zaten bir rapor oluşturulmuş"
        )
    
    # Rapor oluştur
    report = EvaluationReport(
        **report_data.model_dump(),
        generated_at=datetime.utcnow(),
        generated_by=current_user.id,
        company_id=current_user.company_id
    )
    
    session.add(report)
    session.commit()
    session.refresh(report)
    
    return report


@router.put("/{report_id}", response_model=EvaluationReportResponse)
def update_evaluation_report(
    report_id: str,
    report_data: EvaluationReportUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Değerlendirme raporunu güncelle"""
    report = session.get(EvaluationReport, report_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Değerlendirme raporu bulunamadı"
        )
    
    # Yetki kontrolü
    if current_user.role not in ["SuperAdmin", "Admin"]:
        if report.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bu değerlendirme raporunu güncelleme yetkiniz yok"
            )
    
    # Güncelleme
    update_data = report_data.model_dump(exclude_unset=True)
    
    # Status değişikliklerinde timestamp güncelle
    if "status" in update_data:
        if update_data["status"] == "reviewed" and report.status != "reviewed":
            update_data["reviewed_at"] = datetime.utcnow()
            if not update_data.get("reviewed_by"):
                update_data["reviewed_by"] = current_user.id
        elif update_data["status"] == "finalized" and report.status != "finalized":
            update_data["finalized_at"] = datetime.utcnow()
    
    for field, value in update_data.items():
        setattr(report, field, value)
    
    session.add(report)
    session.commit()
    session.refresh(report)
    
    return report


@router.delete("/{report_id}")
def delete_evaluation_report(
    report_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Değerlendirme raporunu sil"""
    # Sadece Admin ve SuperAdmin silebilir
    if current_user.role not in ["SuperAdmin", "Admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Değerlendirme raporu silme yetkiniz yok"
        )
    
    report = session.get(EvaluationReport, report_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Değerlendirme raporu bulunamadı"
        )
    
    session.delete(report)
    session.commit()
    
    return {"message": "Değerlendirme raporu başarıyla silindi"}


@router.post("/{report_id}/generate", response_model=dict)
def generate_evaluation_report(
    report_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Değerlendirme raporunu LLM ile yeniden oluştur"""
    # Sadece Admin ve SuperAdmin rapor yeniden oluşturabilir
    if current_user.role not in ["SuperAdmin", "Admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Rapor yeniden oluşturma yetkiniz yok"
        )
    
    report = session.get(EvaluationReport, report_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Değerlendirme raporu bulunamadı"
        )
    
    # TODO: Burada gerçek LLM entegrasyonu yapılacak
    # Şimdilik placeholder döndürüyoruz
    return {
        "message": "Rapor yeniden oluşturma başlatıldı",
        "report_id": report_id,
        "session_id": report.session_id,
        "training_id": report.training_id,
        "status": "processing",
        "note": "Bu bir placeholder yanıttır. Gerçek LLM entegrasyonu geliştirilmelidir."
    }


@router.get("/training/{training_id}/analytics", response_model=dict)
def get_training_evaluation_analytics(
    training_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Bir eğitimin değerlendirme analitiğini getir"""
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
            detail="Bu eğitimin analitiklerine erişim yetkiniz yok"
        )
    
    # Bu eğitim için tüm raporları getir
    reports = session.exec(
        select(EvaluationReport)
        .where(EvaluationReport.training_id == training_id)
        .order_by(EvaluationReport.generated_at.desc())
    ).all()
    
    if not reports:
        return {
            "training_id": training_id,
            "total_reports": 0,
            "average_score": None,
            "score_distribution": {},
            "status_distribution": {},
            "recent_reports": []
        }
    
    # İstatistikleri hesapla
    total_reports = len(reports)
    scores = [r.overall_score for r in reports if r.overall_score is not None]
    average_score = sum(scores) / len(scores) if scores else None
    
    # Puan dağılımı
    score_distribution = {
        "0-20": len([s for s in scores if 0 <= s < 20]),
        "20-40": len([s for s in scores if 20 <= s < 40]),
        "40-60": len([s for s in scores if 40 <= s < 60]),
        "60-80": len([s for s in scores if 60 <= s < 80]),
        "80-100": len([s for s in scores if 80 <= s <= 100])
    }
    
    # Durum dağılımı
    status_distribution = {}
    for report in reports:
        status = report.status
        status_distribution[status] = status_distribution.get(status, 0) + 1
    
    # Son 5 rapor
    recent_reports = [
        {
            "id": r.id,
            "user_id": r.user_id,
            "overall_score": r.overall_score,
            "status": r.status,
            "generated_at": r.generated_at,
            "report_title": r.report_title
        }
        for r in reports[:5]
    ]
    
    return {
        "training_id": training_id,
        "total_reports": total_reports,
        "average_score": average_score,
        "score_distribution": score_distribution,
        "status_distribution": status_distribution,
        "recent_reports": recent_reports
    }


@router.post("/session/{session_id}/auto-generate", response_model=EvaluationReportResponse)
def auto_generate_evaluation_report(
    session_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Bir oturum için otomatik değerlendirme raporu oluştur"""
    # Sadece Admin ve SuperAdmin otomatik rapor oluşturabilir
    if current_user.role not in ["SuperAdmin", "Admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Otomatik rapor oluşturma yetkiniz yok"
        )
    
    # Oturumun varlığını kontrol et
    interaction_session = session.get(InteractionSession, session_id)
    if not interaction_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Oturum bulunamadı"
        )
    
    # Daha önce rapor oluşturulmuş mu kontrol et
    existing_report = session.exec(
        select(EvaluationReport).where(EvaluationReport.session_id == session_id)
    ).first()
    
    if existing_report:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu oturum için zaten bir rapor oluşturulmuş"
        )
    
    # TODO: Burada gerçek LLM entegrasyonu ile rapor oluşturulacak
    # Şimdilik placeholder rapor oluşturuyoruz
    
    report_data = EvaluationReportCreate(
        session_id=session_id,
        user_id=interaction_session.user_id,
        training_id=interaction_session.training_id,
        report_title=f"Otomatik Değerlendirme Raporu - {interaction_session.created_at.strftime('%Y-%m-%d')}",
        overall_score=75.0,  # Placeholder puan
        summary="Bu otomatik oluşturulan bir değerlendirme raporudur. Gerçek LLM entegrasyonu ile detaylandırılacaktır.",
        detailed_analysis="Detaylı analiz LLM entegrasyonu ile oluşturulacaktır.",
        recommendations="Öneriler LLM entegrasyonu ile oluşturulacaktır.",
        criteria_results_json="{}",
        strengths="Güçlü yanlar LLM analizi ile belirlenecek.",
        weaknesses="Geliştirilmesi gereken alanlar LLM analizi ile belirlenecek.",
        is_public=False,
        generated_by=current_user.id
    )
    
    return create_evaluation_report(report_data, session, current_user)
