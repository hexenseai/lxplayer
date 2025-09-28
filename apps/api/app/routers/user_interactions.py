from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func
from typing import List, Optional
from datetime import datetime, timedelta
from ..db import get_session
from ..models import UserInteraction, User, Training, Session as TrainingSession, Company, TrainingSection, Overlay
from ..auth import get_current_user, is_super_admin, check_company_access

router = APIRouter(prefix="/user-interactions", tags=["user-interactions"])


class UserInteractionResponse:
    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)


class TrainingInteractionSummary:
    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)


class SessionInteractionSummary:
    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)


@router.get("/", operation_id="list_user_interactions")
def list_user_interactions(
    user_id: Optional[str] = None,
    training_id: Optional[str] = None,
    session_id: Optional[str] = None,
    interaction_type: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """List user interactions with filtering options"""
    
    # Build query
    query = select(UserInteraction)
    
    # Apply filters
    if user_id:
        query = query.where(UserInteraction.user_id == user_id)
    if training_id:
        query = query.where(UserInteraction.training_id == training_id)
    if session_id:
        query = query.where(UserInteraction.session_id == session_id)
    if interaction_type:
        query = query.where(UserInteraction.interaction_type == interaction_type)
    
    # Apply company access control
    if not is_super_admin(current_user):
        if not current_user.company_id:
            return []
        
        # Admin kullanıcılar sadece kendi şirketlerindeki kullanıcıların etkileşimlerini görebilir
        # Bu kontrolü hem company_id hem de user_id bazında yapalım
        
        # Önce user_id filtresi varsa, o kullanıcının şirketini kontrol et
        if user_id:
            target_user = session.get(User, user_id)
            if not target_user or target_user.company_id != current_user.company_id:
                return []  # Kullanıcı bulunamadı veya farklı şirkette
        else:
            # user_id filtresi yoksa, sadece aynı şirketteki kullanıcıların etkileşimlerini getir
            query = query.join(User, UserInteraction.user_id == User.id).where(
                User.company_id == current_user.company_id
            )
    
    # Apply pagination
    query = query.offset(offset).limit(limit).order_by(UserInteraction.timestamp.desc())
    
    interactions = session.exec(query).all()
    
    # Enrich with related data
    result = []
    for interaction in interactions:
        interaction_dict = {
            "id": interaction.id,
            "user_id": interaction.user_id,
            "training_id": interaction.training_id,
            "session_id": interaction.session_id,
            "company_id": interaction.company_id,
            "timestamp": interaction.timestamp,
            "interaction_type": interaction.interaction_type,
            "section_id": interaction.section_id,
            "overlay_id": interaction.overlay_id,
            "video_time": interaction.video_time,
            "duration": interaction.duration,
            "content": interaction.content,
            "interaction_metadata": interaction.interaction_metadata,
            "response_time": interaction.response_time,
            "success": interaction.success,
            # Related data
            "user": None,
            "training": None,
            "session": None,
            "section": None,
            "overlay": None,
            "company": None
        }
        
        # Get user info
        if interaction.user_id:
            user = session.get(User, interaction.user_id)
            if user:
                interaction_dict["user"] = {
                    "id": user.id,
                    "email": user.email,
                    "username": user.username,
                    "full_name": user.full_name
                }
        
        # Get training info
        if interaction.training_id:
            training = session.get(Training, interaction.training_id)
            if training:
                interaction_dict["training"] = {
                    "id": training.id,
                    "title": training.title,
                    "description": training.description
                }
        
        # Get session info
        if interaction.session_id:
            training_session = session.get(TrainingSession, interaction.session_id)
            if training_session:
                interaction_dict["session"] = {
                    "id": training_session.id,
                    "started_at": training_session.started_at,
                    "ended_at": training_session.ended_at,
                    "status": training_session.status
                }
        
        # Get section info
        if interaction.section_id:
            section = session.get(TrainingSection, interaction.section_id)
            if section:
                interaction_dict["section"] = {
                    "id": section.id,
                    "title": section.title,
                    "order_index": section.order_index
                }
        
        # Get overlay info
        if interaction.overlay_id:
            overlay = session.get(Overlay, interaction.overlay_id)
            if overlay:
                interaction_dict["overlay"] = {
                    "id": overlay.id,
                    "type": overlay.type,
                    "caption": overlay.caption,
                    "time_stamp": overlay.time_stamp
                }
        
        # Get company info
        if interaction.company_id:
            company = session.get(Company, interaction.company_id)
            if company:
                interaction_dict["company"] = {
                    "id": company.id,
                    "name": company.name
                }
        
        result.append(interaction_dict)
    
    return result


@router.get("/training-summary/{training_id}", operation_id="get_training_interaction_summary")
def get_training_interaction_summary(
    training_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Get interaction summary for a specific training"""
    
    # Verify training exists and user has access
    training = session.get(Training, training_id)
    if not training:
        raise HTTPException(404, "Training not found")
    
    if not check_company_access(current_user, training.company_id):
        raise HTTPException(403, "Access denied")
    
    # Get interaction counts by type
    interaction_counts = session.exec(
        select(
            UserInteraction.interaction_type,
            func.count(UserInteraction.id).label('count')
        ).where(UserInteraction.training_id == training_id)
        .group_by(UserInteraction.interaction_type)
    ).all()
    
    # Get unique users count
    unique_users = session.exec(
        select(func.count(func.distinct(UserInteraction.user_id)))
        .where(UserInteraction.training_id == training_id)
    ).first() or 0
    
    # Get unique sessions count
    unique_sessions = session.exec(
        select(func.count(func.distinct(UserInteraction.session_id)))
        .where(UserInteraction.training_id == training_id)
    ).first() or 0
    
    # Get total interactions
    total_interactions = session.exec(
        select(func.count(UserInteraction.id))
        .where(UserInteraction.training_id == training_id)
    ).first() or 0
    
    # Get average response time
    avg_response_time = session.exec(
        select(func.avg(UserInteraction.response_time))
        .where(UserInteraction.training_id == training_id)
    ).first() or 0
    
    # Get success rate
    success_rate = session.exec(
        select(
            func.count(UserInteraction.id).label('total'),
            func.count(UserInteraction.id).filter(UserInteraction.success == True).label('successful')
        ).where(UserInteraction.training_id == training_id)
    ).first()
    
    success_percentage = 0
    if success_rate and success_rate.total > 0:
        success_percentage = (success_rate.successful / success_rate.total) * 100
    
    return {
        "training": {
            "id": training.id,
            "title": training.title,
            "description": training.description
        },
        "summary": {
            "total_interactions": total_interactions,
            "unique_users": unique_users,
            "unique_sessions": unique_sessions,
            "average_response_time": float(avg_response_time) if avg_response_time else 0,
            "success_percentage": round(success_percentage, 2)
        },
        "interaction_types": [
            {"type": count.interaction_type, "count": count.count}
            for count in interaction_counts
        ]
    }


@router.get("/session-summary/{session_id}", operation_id="get_session_interaction_summary")
def get_session_interaction_summary(
    session_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Get interaction summary for a specific session"""
    
    # Verify session exists
    training_session = session.get(TrainingSession, session_id)
    if not training_session:
        raise HTTPException(404, "Session not found")
    
    # Check access to the training
    training = session.get(Training, training_session.training_id)
    if not training:
        raise HTTPException(404, "Training not found")
    
    if not check_company_access(current_user, training.company_id):
        raise HTTPException(403, "Access denied")
    
    # Get interaction counts by type for this session
    interaction_counts = session.exec(
        select(
            UserInteraction.interaction_type,
            func.count(UserInteraction.id).label('count')
        ).where(UserInteraction.session_id == session_id)
        .group_by(UserInteraction.interaction_type)
    ).all()
    
    # Get total interactions for this session
    total_interactions = session.exec(
        select(func.count(UserInteraction.id))
        .where(UserInteraction.session_id == session_id)
    ).first() or 0
    
    # Get average response time for this session
    avg_response_time = session.exec(
        select(func.avg(UserInteraction.response_time))
        .where(UserInteraction.session_id == session_id)
    ).first() or 0
    
    # Get success rate for this session
    success_rate = session.exec(
        select(
            func.count(UserInteraction.id).label('total'),
            func.count(UserInteraction.id).filter(UserInteraction.success == True).label('successful')
        ).where(UserInteraction.session_id == session_id)
    ).first()
    
    success_percentage = 0
    if success_rate and success_rate.total > 0:
        success_percentage = (success_rate.successful / success_rate.total) * 100
    
    return {
        "session": {
            "id": training_session.id,
            "user_id": training_session.user_id,
            "training_id": training_session.training_id,
            "started_at": training_session.started_at,
            "ended_at": training_session.ended_at,
            "status": training_session.status,
            "total_duration": training_session.total_duration,
            "completion_percentage": training_session.completion_percentage
        },
        "summary": {
            "total_interactions": total_interactions,
            "average_response_time": float(avg_response_time) if avg_response_time else 0,
            "success_percentage": round(success_percentage, 2)
        },
        "interaction_types": [
            {"type": count.interaction_type, "count": count.count}
            for count in interaction_counts
        ]
    }


@router.get("/user/{user_id}/trainings", operation_id="get_user_training_interactions")
def get_user_training_interactions(
    user_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Get all training interactions for a specific user"""
    
    # Verify user exists
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    
    # Check access - SuperAdmin herkesi görebilir, Admin sadece kendi şirketini
    if not is_super_admin(current_user):
        if not check_company_access(current_user, user.company_id):
            raise HTTPException(403, "Access denied")
    
    # Get interactions grouped by training
    interactions = session.exec(
        select(UserInteraction)
        .where(UserInteraction.user_id == user_id)
        .order_by(UserInteraction.timestamp.desc())
    ).all()
    
    # Group by training
    training_groups = {}
    for interaction in interactions:
        training_id = interaction.training_id
        if training_id not in training_groups:
            training_groups[training_id] = {
                "training_id": training_id,
                "training": None,
                "sessions": {},
                "total_interactions": 0,
                "first_interaction": None,
                "last_interaction": None
            }
        
        group = training_groups[training_id]
        group["total_interactions"] += 1
        
        if not group["first_interaction"] or interaction.timestamp < group["first_interaction"]:
            group["first_interaction"] = interaction.timestamp
        if not group["last_interaction"] or interaction.timestamp > group["last_interaction"]:
            group["last_interaction"] = interaction.timestamp
        
        # Group by session
        session_id = interaction.session_id
        if session_id not in group["sessions"]:
            group["sessions"][session_id] = {
                "session_id": session_id,
                "session": None,
                "interactions": [],
                "interaction_count": 0
            }
        
        group["sessions"][session_id]["interactions"].append(interaction)
        group["sessions"][session_id]["interaction_count"] += 1
    
    # Enrich with training and session data
    for training_id, group in training_groups.items():
        training = session.get(Training, training_id)
        if training:
            group["training"] = {
                "id": training.id,
                "title": training.title,
                "description": training.description
            }
        
        for session_id, session_group in group["sessions"].items():
            training_session = session.get(TrainingSession, session_id)
            if training_session:
                session_group["session"] = {
                    "id": training_session.id,
                    "started_at": training_session.started_at,
                    "ended_at": training_session.ended_at,
                    "status": training_session.status,
                    "total_duration": training_session.total_duration,
                    "completion_percentage": training_session.completion_percentage
                }
    
    return list(training_groups.values())
