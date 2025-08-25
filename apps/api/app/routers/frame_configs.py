from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List
from datetime import datetime

from ..db import get_session
from ..models import FrameConfig, TrainingSection, GlobalFrameConfig
from ..schemas import FrameConfigCreate, FrameConfigUpdate, FrameConfigResponse, GlobalFrameConfigCreate, GlobalFrameConfigUpdate, GlobalFrameConfigResponse

router = APIRouter(prefix="/frame-configs", tags=["frame-configs"])


@router.get("/sections/{section_id}", response_model=List[FrameConfigResponse])
def list_section_frame_configs(section_id: str, session: Session = Depends(get_session)):
    """List all frame configurations for a training section"""
    # Verify section exists
    section = session.get(TrainingSection, section_id)
    if not section:
        raise HTTPException(404, "Training section not found")
    
    frame_configs = session.exec(
        select(FrameConfig).where(FrameConfig.training_section_id == section_id)
    ).all()
    
    return frame_configs


@router.get("/{frame_config_id}", response_model=FrameConfigResponse)
def get_frame_config(frame_config_id: str, session: Session = Depends(get_session)):
    """Get a specific frame configuration"""
    frame_config = session.get(FrameConfig, frame_config_id)
    if not frame_config:
        raise HTTPException(404, "Frame configuration not found")
    
    return frame_config


@router.post("/sections/{section_id}", response_model=FrameConfigResponse)
def create_frame_config(
    section_id: str, 
    frame_config: FrameConfigCreate, 
    session: Session = Depends(get_session)
):
    """Create a new frame configuration for a training section"""
    # Verify section exists
    section = session.get(TrainingSection, section_id)
    if not section:
        raise HTTPException(404, "Training section not found")
    
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
    session: Session = Depends(get_session)
):
    """Copy a global frame configuration to a training section"""
    # Verify section exists
    section = session.get(TrainingSection, section_id)
    if not section:
        raise HTTPException(404, "Training section not found")
    
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
        global_config_id=global_config.id
    )
    
    session.add(new_frame_config)
    session.commit()
    session.refresh(new_frame_config)
    
    return new_frame_config


@router.put("/{frame_config_id}", response_model=FrameConfigResponse)
def update_frame_config(
    frame_config_id: str, 
    frame_config_update: FrameConfigUpdate, 
    session: Session = Depends(get_session)
):
    """Update a frame configuration"""
    existing_config = session.get(FrameConfig, frame_config_id)
    if not existing_config:
        raise HTTPException(404, "Frame configuration not found")
    
    update_data = frame_config_update.model_dump(exclude_unset=True)
    
    # If this is set as default, unset other defaults for this section
    if update_data.get('is_default', False):
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
    for field, value in update_data.items():
        setattr(existing_config, field, value)
    
    existing_config.updated_at = datetime.utcnow()
    
    session.add(existing_config)
    session.commit()
    session.refresh(existing_config)
    
    return existing_config


@router.delete("/{frame_config_id}")
def delete_frame_config(frame_config_id: str, session: Session = Depends(get_session)):
    """Delete a frame configuration"""
    frame_config = session.get(FrameConfig, frame_config_id)
    if not frame_config:
        raise HTTPException(404, "Frame configuration not found")
    
    session.delete(frame_config)
    session.commit()
    
    return {"ok": True}


# Global Frame Configurations endpoints
@router.get("/global", response_model=List[GlobalFrameConfigResponse])
def list_global_frame_configs(session: Session = Depends(get_session)):
    """List all global frame configurations"""
    global_configs = session.exec(
        select(GlobalFrameConfig).where(GlobalFrameConfig.is_active == True)
    ).all()
    
    return global_configs


@router.get("/global/{global_config_id}", response_model=GlobalFrameConfigResponse)
def get_global_frame_config(global_config_id: str, session: Session = Depends(get_session)):
    """Get a specific global frame configuration"""
    global_config = session.get(GlobalFrameConfig, global_config_id)
    if not global_config:
        raise HTTPException(404, "Global frame configuration not found")
    
    return global_config


@router.post("/global", response_model=GlobalFrameConfigResponse)
def create_global_frame_config(
    global_config: GlobalFrameConfigCreate, 
    session: Session = Depends(get_session)
):
    """Create a new global frame configuration"""
    new_global_config = GlobalFrameConfig(**global_config.model_dump())
    
    session.add(new_global_config)
    session.commit()
    session.refresh(new_global_config)
    
    return new_global_config


@router.put("/global/{global_config_id}", response_model=GlobalFrameConfigResponse)
def update_global_frame_config(
    global_config_id: str, 
    global_config_update: GlobalFrameConfigUpdate, 
    session: Session = Depends(get_session)
):
    """Update a global frame configuration"""
    existing_config = session.get(GlobalFrameConfig, global_config_id)
    if not existing_config:
        raise HTTPException(404, "Global frame configuration not found")
    
    update_data = global_config_update.model_dump(exclude_unset=True)
    
    # Update fields
    for field, value in update_data.items():
        setattr(existing_config, field, value)
    
    existing_config.updated_at = datetime.utcnow()
    
    session.add(existing_config)
    session.commit()
    session.refresh(existing_config)
    
    return existing_config


@router.delete("/global/{global_config_id}")
def delete_global_frame_config(global_config_id: str, session: Session = Depends(get_session)):
    """Delete a global frame configuration (soft delete by setting is_active to False)"""
    global_config = session.get(GlobalFrameConfig, global_config_id)
    if not global_config:
        raise HTTPException(404, "Global frame configuration not found")
    
    global_config.is_active = False
    global_config.updated_at = datetime.utcnow()
    
    session.add(global_config)
    session.commit()
    
    return {"ok": True}
