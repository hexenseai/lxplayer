from fastapi import APIRouter, Depends, HTTPException, status, Request, Header
from sqlmodel import Session, select
from typing import List, Optional, Dict, Any
from datetime import datetime
import json
import logging
import hmac
import hashlib
import os

from app.db import get_session
from app.models import EvaluationResult, EvaluationCriteria, InteractionSession, Training, User
from app.auth import get_current_user

router = APIRouter(prefix="/elevenlabs-webhook", tags=["elevenlabs-webhook"])

# Logger setup
logger = logging.getLogger(__name__)

# ElevenLabs webhook secret
ELEVENLABS_WEBHOOK_SECRET = os.getenv("ELEVENLABS_WEBHOOK_SECRET", "wsec_1b3a61ae67faa6a6018cdd1ca764f95cec70e22442ea66b85efe2676bd56f745")

def verify_webhook_signature(payload: bytes, signature: str, secret: str) -> bool:
    """ElevenLabs webhook signature'ını doğrula"""
    try:
        # ElevenLabs signature format: "sha256=<hash>"
        if not signature.startswith("sha256="):
            return False
        
        # Signature'dan hash'i çıkar
        received_hash = signature[7:]  # "sha256=" kısmını çıkar
        
        # Payload'ı secret ile hash'le
        expected_hash = hmac.new(
            secret.encode('utf-8'),
            payload,
            hashlib.sha256
        ).hexdigest()
        
        # Hash'leri karşılaştır (timing attack'a karşı güvenli)
        return hmac.compare_digest(received_hash, expected_hash)
        
    except Exception as e:
        logger.error(f"❌ Webhook signature verification error: {e}")
        return False

@router.post("/evaluation")
async def receive_elevenlabs_evaluation(
    request: Request,
    session: Session = Depends(get_session),
    x_elevenlabs_signature: Optional[str] = Header(None)
):
    """ElevenLabs'den gelen değerlendirme sonuçlarını işle"""
    
    try:
        # Request body'yi al
        body = await request.body()
        
        # Webhook signature'ını doğrula
        if not x_elevenlabs_signature:
            logger.warning("⚠️ No webhook signature provided")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Webhook signature is required"
            )
        
        if not verify_webhook_signature(body, x_elevenlabs_signature, ELEVENLABS_WEBHOOK_SECRET):
            logger.warning("⚠️ Invalid webhook signature")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid webhook signature"
            )
        
        webhook_data = json.loads(body.decode('utf-8'))
        
        logger.info(f"🔍 ElevenLabs webhook received and verified: {webhook_data}")
        
        # ElevenLabs webhook type kontrolü
        if webhook_data.get('type') != 'post_call_transcription':
            logger.info(f"ℹ️ Ignoring webhook type: {webhook_data.get('type')}")
            return {"status": "ignored", "message": "Webhook type not supported"}
        
        # Webhook verilerini parse et
        evaluation_data = parse_elevenlabs_webhook(webhook_data)
        
        if not evaluation_data:
            logger.warning("⚠️ Invalid webhook data format")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid webhook data format"
            )
        
        # Session ID'yi al (webhook'dan veya metadata'dan)
        session_id = evaluation_data.get('session_id')
        if not session_id:
            logger.warning("⚠️ No session_id in webhook data")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="session_id is required"
            )
        
        # Session'ı kontrol et
        interaction_session = session.get(InteractionSession, session_id)
        if not interaction_session:
            logger.warning(f"⚠️ Session not found: {session_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        # Değerlendirme sonuçlarını kaydet
        saved_results = []
        for criteria_evaluation in evaluation_data.get('criteria_evaluations', []):
            result = save_evaluation_result(
                session=session,
                interaction_session=interaction_session,
                criteria_evaluation=criteria_evaluation,
                webhook_data=webhook_data
            )
            if result:
                saved_results.append(result)
        
        logger.info(f"✅ Saved {len(saved_results)} evaluation results for session {session_id}")
        
        return {
            "status": "received",
            "session_id": session_id,
            "saved_results": len(saved_results),
            "message": "Evaluation results saved successfully"
        }
        
    except json.JSONDecodeError as e:
        logger.error(f"❌ JSON decode error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON format"
        )
    except Exception as e:
        logger.error(f"❌ Webhook processing error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Webhook processing failed: {str(e)}"
        )


@router.get("/test")
def test_webhook_endpoint():
    """Webhook endpoint'inin çalışıp çalışmadığını test et"""
    return {
        "status": "ok",
        "message": "ElevenLabs webhook endpoint is working",
        "timestamp": datetime.utcnow().isoformat(),
        "secret_configured": bool(ELEVENLABS_WEBHOOK_SECRET)
    }


@router.get("/evaluation/{session_id}")
def get_elevenlabs_evaluation(
    session_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Session ID'ye göre ElevenLabs değerlendirme sonuçlarını getir"""
    
    try:
        # Session'ı kontrol et
        interaction_session = session.get(InteractionSession, session_id)
        if not interaction_session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        # Bu session için değerlendirme sonuçlarını getir
        evaluation_results = session.exec(
            select(EvaluationResult)
            .where(EvaluationResult.interaction_session_id == session_id)
            .order_by(EvaluationResult.created_at.desc())
        ).all()
        
        if not evaluation_results:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No evaluation results found for this session"
            )
        
        # Değerlendirme sonuçlarını formatla
        evaluations = []
        total_score = 0
        total_weight = 0
        
        for result in evaluation_results:
            if result.evaluation_criteria:
                weight = result.evaluation_criteria.weight
                score = result.score
                
                evaluations.append({
                    "id": str(result.id),
                    "criteria": {
                        "id": str(result.evaluation_criteria.id),
                        "name": result.evaluation_criteria.name,
                        "description": result.evaluation_criteria.description,
                        "weight": weight
                    },
                    "status": result.status,
                    "score": score,
                    "comment": result.comment or "",
                    "timestamp": result.created_at.isoformat()
                })
                
                total_score += score * weight
                total_weight += weight
        
        # Genel skor hesapla
        overall_score = int(total_score / total_weight) if total_weight > 0 else 0
        
        # Özet ve öneriler oluştur
        summary = f"Session {session_id} için {len(evaluations)} kriter değerlendirildi. Genel başarı oranı: {overall_score}%"
        recommendations = [
            "Daha fazla pratik yapın",
            "Zayıf olduğunuz alanlara odaklanın",
            "Düzenli olarak tekrar edin"
        ]
        
        return {
            "session_id": session_id,
            "training_id": str(interaction_session.training_id) if interaction_session.training_id else None,
            "evaluations": evaluations,
            "overall_score": overall_score,
            "summary": summary,
            "recommendations": recommendations,
            "note": "Bu değerlendirme ElevenLabs webhook'undan alınmıştır."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting ElevenLabs evaluation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get evaluation results: {str(e)}"
        )


def parse_elevenlabs_webhook(webhook_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """ElevenLabs webhook verilerini parse et"""
    
    try:
        # ElevenLabs webhook format'ını parse et
        data = webhook_data.get("data", {})
        analysis = data.get("analysis", {})
        
        # Session ID'yi conversation_id'den al (veya metadata'dan)
        conversation_id = data.get("conversation_id")
        agent_id = data.get("agent_id")
        
        # Session ID'yi conversation_id'den türet veya metadata'dan al
        session_id = None
        if conversation_id:
            # conversation_id'yi session_id olarak kullan
            session_id = conversation_id
        else:
            # Fallback: metadata'dan al
            metadata = webhook_data.get("metadata", {})
            session_id = metadata.get("session_id")
        
        if not session_id:
            logger.warning("⚠️ No session_id found in webhook data")
            return None
        
        # Call status'u parse et
        call_successful = analysis.get("call_successful")
        if call_successful == "success":
            call_status = "successful"
        elif call_successful == "failure":
            call_status = "failed"
        else:
            call_status = "unknown"
        
        parsed_data = {
            "session_id": session_id,
            "conversation_id": conversation_id,
            "agent_id": agent_id,
            "call_status": call_status,
            "summary": analysis.get("transcript_summary", ""),
            "criteria_evaluations": []
        }
        
        # Criteria evaluations'ları parse et
        evaluation_results = analysis.get("evaluation_criteria_results", {})
        if isinstance(evaluation_results, dict):
            for criteria_name, evaluation in evaluation_results.items():
                if isinstance(evaluation, dict):
                    # Status'u parse et
                    result = evaluation.get("result", "unknown")
                    if result == "success":
                        status = "success"
                    elif result == "failure":
                        status = "failed"
                    else:
                        status = "unknown"
                    
                    parsed_data["criteria_evaluations"].append({
                        "criteria_name": criteria_name,
                        "status": status,
                        "comment": evaluation.get("rationale", ""),
                        "score": 0  # ElevenLabs'den score gelmiyor, status'tan hesaplayacağız
                    })
        
        logger.info(f"✅ Parsed webhook data: {len(parsed_data['criteria_evaluations'])} criteria evaluations for session {session_id}")
        return parsed_data
        
    except Exception as e:
        logger.error(f"❌ Error parsing webhook data: {e}")
        return None


def save_evaluation_result(
    session: Session,
    interaction_session: InteractionSession,
    criteria_evaluation: Dict[str, Any],
    webhook_data: Dict[str, Any]
) -> Optional[EvaluationResult]:
    """Değerlendirme sonucunu veritabanına kaydet"""
    
    try:
        # Criteria'yı bul (name ile)
        criteria_name = criteria_evaluation.get("criteria_name")
        if not criteria_name:
            logger.warning("⚠️ No criteria name in evaluation")
            return None
        
        # Criteria'yı bul
        criteria = session.exec(
            select(EvaluationCriteria)
            .where(EvaluationCriteria.training_id == interaction_session.training_id)
            .where(EvaluationCriteria.title.ilike(f"%{criteria_name}%"))
            .where(EvaluationCriteria.is_active == True)
        ).first()
        
        if not criteria:
            logger.warning(f"⚠️ Criteria not found: {criteria_name}")
            # Yeni criteria oluştur
            criteria = create_criteria_from_webhook(
                session=session,
                training_id=interaction_session.training_id,
                criteria_name=criteria_name
            )
        
        # Status'u parse et
        status = criteria_evaluation.get("status", "unknown")
        score = calculate_score_from_status(status, criteria_evaluation.get("score", 0))
        
        # Evaluation result oluştur
        evaluation_result = EvaluationResult(
            criteria_id=criteria.id,
            session_id=interaction_session.id,
            user_id=interaction_session.user_id,
            training_id=interaction_session.training_id,
            evaluation_score=score,
            evaluation_result=criteria_evaluation.get("comment", ""),
            explanation=f"ElevenLabs değerlendirmesi: {status}",
            llm_model="elevenlabs",
            processing_time_ms=None,
            tokens_used=None,
            section_id=interaction_session.current_section_id,
            user_interactions_json=json.dumps(webhook_data.get("conversation", {})),
            context_data_json=json.dumps(webhook_data.get("metadata", {})),
            metadata_json=json.dumps({
                "source": "elevenlabs_webhook",
                "webhook_timestamp": datetime.utcnow().isoformat(),
                "original_status": status
            })
        )
        
        session.add(evaluation_result)
        session.commit()
        session.refresh(evaluation_result)
        
        logger.info(f"✅ Saved evaluation result: {criteria_name} - {status} - {score}")
        return evaluation_result
        
    except Exception as e:
        logger.error(f"❌ Error saving evaluation result: {e}")
        session.rollback()
        return None


def create_criteria_from_webhook(
    session: Session,
    training_id: str,
    criteria_name: str
) -> EvaluationCriteria:
    """Webhook'dan gelen criteria için yeni criteria oluştur"""
    
    # Criteria name'den description oluştur
    description_map = {
        "sirket_sistem_tanitim": "Şirket ve sistem tanıtımı kriteri",
        "ihtiyac_analizi": "Müşteri ihtiyaç analizi kriteri",
        "itiraz_karsilama": "Müşteri itirazlarını karşılama kriteri",
        "soru_cevap": "Sorulara cevap verme kriteri",
        "satis_kapatma": "Satış kapatma kriteri",
        "ikna_kabiliyeti": "İkna kabiliyeti kriteri",
        "buz_kirma": "Buz kırma kriteri"
    }
    
    description = description_map.get(criteria_name, f"{criteria_name} kriteri")
    
    # Yeni criteria oluştur
    criteria = EvaluationCriteria(
        training_id=training_id,
        title=criteria_name.replace("_", " ").title(),
        description=description,
        section_id=None,
        applies_to_entire_training=True,
        llm_evaluation_prompt=f"Değerlendir: {description}",
        criteria_type="elevenlabs_auto",
        weight=5,  # Varsayılan ağırlık
        order_index=999,  # Son sıraya ekle
        is_active=True,
        created_by="elevenlabs_webhook",
        company_id=None
    )
    
    session.add(criteria)
    session.commit()
    session.refresh(criteria)
    
    logger.info(f"✅ Created new criteria: {criteria_name}")
    return criteria


def calculate_score_from_status(status: str, provided_score: int = 0) -> float:
    """Status'tan puan hesapla"""
    
    if provided_score > 0:
        return float(provided_score)
    
    status_score_map = {
        "success": 85.0,
        "failed": 35.0,
        "unknown": 0.0
    }
    
    return status_score_map.get(status.lower(), 0.0)


@router.get("/test-webhook")
async def test_webhook():
    """Webhook endpoint'ini test et"""
    return {
        "status": "success",
        "message": "ElevenLabs webhook endpoint is working",
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/evaluation/{session_id}")
async def get_session_evaluation_from_webhook(
    session_id: str,
    session: Session = Depends(get_session)
):
    """Webhook'dan gelen değerlendirme sonuçlarını getir"""
    
    try:
        # Session'ı kontrol et
        interaction_session = session.get(InteractionSession, session_id)
        if not interaction_session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        # ElevenLabs'den gelen değerlendirme sonuçlarını getir
        results = session.exec(
            select(EvaluationResult)
            .where(EvaluationResult.session_id == session_id)
            .where(EvaluationResult.metadata_json.contains("elevenlabs_webhook"))
            .order_by(EvaluationResult.evaluated_at.desc())
        ).all()
        
        if not results:
            return {
                "session_id": session_id,
                "status": "no_evaluation",
                "message": "No ElevenLabs evaluation found for this session"
            }
        
        # Sonuçları formatla
        formatted_results = []
        for result in results:
            criteria = session.get(EvaluationCriteria, result.criteria_id)
            if criteria:
                formatted_results.append({
                    "id": result.id,
                    "criteria": {
                        "id": criteria.id,
                        "name": criteria.title,
                        "description": criteria.description or "",
                        "weight": criteria.weight
                    },
                    "status": "success" if result.evaluation_score >= 70 else "failed" if result.evaluation_score >= 30 else "unknown",
                    "score": result.evaluation_score or 0,
                    "comment": result.evaluation_result,
                    "timestamp": result.evaluated_at.isoformat()
                })
        
        # Genel puan hesapla
        valid_scores = [r["score"] for r in formatted_results if r["score"] > 0]
        overall_score = round(sum(valid_scores) / len(valid_scores)) if valid_scores else 0
        
        return {
            "session_id": session_id,
            "training_id": interaction_session.training_id,
            "evaluations": formatted_results,
            "overall_score": overall_score,
            "summary": f"ElevenLabs değerlendirmesi: {len(formatted_results)} kriter değerlendirildi. Genel performans {'iyi' if overall_score >= 70 else 'geliştirilmeli'} seviyede.",
            "recommendations": [
                "ElevenLabs değerlendirme sonuçlarına göre performansınızı geliştirin",
                "Başarısız olan kriterler üzerinde çalışın",
                "Başarılı olan kriterleri koruyun ve geliştirin"
            ],
            "note": "Bu değerlendirme ElevenLabs AI teknolojisi kullanılarak oluşturulmuştur."
        }
        
    except Exception as e:
        logger.error(f"❌ Error getting webhook evaluation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get evaluation: {str(e)}"
        )
