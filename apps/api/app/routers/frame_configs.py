from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List
from datetime import datetime

from ..db import get_session
from ..models import FrameConfig, TrainingSection, GlobalFrameConfig, User, Training
from ..schemas import FrameConfigCreate, FrameConfigUpdate, FrameConfigResponse, GlobalFrameConfigCreate, GlobalFrameConfigUpdate, GlobalFrameConfigResponse
from ..auth import get_current_user, is_super_admin, check_company_access

router = APIRouter(prefix="/frame-configs", tags=["frame-configs"])

# Test endpoint - basit test
@router.get("/test")
def test_endpoint():
    return {"message": "Frame configs router is working!"}

@router.get("/global", response_model=List[GlobalFrameConfigResponse])
def list_global_frame_configs(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """List all global frame configurations accessible to the user"""
    # SuperAdmin tüm global config'leri görebilir
    if is_super_admin(current_user):
        configs = session.exec(
            select(GlobalFrameConfig).order_by(GlobalFrameConfig.name)
        ).all()
    else:
        # Admin sadece kendi şirketinin global config'lerini görebilir
        configs = session.exec(
            select(GlobalFrameConfig)
            .where(GlobalFrameConfig.company_id == current_user.company_id)
            .order_by(GlobalFrameConfig.name)
        ).all()
    
    return configs


@router.get("/sections/{section_id}", response_model=List[FrameConfigResponse])
def list_section_frame_configs(
    section_id: str, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """List all frame configurations for a training section"""
    # Verify section exists
    section = session.get(TrainingSection, section_id)
    if not section:
        raise HTTPException(404, "Training section not found")
    
    # Get training to check organization access
    training = session.get(Training, section.training_id)
    if not training:
        raise HTTPException(404, "Training not found")
    
    # Yetki kontrolü
    if not check_company_access(current_user, training.company_id):
        raise HTTPException(403, "Access denied")
    
    frame_configs = session.exec(
        select(FrameConfig).where(FrameConfig.training_section_id == section_id)
    ).all()
    
    return frame_configs


@router.get("/{frame_config_id}", response_model=FrameConfigResponse)
def get_frame_config(
    frame_config_id: str, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Get a specific frame configuration"""
    frame_config = session.get(FrameConfig, frame_config_id)
    if not frame_config:
        raise HTTPException(404, "Frame configuration not found")
    
    # Get training section and training to check organization access
    section = session.get(TrainingSection, frame_config.training_section_id)
    if not section:
        raise HTTPException(404, "Training section not found")
    
    training = session.get(Training, section.training_id)
    if not training:
        raise HTTPException(404, "Training not found")
    
    # Yetki kontrolü
    if not check_company_access(current_user, training.company_id):
        raise HTTPException(403, "Access denied")
    
    return frame_config


@router.post("/sections/{section_id}", response_model=FrameConfigResponse)
def create_frame_config(
    section_id: str, 
    frame_config: FrameConfigCreate, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Create a new frame configuration for a training section"""
    # Verify section exists
    section = session.get(TrainingSection, section_id)
    if not section:
        raise HTTPException(404, "Training section not found")
    
    # Get training to check organization access
    training = session.get(Training, section.training_id)
    if not training:
        raise HTTPException(404, "Training not found")
    
    # Yetki kontrolü
    if not check_company_access(current_user, training.company_id):
        raise HTTPException(403, "Access denied")
    
    # Admin kullanıcı sadece kendi şirketine frame config ekleyebilir
    if current_user.role == "Admin" and not is_super_admin(current_user):
        if frame_config.company_id and frame_config.company_id != current_user.company_id:
            raise HTTPException(403, "Admin can only create frame configs in their own company")
        if not frame_config.company_id:
            frame_config.company_id = current_user.company_id
    
    # If this is set as default, unset other defaults for this section
    if frame_config.is_default:
        existing_defaults = session.exec(
            select(FrameConfig).where(
                FrameConfig.training_section_id == section_id,
                FrameConfig.is_default == True
            )
        ).all()
        for existing in existing_defaults:
            existing.is_default = False
            existing.updated_at = datetime.utcnow()
    
    new_frame_config = FrameConfig(
        training_section_id=section_id,
        **frame_config.model_dump()
    )
    
    session.add(new_frame_config)
    session.commit()
    session.refresh(new_frame_config)
    
    return new_frame_config


@router.post("/sections/{section_id}/copy-from-global/{global_config_id}", response_model=FrameConfigResponse)
def copy_frame_config_from_global(
    section_id: str,
    global_config_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Copy a global frame configuration to a training section"""
    # Verify section exists
    section = session.get(TrainingSection, section_id)
    if not section:
        raise HTTPException(404, "Training section not found")
    
    # Get training to check organization access
    training = session.get(Training, section.training_id)
    if not training:
        raise HTTPException(404, "Training not found")
    
    # Yetki kontrolü
    if not check_company_access(current_user, training.company_id):
        raise HTTPException(403, "Access denied")
    
    # Verify global config exists
    global_config = session.get(GlobalFrameConfig, global_config_id)
    if not global_config:
        raise HTTPException(404, "Global frame configuration not found")
    
    if not global_config.is_active:
        raise HTTPException(400, "Global frame configuration is not active")
    
    # Create new frame config based on global config
    new_frame_config = FrameConfig(
        training_section_id=section_id,
        name=f"{global_config.name} (Kopya)",
        description=global_config.description,
        object_position_x=global_config.object_position_x,
        object_position_y=global_config.object_position_y,
        scale=global_config.scale,
        transform_origin_x=global_config.transform_origin_x,
        transform_origin_y=global_config.transform_origin_y,
        transition_duration=global_config.transition_duration,
        transition_easing=global_config.transition_easing,
        is_default=False,
        global_config_id=global_config.id,
        company_id=training.company_id
    )
    
    session.add(new_frame_config)
    session.commit()
    session.refresh(new_frame_config)
    
    return new_frame_config


@router.put("/{frame_config_id}", response_model=FrameConfigResponse)
def update_frame_config(
    frame_config_id: str,
    frame_config: FrameConfigUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Update an existing frame configuration"""
    existing_config = session.get(FrameConfig, frame_config_id)
    if not existing_config:
        raise HTTPException(404, "Frame configuration not found")
    
    # Get training section and training to check organization access
    section = session.get(TrainingSection, existing_config.training_section_id)
    if not section:
        raise HTTPException(404, "Training section not found")
    
    training = session.get(Training, section.training_id)
    if not training:
        raise HTTPException(404, "Training not found")
    
    # Yetki kontrolü
    if not check_company_access(current_user, training.company_id):
        raise HTTPException(403, "Access denied")
    
    # Admin kullanıcı sadece kendi şirketindeki frame config'leri güncelleyebilir
    if current_user.role == "Admin" and not is_super_admin(current_user):
        if frame_config.company_id and frame_config.company_id != current_user.company_id:
            raise HTTPException(403, "Admin can only update frame configs in their own company")
    
    # If this is set as default, unset other defaults for this section
    if frame_config.is_default:
        existing_defaults = session.exec(
            select(FrameConfig).where(
                FrameConfig.training_section_id == existing_config.training_section_id,
                FrameConfig.is_default == True,
                FrameConfig.id != frame_config_id
            )
        ).all()
        for existing in existing_defaults:
            existing.is_default = False
            existing.updated_at = datetime.utcnow()
    
    # Update fields
    for field, value in frame_config.model_dump(exclude_unset=True).items():
        setattr(existing_config, field, value)
    
    existing_config.updated_at = datetime.utcnow()
    
    session.add(existing_config)
    session.commit()
    session.refresh(existing_config)
    
    return existing_config


@router.delete("/{frame_config_id}")
def delete_frame_config(
    frame_config_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Delete a frame configuration"""
    frame_config = session.get(FrameConfig, frame_config_id)
    if not frame_config:
        raise HTTPException(404, "Frame configuration not found")
    
    # Get training section and training to check organization access
    section = session.get(TrainingSection, frame_config.training_section_id)
    if not section:
        raise HTTPException(404, "Training section not found")
    
    training = session.get(Training, section.training_id)
    if not training:
        raise HTTPException(404, "Training not found")
    
    # Yetki kontrolü
    if not check_company_access(current_user, training.company_id):
        raise HTTPException(403, "Access denied")
    
    # Sadece admin ve süper admin kullanıcılar frame config silebilir
    if current_user.role not in ["Admin", "SuperAdmin"]:
        raise HTTPException(403, "Only admins can delete frame configurations")
    
    session.delete(frame_config)
    session.commit()
    
    return {"message": "Frame configuration deleted successfully"}


# Global Frame Config endpoints
@router.get("/test-global-configs", response_model=List[GlobalFrameConfigResponse])
def test_global_frame_configs(
    session: Session = Depends(get_session)
):
    """Test endpoint for global frame configurations - NO AUTH"""
    print("🔍 TEST: List global frame configs - NO AUTH")
    
    # Test: Tüm global frame config'leri getir
    print("✅ TEST: Getting all global frame configs (no auth)")
    configs = session.exec(select(GlobalFrameConfig).order_by(GlobalFrameConfig.name)).all()
    
    print(f"📋 TEST: Found {len(configs)} global frame configs")
    for config in configs:
        print(f"  - {config.name} (ID: {config.id}, Company: {config.company_id})")
    
    return configs


@router.get("/global", response_model=List[GlobalFrameConfigResponse])
def list_global_frame_configs(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """List all global frame configurations accessible to the user"""
    # SuperAdmin tüm global config'leri görebilir
    if is_super_admin(current_user):
        configs = session.exec(
            select(GlobalFrameConfig).order_by(GlobalFrameConfig.name)
        ).all()
    else:
        # Admin sadece kendi şirketinin global config'lerini görebilir
        configs = session.exec(
            select(GlobalFrameConfig)
            .where(GlobalFrameConfig.company_id == current_user.company_id)
            .order_by(GlobalFrameConfig.name)
        ).all()
    
    return configs


@router.get("/global/{global_config_id}", response_model=GlobalFrameConfigResponse)
def get_global_frame_config(
    global_config_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Get a specific global frame configuration"""
    global_config = session.get(GlobalFrameConfig, global_config_id)
    if not global_config:
        raise HTTPException(404, "Global frame configuration not found")
    
    # Yetki kontrolü
    if not check_company_access(current_user, global_config.company_id):
        raise HTTPException(403, "Access denied")
    
    return global_config


@router.post("/global", response_model=GlobalFrameConfigResponse)
def create_global_frame_config(
    global_config: GlobalFrameConfigCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Create a new global frame configuration"""
    # Admin ve süper admin kullanıcılar global frame config oluşturabilir
    if current_user.role not in ["Admin", "SuperAdmin"]:
        raise HTTPException(403, "Only admins can create global frame configurations")
    
    # Admin kullanıcı sadece kendi şirketine global frame config ekleyebilir
    if current_user.role == "Admin" and not is_super_admin(current_user):
        if global_config.company_id and global_config.company_id != current_user.company_id:
            raise HTTPException(403, "Admin can only create global frame configs in their own company")
        if not global_config.company_id:
            global_config.company_id = current_user.company_id
    
    new_global_config = GlobalFrameConfig(**global_config.model_dump())
    
    session.add(new_global_config)
    session.commit()
    session.refresh(new_global_config)
    
    return new_global_config


@router.put("/global/{global_config_id}", response_model=GlobalFrameConfigResponse)
def update_global_frame_config(
    global_config_id: str,
    global_config: GlobalFrameConfigUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Update an existing global frame configuration"""
    existing_config = session.get(GlobalFrameConfig, global_config_id)
    if not existing_config:
        raise HTTPException(404, "Global frame configuration not found")
    
    # Yetki kontrolü
    if not check_company_access(current_user, existing_config.company_id):
        raise HTTPException(403, "Access denied")
    
    # Admin kullanıcı sadece kendi şirketindeki global frame config'leri güncelleyebilir
    if current_user.role == "Admin" and not is_super_admin(current_user):
        if global_config.company_id and global_config.company_id != current_user.company_id:
            raise HTTPException(403, "Admin can only update global frame configs in their own company")
    
    # Update fields
    for field, value in global_config.model_dump(exclude_unset=True).items():
        setattr(existing_config, field, value)
    
    existing_config.updated_at = datetime.utcnow()
    
    session.add(existing_config)
    session.commit()
    session.refresh(existing_config)
    
    return existing_config


@router.delete("/global/{global_config_id}")
def delete_global_frame_config(
    global_config_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Delete a global frame configuration"""
    global_config = session.get(GlobalFrameConfig, global_config_id)
    if not global_config:
        raise HTTPException(404, "Global frame configuration not found")
    
    # Yetki kontrolü
    if not check_company_access(current_user, global_config.company_id):
        raise HTTPException(403, "Access denied")
    
    # Sadece admin ve süper admin kullanıcılar global frame config silebilir
    if current_user.role not in ["Admin", "SuperAdmin"]:
        raise HTTPException(403, "Only admins can delete global frame configurations")
    
    session.delete(global_config)
    session.commit()
    
    return {"message": "Global frame configuration deleted successfully"}
