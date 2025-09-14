from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from datetime import datetime
import httpx
import os

from app.db import get_session
from app.auth import get_current_user
from app.models import Avatar, User, Company
from app.schemas import AvatarCreate, AvatarUpdate, AvatarResponse

router = APIRouter(prefix="/avatars", tags=["avatars"])


@router.get("/", response_model=List[AvatarResponse])
async def get_avatars(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Get all avatars accessible to the current user"""
    if current_user.role == "SuperAdmin":
        # SuperAdmin can see all avatars
        statement = select(Avatar)
    elif current_user.role == "Admin":
        # Admin can see company avatars and default avatars
        statement = select(Avatar).where(
            (Avatar.company_id == current_user.company_id) | 
            (Avatar.is_default == True)
        )
    else:
        # Regular users can only see default avatars
        statement = select(Avatar).where(Avatar.is_default == True)
    
    avatars = session.exec(statement).all()
    return avatars


@router.get("/{avatar_id}", response_model=AvatarResponse)
async def get_avatar(
    avatar_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Get a specific avatar by ID"""
    avatar = session.get(Avatar, avatar_id)
    if not avatar:
        raise HTTPException(status_code=404, detail="Avatar not found")
    
    # Check permissions
    if current_user.role == "User" and not avatar.is_default:
        raise HTTPException(status_code=403, detail="Access denied")
    elif current_user.role == "Admin" and avatar.company_id != current_user.company_id and not avatar.is_default:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return avatar


@router.post("/", response_model=AvatarResponse)
async def create_avatar(
    avatar_data: AvatarCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Create a new avatar"""
    if current_user.role not in ["SuperAdmin", "Admin"]:
        raise HTTPException(status_code=403, detail="Only SuperAdmin and Admin can create avatars")
    
    # Check if name already exists in the same company
    existing_avatar = session.exec(
        select(Avatar).where(
            Avatar.name == avatar_data.name,
            Avatar.company_id == current_user.company_id
        )
    ).first()
    
    if existing_avatar:
        raise HTTPException(status_code=400, detail="Avatar name already exists in your company")
    
    # Create new avatar
    avatar = Avatar(
        name=avatar_data.name,
        personality=avatar_data.personality,
        elevenlabs_voice_id=avatar_data.elevenlabs_voice_id,
        description=avatar_data.description,
        company_id=current_user.company_id if current_user.role == "Admin" else avatar_data.company_id,
        is_default=avatar_data.is_default if current_user.role == "SuperAdmin" else False
    )
    
    session.add(avatar)
    session.commit()
    session.refresh(avatar)
    
    return avatar


@router.put("/{avatar_id}", response_model=AvatarResponse)
async def update_avatar(
    avatar_id: str,
    avatar_data: AvatarUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Update an existing avatar"""
    avatar = session.get(Avatar, avatar_id)
    if not avatar:
        raise HTTPException(status_code=404, detail="Avatar not found")
    
    # Check permissions
    if current_user.role == "User":
        raise HTTPException(status_code=403, detail="Users cannot update avatars")
    elif current_user.role == "Admin" and avatar.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="Access denied")
    elif current_user.role == "SuperAdmin" and avatar.is_default and not avatar_data.is_default:
        # SuperAdmin can modify default avatars
        pass
    
    # Check if name already exists in the same company (excluding current avatar)
    if avatar_data.name and avatar_data.name != avatar.name:
        existing_avatar = session.exec(
            select(Avatar).where(
                Avatar.name == avatar_data.name,
                Avatar.company_id == avatar.company_id,
                Avatar.id != avatar_id
            )
        ).first()
        
        if existing_avatar:
            raise HTTPException(status_code=400, detail="Avatar name already exists in your company")
    
    # Update avatar fields
    update_data = avatar_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(avatar, field, value)
    
    avatar.updated_at = datetime.utcnow()
    
    session.add(avatar)
    session.commit()
    session.refresh(avatar)
    
    return avatar


@router.delete("/{avatar_id}")
async def delete_avatar(
    avatar_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Delete an avatar"""
    avatar = session.get(Avatar, avatar_id)
    if not avatar:
        raise HTTPException(status_code=404, detail="Avatar not found")
    
    # Check permissions
    if current_user.role == "User":
        raise HTTPException(status_code=403, detail="Users cannot delete avatars")
    elif current_user.role == "Admin" and avatar.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="Access denied")
    elif avatar.is_default and current_user.role != "SuperAdmin":
        raise HTTPException(status_code=403, detail="Only SuperAdmin can delete default avatars")
    
    # Check if avatar is being used in any trainings
    from app.models import Training
    training_using_avatar = session.exec(
        select(Training).where(Training.avatar_id == avatar_id)
    ).first()
    
    if training_using_avatar:
        raise HTTPException(
            status_code=400, 
            detail=f"Avatar is being used in training '{training_using_avatar.title}'. Please remove it from the training first."
        )
    
    session.delete(avatar)
    session.commit()
    
    return {"message": "Avatar deleted successfully"}


@router.post("/import")
async def import_avatars(
    avatars_data: List[AvatarCreate],
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Import multiple avatars"""
    if current_user.role not in ["SuperAdmin", "Admin"]:
        raise HTTPException(status_code=403, detail="Only SuperAdmin and Admin can import avatars")
    
    imported_avatars = []
    errors = []
    
    for i, avatar_data in enumerate(avatars_data):
        try:
            # Check if avatar already exists
            existing_avatar = session.exec(
                select(Avatar).where(
                    Avatar.name == avatar_data.name,
                    Avatar.company_id == current_user.company_id
                )
            ).first()
            
            if existing_avatar:
                errors.append(f"Row {i+1}: Avatar name '{avatar_data.name}' already exists")
                continue
            
            # Create new avatar
            avatar = Avatar(
                name=avatar_data.name,
                personality=avatar_data.personality,
                elevenlabs_voice_id=avatar_data.elevenlabs_voice_id,
                description=avatar_data.description,
                company_id=current_user.company_id if current_user.role == "Admin" else avatar_data.company_id,
                is_default=avatar_data.is_default if current_user.role == "SuperAdmin" else False
            )
            
            session.add(avatar)
            imported_avatars.append(avatar)
            
        except Exception as e:
            errors.append(f"Row {i+1}: {str(e)}")
    
    if imported_avatars:
        session.commit()
        for avatar in imported_avatars:
            session.refresh(avatar)
    
    return {
        "imported_count": len(imported_avatars),
        "errors": errors,
        "avatars": imported_avatars
    }


@router.get("/export/company")
async def export_company_avatars(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Export company avatars"""
    if current_user.role not in ["SuperAdmin", "Admin"]:
        raise HTTPException(status_code=403, detail="Only SuperAdmin and Admin can export avatars")
    
    if current_user.role == "SuperAdmin":
        # SuperAdmin can export all avatars
        avatars = session.exec(select(Avatar)).all()
    else:
        # Admin can export company avatars
        avatars = session.exec(
            select(Avatar).where(Avatar.company_id == current_user.company_id)
        ).all()
    
    return {
        "avatars": avatars,
        "exported_count": len(avatars),
        "exported_at": datetime.utcnow().isoformat()
    }


@router.get("/elevenlabs/voices")
async def get_elevenlabs_voices(
    current_user: User = Depends(get_current_user)
):
    """Get available ElevenLabs voices"""
    if current_user.role not in ["SuperAdmin", "Admin"]:
        raise HTTPException(status_code=403, detail="Only SuperAdmin and Admin can access ElevenLabs voices")
    
    elevenlabs_api_key = os.getenv("ELEVENLABS_API_KEY")
    if not elevenlabs_api_key:
        raise HTTPException(status_code=500, detail="ElevenLabs API key not configured")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.elevenlabs.io/v1/voices",
                headers={
                    "xi-api-key": elevenlabs_api_key,
                    "Accept": "application/json"
                }
            )
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"ElevenLabs API error: {response.text}"
                )
            
            voices_data = response.json()
            voices = voices_data.get("voices", [])
            
            # Format voices for frontend
            formatted_voices = []
            for voice in voices:
                formatted_voices.append({
                    "voice_id": voice.get("voice_id"),
                    "name": voice.get("name"),
                    "category": voice.get("category", "Unknown"),
                    "description": voice.get("description", ""),
                    "labels": voice.get("labels", {}),
                    "preview_url": voice.get("preview_url", "")
                })
            
            return {
                "voices": formatted_voices,
                "total_count": len(formatted_voices)
            }
            
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Failed to connect to ElevenLabs API: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching voices: {str(e)}")


@router.post("/elevenlabs/test-voice")
async def test_elevenlabs_voice(
    voice_id: str,
    text: str = "Merhaba! Bu bir ses denemesidir.",
    current_user: User = Depends(get_current_user)
):
    """Test a voice by generating speech from text"""
    if current_user.role not in ["SuperAdmin", "Admin"]:
        raise HTTPException(status_code=403, detail="Only SuperAdmin and Admin can test voices")
    
    elevenlabs_api_key = os.getenv("ELEVENLABS_API_KEY")
    if not elevenlabs_api_key:
        raise HTTPException(status_code=500, detail="ElevenLabs API key not configured")
    
    if not voice_id:
        raise HTTPException(status_code=400, detail="Voice ID is required")
    
    if not text or len(text.strip()) == 0:
        raise HTTPException(status_code=400, detail="Text is required")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
                headers={
                    "xi-api-key": elevenlabs_api_key,
                    "Content-Type": "application/json",
                    "Accept": "audio/mpeg"
                },
                json={
                    "text": text,
                    "model_id": "eleven_multilingual_v2",
                    "voice_settings": {
                        "stability": 0.5,
                        "similarity_boost": 0.5
                    }
                }
            )
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"ElevenLabs TTS error: {response.text}"
                )
            
            # Return the audio data as base64
            import base64
            audio_base64 = base64.b64encode(response.content).decode('utf-8')
            
            return {
                "success": True,
                "audio_data": audio_base64,
                "voice_id": voice_id,
                "text": text,
                "content_type": "audio/mpeg"
            }
            
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Failed to connect to ElevenLabs API: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating speech: {str(e)}")
