"""
LLM Interaction Session Management API Endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request, Body
from sqlmodel import Session, select
from typing import List, Optional
from datetime import datetime
import json

from app.db import get_session
from app.models import (
    InteractionSession, 
    InteractionMessage, 
    SectionProgress,
    Training,
    TrainingSection,
    User
)
from app.services.flow_analyzer import FlowAnalyzer
from app.schemas import (
    InteractionSessionCreate,
    InteractionSessionUpdate,
    InteractionSessionResponse,
    InteractionMessageCreate,
    InteractionMessageResponse,
    LLMMessageRequest,
    LLMMessageResponse,
    SectionProgressCreate,
    SectionProgressUpdate,
    SectionProgressResponse,
    TrainingProgressResponse
)

router = APIRouter(prefix="/interaction-sessions", tags=["interaction-sessions"])


# ===== SESSION MANAGEMENT =====

@router.post("/")
async def create_interaction_session(
    request: Request,
    db: Session = Depends(get_session)
):
    """Create a new interaction session"""
    try:
        # Raw body'yi al ve parse et
        body = await request.body()
        print(f"🔍 Raw request body: {body}")
        print(f"🔍 Raw request body as string: {body.decode('utf-8')}")
        
        # JSON parse et
        session_data_dict = json.loads(body.decode('utf-8'))
        print(f"🔍 Parsed session data: {session_data_dict}")
        
        # Pydantic model'e dönüştür
        session_data = InteractionSessionCreate(**session_data_dict)
        print(f"🔍 Session data object: {session_data}")
        
        # Verify training exists and user has access
        training = db.get(Training, session_data.training_id)
    except Exception as e:
        print(f"❌ Error in create_interaction_session: {e}")
        print(f"❌ Error type: {type(e)}")
        print(f"❌ Error args: {e.args}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Validation error: {str(e)}"
        )
    if not training:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Training not found"
        )
    
    user = db.get(User, session_data.user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if user already has an active session for this training
    existing_session = db.exec(
        select(InteractionSession)
        .where(InteractionSession.training_id == session_data.training_id)
        .where(InteractionSession.user_id == session_data.user_id)
        .where(InteractionSession.status == "active")
    ).first()
    
    if existing_session:
        # Return existing session instead of creating new one
        return InteractionSessionResponse.model_validate({
            "id": existing_session.id,
            "training_id": existing_session.training_id,
            "user_id": existing_session.user_id,
            "access_code": existing_session.access_code,
            "current_section_id": existing_session.current_section_id,
            "status": existing_session.status,
            "created_at": existing_session.created_at,
            "updated_at": existing_session.updated_at,
            "last_activity_at": existing_session.last_activity_at,
            "total_time_spent": existing_session.total_time_spent,
            "interactions_count": existing_session.interactions_count,
            "completion_percentage": existing_session.completion_percentage,
            "llm_context_json": existing_session.llm_context_json,
            "current_phase": existing_session.current_phase,
            "metadata_json": existing_session.metadata_json
        })
    
    # Create new session
    new_session = InteractionSession(
        training_id=session_data.training_id,
        user_id=session_data.user_id,
        access_code=session_data.access_code,
        current_section_id=session_data.current_section_id
    )
    
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    
    return InteractionSessionResponse.model_validate({
      "id": new_session.id,
      "training_id": new_session.training_id,
      "user_id": new_session.user_id,
      "access_code": new_session.access_code,
      "current_section_id": new_session.current_section_id,
      "status": new_session.status,
      "created_at": new_session.created_at,
      "updated_at": new_session.updated_at,
      "last_activity_at": new_session.last_activity_at,
      "total_time_spent": new_session.total_time_spent,
      "interactions_count": new_session.interactions_count,
      "completion_percentage": new_session.completion_percentage,
      "llm_context_json": new_session.llm_context_json,
      "current_phase": new_session.current_phase,
      "metadata_json": new_session.metadata_json
    })


@router.get("/{session_id}", response_model=InteractionSessionResponse)
def get_interaction_session(
    session_id: str,
    db: Session = Depends(get_session)
):
    """Get interaction session by ID"""
    
    session = db.get(InteractionSession, session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    return InteractionSessionResponse.model_validate(session.__dict__)


@router.put("/{session_id}", response_model=InteractionSessionResponse)
def update_interaction_session(
    session_id: str,
    session_update: InteractionSessionUpdate,
    db: Session = Depends(get_session)
):
    """Update interaction session"""
    
    session = db.get(InteractionSession, session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Update fields
    for field, value in session_update.model_dump(exclude_unset=True).items():
        setattr(session, field, value)
    
    session.updated_at = datetime.utcnow()
    session.last_activity_at = datetime.utcnow()
    
    db.add(session)
    db.commit()
    db.refresh(session)
    
    return InteractionSessionResponse.model_validate(session.__dict__)


@router.delete("/{session_id}")
def delete_interaction_session(
    session_id: str,
    db: Session = Depends(get_session)
):
    """Delete interaction session"""
    
    session = db.get(InteractionSession, session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Update status instead of hard delete
    session.status = "abandoned"
    session.updated_at = datetime.utcnow()
    
    db.add(session)
    db.commit()
    
    return {"message": "Session abandoned successfully"}


# ===== MESSAGE MANAGEMENT =====

@router.post("/{session_id}/messages", response_model=LLMMessageResponse)
async def send_message_to_llm(
    session_id: str,
    request: Request,
    db: Session = Depends(get_session)
):
    """Send message to LLM and get response"""
    
    try:
        # Parse request body
        body = await request.body()
        message_data_dict = json.loads(body.decode('utf-8'))
        message_request = LLMMessageRequest(**message_data_dict)
        print(f"🔍 Message request parsed: {message_request}")
    except Exception as e:
        print(f"❌ Error parsing message request: {e}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid message format: {str(e)}"
        )
    
    # Get session
    session = db.get(InteractionSession, session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    if session.status != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session is not active"
        )
    
    # Save user message to database
    user_message = InteractionMessage(
        session_id=session_id,
        message=message_request.message,
        message_type=message_request.message_type
    )
    db.add(user_message)
    db.commit()
    db.refresh(user_message)
    
    # Build LLM context
    llm_context = build_llm_context(session, db)
    
    # Send to LLM (placeholder - will implement actual LLM integration)
    start_time = datetime.utcnow()
    llm_response = call_llm_api(message_request.message, llm_context)
    processing_time = (datetime.utcnow() - start_time).total_seconds() * 1000
    
    # Save LLM response to database
    assistant_message = InteractionMessage(
        session_id=session_id,
        message=llm_response["message"],
        message_type="assistant",
        llm_context_json=json.dumps(llm_context),
        llm_response_json=json.dumps(llm_response),
        llm_model="gpt-4o",
        processing_time_ms=int(processing_time),
        suggestions_json=json.dumps(llm_response.get("suggestions", [])),
        actions_json=json.dumps(llm_response.get("actions", []))
    )
    db.add(assistant_message)
    
    # Update session
    session.interactions_count += 1
    session.last_activity_at = datetime.utcnow()
    session.updated_at = datetime.utcnow()
    
    db.add(session)
    db.commit()
    db.refresh(assistant_message)
    
    return LLMMessageResponse(
        message=llm_response["message"],
        suggestions=llm_response.get("suggestions", []),
        actions=llm_response.get("actions", []),
        session_id=session_id,
        timestamp=assistant_message.timestamp,
        processing_time_ms=int(processing_time)
    )


@router.get("/{session_id}/messages", response_model=List[InteractionMessageResponse])
def get_session_messages(
    session_id: str,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_session)
):
    """Get messages for a session"""
    
    session = db.get(InteractionSession, session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    messages = db.exec(
        select(InteractionMessage)
        .where(InteractionMessage.session_id == session_id)
        .order_by(InteractionMessage.timestamp.asc())  # En eski mesajlar önce
        .offset(offset)
        .limit(limit)
    ).all()
    
    return [InteractionMessageResponse.model_validate(msg.__dict__) for msg in messages]


# ===== PROGRESS MANAGEMENT =====

@router.get("/{session_id}/progress", response_model=TrainingProgressResponse)
def get_training_progress(
    session_id: str,
    db: Session = Depends(get_session)
):
    """Get training progress for a session"""
    
    session = db.get(InteractionSession, session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Get all sections for this training
    sections = db.exec(
        select(TrainingSection)
        .where(TrainingSection.training_id == session.training_id)
        .order_by(TrainingSection.order_index)
    ).all()
    
    # Get progress for each section
    sections_progress = []
    completed_count = 0
    
    for section in sections:
        progress = db.exec(
            select(SectionProgress)
            .where(SectionProgress.session_id == session_id)
            .where(SectionProgress.section_id == section.id)
        ).first()
        
        if not progress:
            # Create default progress
            progress = SectionProgress(
                session_id=session_id,
                section_id=section.id,
                user_id=session.user_id,
                status="not_started"
            )
            db.add(progress)
            db.commit()
            db.refresh(progress)
        
        sections_progress.append(SectionProgressResponse.model_validate(progress.__dict__))
        
        if progress.status == "completed":
            completed_count += 1
    
    completion_percentage = (completed_count / len(sections)) * 100 if sections else 0
    
    return TrainingProgressResponse(
        training_id=session.training_id,
        user_id=session.user_id,
        session_id=session_id,
        total_sections=len(sections),
        completed_sections=completed_count,
        current_section_id=session.current_section_id,
        completion_percentage=completion_percentage,
        total_time_spent=session.total_time_spent,
        total_interactions=session.interactions_count,
        last_accessed_at=session.last_activity_at,
        sections_progress=sections_progress
    )


@router.put("/{session_id}/sections/{section_id}/progress", response_model=SectionProgressResponse)
async def update_section_progress(
    session_id: str,
    section_id: str,
    request: Request,
    db: Session = Depends(get_session)
):
    """Update progress for a specific section"""
    
    try:
        # Parse request body
        body = await request.body()
        progress_data_dict = json.loads(body.decode('utf-8'))
        progress_update = SectionProgressUpdate(**progress_data_dict)
        print(f"🔍 Progress update parsed: {progress_update}")
    except Exception as e:
        print(f"❌ Error parsing progress update: {e}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid progress format: {str(e)}"
        )
    
    # Verify session exists
    session = db.get(InteractionSession, session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Get or create section progress
    progress = db.exec(
        select(SectionProgress)
        .where(SectionProgress.session_id == session_id)
        .where(SectionProgress.section_id == section_id)
    ).first()
    
    if not progress:
        progress = SectionProgress(
            session_id=session_id,
            section_id=section_id,
            user_id=session.user_id
        )
        db.add(progress)
    
    # Update progress
    for field, value in progress_update.model_dump(exclude_unset=True).items():
        setattr(progress, field, value)
    
    progress.last_accessed_at = datetime.utcnow()
    
    db.add(progress)
    db.commit()
    db.refresh(progress)
    
    return SectionProgressResponse.model_validate(progress.__dict__)


@router.get("/{session_id}/flow-analysis")
def get_flow_analysis(
    session_id: str,
    db: Session = Depends(get_session)
):
    """Get flow analysis for current session"""
    
    # Verify session exists
    session = db.get(InteractionSession, session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Get flow analysis
    flow_analyzer = FlowAnalyzer(db)
    flow_analysis = flow_analyzer.analyze_flow(session.training_id, session_id)
    
    return flow_analysis


# ===== HELPER FUNCTIONS =====

def build_llm_context(session: InteractionSession, db: Session) -> dict:
    """Build comprehensive LLM context from session data with flow analysis"""
    
    # Get training and sections
    training = db.get(Training, session.training_id)
    sections = db.exec(
        select(TrainingSection)
        .where(TrainingSection.training_id == session.training_id)
        .order_by(TrainingSection.order_index)
    ).all()
    
    # Get recent messages
    recent_messages = db.exec(
        select(InteractionMessage)
        .where(InteractionMessage.session_id == session.id)
        .order_by(InteractionMessage.timestamp.asc())  # En eski mesajlar önce
        .limit(10)
    ).all()
    
    # Get current section
    current_section = None
    if session.current_section_id:
        current_section = db.get(TrainingSection, session.current_section_id)
    
    # Flow analyzer ile flow-aware context oluştur
    flow_analyzer = FlowAnalyzer(db)
    flow_analysis = flow_analyzer.analyze_flow(session.training_id, session.id)
    
    # Build context with flow information
    context = {
        "session": {
            "id": session.id,
            "status": session.status,
            "current_phase": session.current_phase,
            "total_time_spent": session.total_time_spent,
            "interactions_count": session.interactions_count,
            "completion_percentage": session.completion_percentage
        },
        "training": {
            "id": training.id if training else None,
            "title": training.title if training else "Unknown Training",
            "description": training.description if training else None,
            "ai_flow": training.ai_flow if training else None
        },
        "sections": [
            {
                "id": section.id,
                "title": section.title,
                "type": section.type,
                "order_index": section.order_index,
                "description": section.description,
                "script": section.script,
                "duration": section.duration
            }
            for section in sections
        ],
        "current_section": {
            "id": current_section.id if current_section else None,
            "title": current_section.title if current_section else None,
            "type": current_section.type if current_section else None,
            "description": current_section.description if current_section else None,
            "script": current_section.script if current_section else None
        } if current_section else None,
        "recent_messages": [
            {
                "message": msg.message,
                "message_type": msg.message_type,
                "timestamp": msg.timestamp.isoformat()
            }
            for msg in reversed(recent_messages)  # Reverse to get chronological order
        ],
        "flow_analysis": flow_analysis
    }
    
    return context


def call_llm_api(message: str, context: dict) -> dict:
    """Call real LLM API with message and comprehensive context"""
    
    import openai
    import os
    
    # OpenAI API key'ini al
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("❌ OpenAI API key not found")
        return {
            "message": "Üzgünüm, şu anda AI servisi kullanılamıyor. Lütfen daha sonra tekrar deneyin.",
            "suggestions": ["Tekrar denemek istiyorum", "Manuel olarak devam etmek istiyorum"],
            "actions": []
        }
    
    try:
        # Context'i sistem prompt'una dönüştür
        system_prompt = build_system_prompt(context)
        
        # OpenAI API çağrısı
        client = openai.OpenAI(api_key=api_key)
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",  # Daha hızlı ve ucuz model
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": message}
            ],
            temperature=0.7,
            max_tokens=500
        )
        
        llm_message = response.choices[0].message.content
        
        # Basit suggestion'lar oluştur
        suggestions = [
            "Daha fazla bilgi almak istiyorum",
            "Bu konuyu tekrar etmek istiyorum"
        ]
        
        # Flow analysis'dan suggestion ekle
        flow_analysis = context.get('flow_analysis', {})
        recommendations = flow_analysis.get('recommendations', {})
        suggested_action = recommendations.get('suggested_next_action', '')
        
        if suggested_action and suggested_action != "complete_training":
            suggestions.append("Sonraki bölüme geçmek istiyorum")
        
        # LLM'in navigation action'ları gönderebilmesi için actions ekle
        actions = []
        
        # Eğer LLM mesajında navigation istekleri varsa action oluştur
        if "sonraki bölüm" in llm_message.lower() or "next section" in llm_message.lower():
            actions.append({
                "type": "navigate_next",
                "target": "next_section"
            })
        elif "önceki bölüm" in llm_message.lower() or "previous section" in llm_message.lower():
            actions.append({
                "type": "navigate_previous", 
                "target": "previous_section"
            })
        
        return {
            "message": llm_message,
            "suggestions": suggestions,
            "actions": actions
        }
        
    except Exception as e:
        print(f"❌ OpenAI API error: {e}")
        return {
            "message": "Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.",
            "suggestions": ["Tekrar denemek istiyorum"],
            "actions": []
        }


def build_system_prompt(context: dict) -> str:
    """Build comprehensive system prompt for LLM"""
    
    training = context.get('training', {})
    current_section = context.get('current_section', {})
    flow_analysis = context.get('flow_analysis', {})
    section_type = current_section.get('type', '')
    
    system_prompt = f"""Sen bir eğitim asistanısın. Aşağıdaki bilgileri kullanarak kullanıcıya yardım et:

EĞİTİM BİLGİLERİ:
- Eğitim Adı: {training.get('title', 'Bilinmeyen Eğitim')}
- Eğitim Açıklaması: {training.get('description', 'Açıklama yok')}

MEVCUT BÖLÜM:
- Bölüm Adı: {current_section.get('title', 'Bilinmeyen Bölüm')}
- Bölüm Türü: {current_section.get('type', 'Bilinmeyen')}
- Bölüm Açıklaması: {current_section.get('description', '')}
- Bölüm Script'i: {current_section.get('script', '')}

KURALLAR:
1. Kullanıcıya samimi ve yardımcı ol
2. Mevcut bölümün içeriğine odaklan
3. Türkçe cevap ver
4. Kısa ve net ol
5. Eğitim akışına uygun rehberlik et
"""

    # Video bölümleri için özel talimatlar
    if section_type == 'video':
        system_prompt += """
VİDEO BÖLÜMÜ ÖZEL TALİMATLARI:
- Bu bir video bölümü, video içeriği ile ilgili soruları yanıtla
- Video oynatma, duraklama, tekrar etme gibi konularda yardım et
- Video ile ilgili teknik sorunları çöz
- Video içeriği hakkında açıklamalar yap

ÖNEMLİ: 
- OTAMATİK OLARAK BÖLÜM DEĞİŞTİRME!
- Kullanıcı açıkça "sonraki bölüme geç" veya "devam et" derse, o zaman navigate_next action'ı kullan
- Sadece video ile ilgili soruları yanıtla, bölüm değişikliği yapma
- Kullanıcı video hakkında soru sorduğunda sadece açıklama yap, bölüm değiştirme
"""
    
    # Karşılama bölümü için özel talimatlar
    elif current_section.get('title', '').lower() in ['karşılama', 'giriş', 'başlangıç']:
        system_prompt += """
KARŞILAMA BÖLÜMÜ TALİMATLARI:
- Kullanıcıyı sıcak bir şekilde karşıla
- Eğitim hakkında genel bilgi ver
- Kullanıcıyı eğitime hazırla
- Motivasyon ver
"""
    
    return system_prompt
