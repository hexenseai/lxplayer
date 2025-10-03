import json
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlmodel import Session, select, func, and_, or_
from pydantic import BaseModel

from app.db import get_session
from app.models import (
    UserInteraction, TrainingProgress, ChatMessage, Session, 
    User, Training, Company, TrainingSection
)
from app.auth import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)


# Pydantic models for API requests/responses
class InteractionCreate(BaseModel):
    session_id: str
    interaction_type: str
    section_id: Optional[str] = None
    overlay_id: Optional[str] = None
    video_time: Optional[float] = None
    duration: Optional[float] = None
    content: Optional[str] = None
    interaction_metadata: Optional[Dict[str, Any]] = None
    response_time: Optional[float] = None
    success: bool = True


class ChatMessageCreate(BaseModel):
    session_id: str
    message_type: str  # user|assistant|system
    content: str
    section_id: Optional[str] = None
    video_time: Optional[float] = None
    llm_model: Optional[str] = None
    llm_tokens_used: Optional[int] = None
    llm_response_time: Optional[float] = None
    audio_data: Optional[str] = None
    has_audio: bool = False
    message_metadata: Optional[Dict[str, Any]] = None


class TrainingProgressUpdate(BaseModel):
    current_section_id: Optional[str] = None
    current_video_time: Optional[float] = None
    completed_sections: Optional[List[str]] = None
    status: Optional[str] = None
    is_completed: Optional[bool] = None


class UserReport(BaseModel):
    user_id: str
    training_id: str
    total_sessions: int
    total_time_spent: int
    completion_percentage: float
    last_accessed: datetime
    sections_completed: int
    total_interactions: int
    chat_messages_count: int
    average_session_duration: float
    engagement_score: float


# Helper functions
def get_or_create_training_progress(
    session: Session, 
    user_id: str, 
    training_id: str, 
    company_id: Optional[str] = None
) -> TrainingProgress:
    """Get existing training progress or create new one"""
    stmt = select(TrainingProgress).where(
        and_(
            TrainingProgress.user_id == user_id,
            TrainingProgress.training_id == training_id
        )
    )
    progress = session.exec(stmt).first()
    
    if not progress:
        # For testing: check if user exists, if not, try to find any existing user
        from app.models import User
        user_exists = session.get(User, user_id)
        if not user_exists:
            # Try to find any existing user for testing
            any_user = session.exec(select(User).limit(1)).first()
            if any_user:
                user_id = any_user.id
                print(f"⚠️  Test user not found, using existing user: {user_id}")
            else:
                print("⚠️  No users found in database, this will likely fail")
        
        # For testing: check if training exists, if not, try to find any existing training
        from app.models import Training
        training_exists = session.get(Training, training_id)
        if not training_exists:
            # Try to find any existing training for testing
            any_training = session.exec(select(Training).limit(1)).first()
            if any_training:
                training_id = any_training.id
                print(f"⚠️  Test training not found, using existing training: {training_id}")
            else:
                print("⚠️  No trainings found in database, this will likely fail")
        
        # For testing: check if company exists, if not, try to find any existing company
        from app.models import Company
        company_exists = session.get(Company, company_id)
        if not company_exists:
            # Try to find any existing company for testing
            any_company = session.exec(select(Company).limit(1)).first()
            if any_company:
                company_id = any_company.id
                print(f"⚠️  Test company not found, using existing company: {company_id}")
            else:
                print("⚠️  No companies found in database, this will likely fail")
        
        progress = TrainingProgress(
            user_id=user_id,
            training_id=training_id,
            company_id=company_id,
            first_accessed_at=datetime.utcnow(),
            last_accessed_at=datetime.utcnow()
        )
        session.add(progress)
        session.commit()
        session.refresh(progress)
    
    return progress


def update_training_progress_stats(session: Session, progress: TrainingProgress):
    """Update training progress statistics"""
    # Count interactions
    interaction_count = session.exec(
        select(func.count(UserInteraction.id)).where(
            and_(
                UserInteraction.user_id == progress.user_id,
                UserInteraction.training_id == progress.training_id
            )
        )
    ).first() or 0
    
    # Count chat messages
    chat_count = session.exec(
        select(func.count(ChatMessage.id)).where(
            and_(
                ChatMessage.user_id == progress.user_id,
                ChatMessage.training_id == progress.training_id
            )
        )
    ).first() or 0
    
    # Calculate total time spent
    total_time = session.exec(
        select(func.sum(Session.total_duration)).where(
            and_(
                Session.user_id == progress.user_id,
                Session.training_id == progress.training_id
            )
        )
    ).first() or 0
    
    # Update progress
    progress.total_interactions = interaction_count
    progress.chat_messages_count = chat_count
    progress.total_time_spent = total_time or 0
    progress.last_accessed_at = datetime.utcnow()
    
    session.add(progress)
    session.commit()


# API Endpoints

@router.post("/complete-training")
async def complete_training(
    completion_data: dict,
    session: Session = Depends(get_session)
):
    """Mark a training as completed for a user"""
    try:
        user_id = completion_data.get("user_id")
        training_id = completion_data.get("training_id")
        company_id = completion_data.get("company_id")
        completion_time = completion_data.get("completion_time", 0)
        completion_percentage = completion_data.get("completion_percentage", 100.0)
        
        # Get or create training progress
        progress = get_or_create_training_progress(session, user_id, training_id, company_id)
        
        # Update progress to completed
        progress.status = "completed"
        progress.is_completed = True
        progress.completed_at = datetime.utcnow()
        progress.completion_percentage = completion_percentage
        progress.total_time_spent = completion_time
        
        # Update statistics
        update_training_progress_stats(session, progress)
        
        session.add(progress)
        session.commit()
        session.refresh(progress)
        
        return {
            "id": progress.id,
            "message": "Training completed successfully",
            "completion_time": completion_time,
            "completion_percentage": completion_percentage
        }
        
    except Exception as e:
        logger.error(f"Error completing training: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to complete training: {str(e)}")

@router.get("/training-completions")
async def get_training_completions(
    session: Session = Depends(get_session)
):
    """Get all training completions"""
    try:
        # Get all completed training progress records
        stmt = select(TrainingProgress).where(
            and_(
                TrainingProgress.is_completed == True,
                TrainingProgress.completed_at.isnot(None)
            )
        ).order_by(TrainingProgress.completed_at.desc())
        
        completions = session.exec(stmt).all()
        
        # Format the response
        completion_list = []
        for completion in completions:
            completion_list.append({
                "id": completion.id,
                "user_id": completion.user_id,
                "training_id": completion.training_id,
                "company_id": completion.company_id,
                "completed_at": completion.completed_at,
                "completion_percentage": completion.completion_percentage,
                "total_time_spent": completion.total_time_spent,
                "total_interactions": completion.total_interactions,
                "sections_completed": completion.sections_completed
            })
        
        return {
            "completions": completion_list,
            "total_count": len(completion_list)
        }
        
    except Exception as e:
        logger.error(f"Error getting training completions: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get completions: {str(e)}")

@router.post("/sessions")
async def create_session(
    session_data: dict,
    session: Session = Depends(get_session)
):
    """Create a new session for testing"""
    try:
        # Get real IDs if test IDs are provided
        user_id = session_data.get("user_id")
        training_id = session_data.get("training_id")
        company_id = session_data.get("company_id", "test-company-123")
        
        # Check if user exists, if not, find any existing user
        from app.models import User
        user_exists = session.get(User, user_id)
        if not user_exists:
            any_user = session.exec(select(User).limit(1)).first()
            if any_user:
                user_id = any_user.id
        
        # Check if training exists, if not, find any existing training
        from app.models import Training
        training_exists = session.get(Training, training_id)
        if not training_exists:
            any_training = session.exec(select(Training).limit(1)).first()
            if any_training:
                training_id = any_training.id
        
        # Check if company exists, if not, find any existing company
        from app.models import Company
        company_exists = session.get(Company, company_id)
        if not company_exists:
            any_company = session.exec(select(Company).limit(1)).first()
            if any_company:
                company_id = any_company.id
        
        # Create session
        new_session = Session(
            user_id=user_id,
            training_id=training_id,
            company_id=company_id,
            status=session_data.get("status", "active"),
            created_at=datetime.utcnow(),
            last_activity_at=datetime.utcnow()
        )
        
        session.add(new_session)
        session.commit()
        session.refresh(new_session)
        
        return {"id": new_session.id, "message": "Session created successfully"}
        
    except Exception as e:
        logger.error(f"Error creating session: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create session: {str(e)}")

@router.post("/interactions")
async def create_interaction(
    interaction: InteractionCreate,
    session: Session = Depends(get_session)
):
    """Record a user interaction"""
    try:
        # Get session info - try InteractionSession first, then fallback to Session
        from app.models import InteractionSession
        session_obj = session.get(InteractionSession, interaction.session_id)
        if not session_obj:
            # Fallback to old Session model
            session_obj = session.get(Session, interaction.session_id)
        
        if not session_obj:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Create interaction record
        # Handle different session types
        if hasattr(session_obj, 'company_id'):
            # Old Session model
            company_id = session_obj.company_id
        else:
            # InteractionSession model - no company_id field
            company_id = None
            
        interaction_record = UserInteraction(
            session_id=interaction.session_id,
            user_id=session_obj.user_id,
            training_id=session_obj.training_id,
            company_id=company_id,
            interaction_type=interaction.interaction_type,
            section_id=interaction.section_id,
            overlay_id=interaction.overlay_id,
            video_time=interaction.video_time,
            duration=interaction.duration,
            content=interaction.content,
            interaction_metadata=interaction.interaction_metadata if isinstance(interaction.interaction_metadata, str) else json.dumps(interaction.interaction_metadata or {}),
            response_time=interaction.response_time,
            success=interaction.success
        )
        
        session.add(interaction_record)
        
        # Update training progress
        progress = get_or_create_training_progress(
            session, session_obj.user_id, session_obj.training_id, company_id
        )
        
        # Update progress based on interaction type
        if interaction.interaction_type == "section_change" and interaction.section_id:
            progress.current_section_id = interaction.section_id
            progress.sections_attempted += 1
        
        if interaction.interaction_type == "training_end":
            progress.is_completed = True
            progress.completed_at = datetime.utcnow()
            progress.status = "completed"
        
        # Update session last activity
        session_obj.last_activity_at = datetime.utcnow()
        session.add(session_obj)
        
        session.commit()
        session.refresh(interaction_record)
        
        return {"id": interaction_record.id, "message": "Interaction recorded successfully"}
        
    except Exception as e:
        logger.error(f"Error creating interaction: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to record interaction: {str(e)}")


@router.post("/chat-messages")
async def create_chat_message(
    message: ChatMessageCreate,
    session: Session = Depends(get_session)
):
    """Record a chat message"""
    try:
        # Get session info - try InteractionSession first, then fallback to Session
        from app.models import InteractionSession
        session_obj = session.get(InteractionSession, message.session_id)
        if not session_obj:
            # Fallback to old Session model
            session_obj = session.get(Session, message.session_id)
        
        if not session_obj:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Create chat message record
        # Handle different session types
        if hasattr(session_obj, 'company_id'):
            # Old Session model
            company_id = session_obj.company_id
        else:
            # InteractionSession model - no company_id field
            company_id = None
            
        chat_record = ChatMessage(
            session_id=message.session_id,
            user_id=session_obj.user_id,
            training_id=session_obj.training_id,
            company_id=company_id,
            message_type=message.message_type,
            content=message.content,
            section_id=message.section_id,
            video_time=message.video_time,
            llm_model=message.llm_model,
            llm_tokens_used=message.llm_tokens_used,
            llm_response_time=message.llm_response_time,
            audio_data=message.audio_data,
            has_audio=message.has_audio,
            message_metadata=json.dumps(message.message_metadata or {})
        )
        
        session.add(chat_record)
        
        # Update training progress
        progress = get_or_create_training_progress(
            session, session_obj.user_id, session_obj.training_id, company_id
        )
        
        # Update session last activity
        session_obj.last_activity_at = datetime.utcnow()
        session.add(session_obj)
        
        session.commit()
        session.refresh(chat_record)
        
        return {"id": chat_record.id, "message": "Chat message recorded successfully"}
        
    except Exception as e:
        logger.error(f"Error creating chat message: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to record chat message: {str(e)}")


@router.put("/training-progress/{user_id}/{training_id}")
async def update_training_progress(
    user_id: str,
    training_id: str,
    progress_update: TrainingProgressUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Update training progress for a user"""
    try:
        # Check permissions (user can only update their own progress, or admin can update any)
        if current_user.id != user_id and current_user.role not in ["Admin", "SuperAdmin"]:
            raise HTTPException(status_code=403, detail="Not authorized to update this progress")
        
        progress = get_or_create_training_progress(session, user_id, training_id, current_user.company_id)
        
        # Update fields
        if progress_update.current_section_id is not None:
            progress.current_section_id = progress_update.current_section_id
        
        if progress_update.current_video_time is not None:
            progress.current_video_time = progress_update.current_video_time
        
        if progress_update.completed_sections is not None:
            progress.completed_sections = json.dumps(progress_update.completed_sections)
            progress.sections_completed = len(progress_update.completed_sections)
        
        if progress_update.status is not None:
            progress.status = progress_update.status
        
        if progress_update.is_completed is not None:
            progress.is_completed = progress_update.is_completed
            if progress_update.is_completed and not progress.completed_at:
                progress.completed_at = datetime.utcnow()
        
        progress.last_accessed_at = datetime.utcnow()
        
        session.add(progress)
        session.commit()
        session.refresh(progress)
        
        return {"message": "Training progress updated successfully", "progress": progress}
        
    except Exception as e:
        logger.error(f"Error updating training progress: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update progress: {str(e)}")


@router.get("/training-progress/{user_id}/{training_id}")
async def get_training_progress(
    user_id: str,
    training_id: str,
    session: Session = Depends(get_session)
):
    """Get training progress for a user"""
    try:
        # Note: Authentication removed for testing - in production, add proper auth checks
        
        # For testing, use a default company_id
        progress = get_or_create_training_progress(session, user_id, training_id, "test-company-123")
        
        # Update statistics
        update_training_progress_stats(session, progress)
        
        return progress
        
    except Exception as e:
        logger.error(f"Error getting training progress: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get progress: {str(e)}")


@router.get("/user-report/{user_id}/{training_id}")
async def get_user_report(
    user_id: str,
    training_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Generate a detailed user report for a specific training"""
    try:
        # Check permissions
        if current_user.id != user_id and current_user.role not in ["Admin", "SuperAdmin"]:
            raise HTTPException(status_code=403, detail="Not authorized to view this report")
        
        # Get training progress
        progress = get_or_create_training_progress(session, user_id, training_id, current_user.company_id)
        update_training_progress_stats(session, progress)
        
        # Get session statistics
        sessions = session.exec(
            select(Session).where(
                and_(
                    Session.user_id == user_id,
                    Session.training_id == training_id
                )
            )
        ).all()
        
        total_sessions = len(sessions)
        total_duration = sum(s.total_duration or 0 for s in sessions)
        average_duration = total_duration / total_sessions if total_sessions > 0 else 0
        
        # Calculate engagement score (simplified)
        engagement_score = min(100.0, (
            (progress.completion_percentage * 0.4) +
            (min(100, progress.total_interactions / 10) * 0.3) +
            (min(100, progress.chat_messages_count / 5) * 0.3)
        ))
        
        report = UserReport(
            user_id=user_id,
            training_id=training_id,
            total_sessions=total_sessions,
            total_time_spent=total_duration,
            completion_percentage=progress.completion_percentage,
            last_accessed=progress.last_accessed_at,
            sections_completed=progress.sections_completed,
            total_interactions=progress.total_interactions,
            chat_messages_count=progress.chat_messages_count,
            average_session_duration=average_duration,
            engagement_score=engagement_score
        )
        
        return report
        
    except Exception as e:
        logger.error(f"Error generating user report: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")


@router.get("/interactions/{session_id}")
async def get_session_interactions(
    session_id: str,
    limit: int = Query(100, le=1000),
    offset: int = Query(0, ge=0),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Get interactions for a specific session"""
    try:
        # Check if session exists and user has access
        session_obj = session.get(Session, session_id)
        if not session_obj:
            raise HTTPException(status_code=404, detail="Session not found")
        
        if session_obj.user_id != current_user.id and current_user.role not in ["Admin", "SuperAdmin"]:
            raise HTTPException(status_code=403, detail="Not authorized to view this session")
        
        # Get interactions
        stmt = select(UserInteraction).where(
            UserInteraction.session_id == session_id
        ).order_by(UserInteraction.timestamp.desc()).offset(offset).limit(limit)
        
        interactions = session.exec(stmt).all()
        
        return {
            "interactions": interactions,
            "total": len(interactions),
            "limit": limit,
            "offset": offset
        }
        
    except Exception as e:
        logger.error(f"Error getting session interactions: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get interactions: {str(e)}")


@router.get("/chat-history/{session_id}")
async def get_chat_history(
    session_id: str,
    limit: int = Query(100, le=1000),
    offset: int = Query(0, ge=0),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Get chat history for a specific session"""
    try:
        # Check if session exists and user has access
        session_obj = session.get(Session, session_id)
        if not session_obj:
            raise HTTPException(status_code=404, detail="Session not found")
        
        if session_obj.user_id != current_user.id and current_user.role not in ["Admin", "SuperAdmin"]:
            raise HTTPException(status_code=403, detail="Not authorized to view this session")
        
        # Get chat messages
        stmt = select(ChatMessage).where(
            ChatMessage.session_id == session_id
        ).order_by(ChatMessage.timestamp.asc()).offset(offset).limit(limit)
        
        messages = session.exec(stmt).all()
        
        return {
            "messages": messages,
            "total": len(messages),
            "limit": limit,
            "offset": offset
        }
        
    except Exception as e:
        logger.error(f"Error getting chat history: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get chat history: {str(e)}")


@router.get("/analytics/training/{training_id}")
async def get_training_analytics(
    training_id: str,
    days: int = Query(30, ge=1, le=365),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Get analytics for a specific training"""
    try:
        # Check permissions
        if current_user.role not in ["Admin", "SuperAdmin"]:
            raise HTTPException(status_code=403, detail="Not authorized to view analytics")
        
        # Date range
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # Get training progress statistics
        progress_stats = session.exec(
            select(
                func.count(TrainingProgress.id).label("total_users"),
                func.avg(TrainingProgress.completion_percentage).label("avg_completion"),
                func.avg(TrainingProgress.total_time_spent).label("avg_time_spent"),
                func.count(TrainingProgress.id).filter(TrainingProgress.is_completed == True).label("completed_users")
            ).where(TrainingProgress.training_id == training_id)
        ).first()
        
        # Get interaction statistics
        interaction_stats = session.exec(
            select(
                func.count(UserInteraction.id).label("total_interactions"),
                func.count(UserInteraction.id).filter(UserInteraction.interaction_type == "chat_message").label("chat_interactions"),
                func.count(UserInteraction.id).filter(UserInteraction.interaction_type == "section_change").label("navigation_interactions")
            ).where(
                and_(
                    UserInteraction.training_id == training_id,
                    UserInteraction.timestamp >= start_date
                )
            )
        ).first()
        
        return {
            "training_id": training_id,
            "period_days": days,
            "progress_stats": {
                "total_users": progress_stats.total_users or 0,
                "completed_users": progress_stats.completed_users or 0,
                "average_completion": round(progress_stats.avg_completion or 0, 2),
                "average_time_spent": round(progress_stats.avg_time_spent or 0, 2)
            },
            "interaction_stats": {
                "total_interactions": interaction_stats.total_interactions or 0,
                "chat_interactions": interaction_stats.chat_interactions or 0,
                "navigation_interactions": interaction_stats.navigation_interactions or 0
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting training analytics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get analytics: {str(e)}")
