"""
Import endpoints for companies to import default content from system company
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List
from app.db import get_session
from app.models import User, Company, Style, FrameConfig, Asset, Training, CompanyTraining, TrainingSection, Overlay, Avatar
from app.auth import get_current_user, is_admin, is_super_admin
from app.schemas import StyleResponse, FrameConfigResponse

router = APIRouter(prefix="/imports", tags=["imports"])


def get_system_company(session: Session) -> Company:
    """Get the system company"""
    system_company = session.exec(
        select(Company).where(Company.is_system == True)
    ).first()
    
    if not system_company:
        raise HTTPException(404, "System company not found")
    
    return system_company


@router.get("/styles", response_model=List[StyleResponse])
async def get_system_styles(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Get all styles from system company that can be imported"""
    if not is_admin(current_user):
        raise HTTPException(403, "Only admins can import content")
    
    system_company = get_system_company(session)
    
    # Get all styles from system company
    styles = session.exec(
        select(Style).where(Style.company_id == system_company.id)
    ).all()
    
    return [StyleResponse.model_validate(style.model_dump()) for style in styles]


@router.post("/styles/{style_id}")
async def import_style(
    style_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Import a specific style from system company to current user's company"""
    if not is_admin(current_user):
        raise HTTPException(403, "Only admins can import content")
    
    if not current_user.company_id:
        raise HTTPException(400, "User must be associated with a company")
    
    system_company = get_system_company(session)
    
    # Get the style from system company
    system_style = session.get(Style, style_id)
    if not system_style:
        raise HTTPException(404, "Style not found")
    
    if system_style.company_id != system_company.id:
        raise HTTPException(400, "Style is not from system company")
    
    # Check if style already exists in user's company
    existing_style = session.exec(
        select(Style).where(
            Style.name == system_style.name,
            Style.company_id == current_user.company_id
        )
    ).first()
    
    if existing_style:
        raise HTTPException(409, "Style with this name already exists in your company")
    
    # Create new style for user's company
    new_style = Style(
        name=system_style.name,
        description=system_style.description,
        style_json=system_style.style_json,
        company_id=current_user.company_id,
        created_by=current_user.id,
        is_default=False
    )
    
    session.add(new_style)
    session.commit()
    session.refresh(new_style)
    
    return {
        "message": f"Style '{system_style.name}' imported successfully",
        "imported_style": StyleResponse.model_validate(new_style.model_dump())
    }


@router.post("/styles/bulk")
async def import_all_styles(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Import all styles from system company to current user's company"""
    if not is_admin(current_user):
        raise HTTPException(403, "Only admins can import content")
    
    if not current_user.company_id:
        raise HTTPException(400, "User must be associated with a company")
    
    system_company = get_system_company(session)
    
    # Get all styles from system company
    system_styles = session.exec(
        select(Style).where(Style.company_id == system_company.id)
    ).all()
    
    imported_count = 0
    skipped_count = 0
    imported_styles = []
    
    for system_style in system_styles:
        # Check if style already exists in user's company
        existing_style = session.exec(
            select(Style).where(
                Style.name == system_style.name,
                Style.company_id == current_user.company_id
            )
        ).first()
        
        if existing_style:
            skipped_count += 1
            continue
        
        # Create new style for user's company
        new_style = Style(
            name=system_style.name,
            description=system_style.description,
            style_json=system_style.style_json,
            company_id=current_user.company_id,
            created_by=current_user.id,
            is_default=False
        )
        
        session.add(new_style)
        imported_count += 1
        imported_styles.append(new_style)
    
    session.commit()
    
    # Refresh all imported styles
    for style in imported_styles:
        session.refresh(style)
    
    return {
        "message": f"Import completed: {imported_count} styles imported, {skipped_count} skipped",
        "imported_count": imported_count,
        "skipped_count": skipped_count,
        "imported_styles": [StyleResponse.model_validate(style.model_dump()) for style in imported_styles]
    }


@router.get("/frame-configs", response_model=List[FrameConfigResponse])
async def get_system_frame_configs(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Get all frame configs from system company that can be imported"""
    if not is_admin(current_user):
        raise HTTPException(403, "Only admins can import content")
    
    system_company = get_system_company(session)
    
    # Get all frame configs from system company
    frame_configs = session.exec(
        select(FrameConfig).where(FrameConfig.company_id == system_company.id)
    ).all()
    
    return [FrameConfigResponse.model_validate(config.model_dump()) for config in frame_configs]


@router.post("/frame-configs/{config_id}")
async def import_frame_config(
    config_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Import a specific frame config from system company to current user's company"""
    if not is_admin(current_user):
        raise HTTPException(403, "Only admins can import content")
    
    if not current_user.company_id:
        raise HTTPException(400, "User must be associated with a company")
    
    system_company = get_system_company(session)
    
    # Get the frame config from system company
    system_config = session.get(FrameConfig, config_id)
    if not system_config:
        raise HTTPException(404, "Frame config not found")
    
    if system_config.company_id != system_company.id:
        raise HTTPException(400, "Frame config is not from system company")
    
    # Check if config already exists in user's company
    existing_config = session.exec(
        select(FrameConfig).where(
            FrameConfig.name == system_config.name,
            FrameConfig.company_id == current_user.company_id
        )
    ).first()
    
    if existing_config:
        raise HTTPException(409, "Frame config with this name already exists in your company")
    
    # Create new frame config for user's company
    new_config = FrameConfig(
        name=system_config.name,
        description=system_config.description,
        object_position_x=system_config.object_position_x,
        object_position_y=system_config.object_position_y,
        scale=system_config.scale,
        transform_origin_x=system_config.transform_origin_x,
        transform_origin_y=system_config.transform_origin_y,
        transition_duration=system_config.transition_duration,
        transition_easing=system_config.transition_easing,
        is_default=False,
        company_id=current_user.company_id,
        created_by=current_user.id
    )
    
    session.add(new_config)
    session.commit()
    session.refresh(new_config)
    
    return {
        "message": f"Frame config '{system_config.name}' imported successfully",
        "imported_config": FrameConfigResponse.model_validate(new_config.model_dump())
    }


@router.get("/available-content")
async def get_available_content(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Get summary of available content in system company"""
    if not is_admin(current_user) and not is_super_admin(current_user):
        raise HTTPException(403, "Only admins can view available content")
    
    system_company = get_system_company(session)
    
    # Count available content
    styles_count = session.exec(
        select(Style).where(Style.company_id == system_company.id)
    ).count()
    
    frame_configs_count = session.exec(
        select(FrameConfig).where(FrameConfig.company_id == system_company.id)
    ).count()
    
    assets_count = session.exec(
        select(Asset).where(Asset.company_id == system_company.id)
    ).count()
    
    trainings_count = session.exec(
        select(Training).where(Training.company_id == system_company.id)
    ).count()
    
    return {
        "system_company": {
            "id": system_company.id,
            "name": system_company.name,
            "description": system_company.description
        },
        "available_content": {
            "styles": styles_count,
            "frame_configs": frame_configs_count,
            "assets": assets_count,
            "trainings": trainings_count
        }
    }


@router.get("/assigned-trainings")
async def get_assigned_trainings(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Get all trainings assigned to current user's company that can be imported"""
    if not is_admin(current_user):
        raise HTTPException(403, "Only admins can import content")
    
    if not current_user.company_id:
        raise HTTPException(400, "User must be associated with a company")
    
    # Get all company trainings for current user's company
    company_trainings = session.exec(
        select(CompanyTraining).where(CompanyTraining.company_id == current_user.company_id)
    ).all()
    
    assigned_trainings = []
    for ct in company_trainings:
        training = session.get(Training, ct.training_id)
        if training:
            assigned_trainings.append({
                "id": training.id,
                "title": training.title,
                "description": training.description,
                "company_training_id": ct.id,
                "expectations": ct.expectations,
                "access_code": ct.access_code
            })
    
    return assigned_trainings


def copy_style_to_company(source_style: Style, target_company_id: str, current_user_id: str, session: Session) -> Style:
    """Copy a style to target company"""
    # Check if style with same name already exists in target company
    existing_style = session.exec(
        select(Style).where(
            Style.name == source_style.name,
            Style.company_id == target_company_id
        )
    ).first()
    
    if existing_style:
        return existing_style
    
    # Create new style for target company
    new_style = Style(
        name=source_style.name,
        description=source_style.description,
        style_json=source_style.style_json,
        company_id=target_company_id,
        created_by=current_user_id,
        is_default=False
    )
    
    session.add(new_style)
    session.commit()
    session.refresh(new_style)
    return new_style


def copy_frame_config_to_company(source_config: FrameConfig, target_company_id: str, current_user_id: str, session: Session) -> FrameConfig:
    """Copy a frame config to target company"""
    # Check if frame config with same name already exists in target company
    existing_config = session.exec(
        select(FrameConfig).where(
            FrameConfig.name == source_config.name,
            FrameConfig.company_id == target_company_id
        )
    ).first()
    
    if existing_config:
        return existing_config
    
    # Create new frame config for target company
    new_config = FrameConfig(
        name=source_config.name,
        description=source_config.description,
        object_position_x=source_config.object_position_x,
        object_position_y=source_config.object_position_y,
        scale=source_config.scale,
        transform_origin_x=source_config.transform_origin_x,
        transform_origin_y=source_config.transform_origin_y,
        transition_duration=source_config.transition_duration,
        transition_easing=source_config.transition_easing,
        is_default=False,
        company_id=target_company_id,
        created_by=current_user_id
    )
    
    session.add(new_config)
    session.commit()
    session.refresh(new_config)
    return new_config


def copy_avatar_to_company(source_avatar: Avatar, target_company_id: str, current_user_id: str, session: Session) -> Avatar:
    """Copy an avatar to target company"""
    # Check if avatar with same name already exists in target company
    existing_avatar = session.exec(
        select(Avatar).where(
            Avatar.name == source_avatar.name,
            Avatar.company_id == target_company_id
        )
    ).first()
    
    if existing_avatar:
        return existing_avatar
    
    # Create new avatar for target company
    new_avatar = Avatar(
        name=source_avatar.name,
        description=source_avatar.description,
        avatar_json=source_avatar.avatar_json,
        company_id=target_company_id,
        created_by=current_user_id
    )
    
    session.add(new_avatar)
    session.commit()
    session.refresh(new_avatar)
    return new_avatar


@router.post("/trainings/{training_id}")
async def import_assigned_training(
    training_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Import an assigned training to current user's company as a new training with all dependencies"""
    if not is_admin(current_user):
        raise HTTPException(403, "Only admins can import content")
    
    if not current_user.company_id:
        raise HTTPException(400, "User must be associated with a company")
    
    # Check if this training is assigned to user's company
    company_training = session.exec(
        select(CompanyTraining).where(
            CompanyTraining.company_id == current_user.company_id,
            CompanyTraining.training_id == training_id
        )
    ).first()
    
    if not company_training:
        raise HTTPException(404, "Training is not assigned to your company")
    
    # Get the source training
    source_training = session.get(Training, training_id)
    if not source_training:
        raise HTTPException(404, "Source training not found")
    
    # Check if training with same title already exists in company
    existing_training = session.exec(
        select(Training).where(
            Training.title == source_training.title,
            Training.company_id == current_user.company_id
        )
    ).first()
    
    if existing_training:
        raise HTTPException(409, "Training with this title already exists in your company")
    
    # Copy avatar if exists
    new_avatar_id = None
    if source_training.avatar_id:
        source_avatar = session.get(Avatar, source_training.avatar_id)
        if source_avatar:
            new_avatar = copy_avatar_to_company(source_avatar, current_user.company_id, current_user.id, session)
            new_avatar_id = new_avatar.id
    
    # Create new training for user's company
    new_training = Training(
        title=source_training.title,
        description=source_training.description,
        flow_id=source_training.flow_id,
        ai_flow=source_training.ai_flow,
        avatar_id=new_avatar_id,
        company_id=current_user.company_id,
        created_by=current_user.id
    )
    
    session.add(new_training)
    session.commit()
    session.refresh(new_training)
    
    # Copy training sections
    source_sections = session.exec(
        select(TrainingSection).where(TrainingSection.training_id == training_id)
    ).all()
    
    sections_copied = 0
    overlays_copied = 0
    assets_copied = 0
    styles_copied = 0
    frame_configs_copied = 0
    avatars_copied = 0
    
    # Track copied resources to avoid duplicates
    copied_styles = {}  # source_id -> new_id
    copied_frame_configs = {}  # source_id -> new_id
    copied_avatars = {}  # source_id -> new_id
    
    for section in source_sections:
        # Create new section
        new_section = TrainingSection(
            training_id=new_training.id,
            title=section.title,
            description=section.description,
            script=section.script,
            duration=section.duration,
            video_object=section.video_object,
            asset_id=section.asset_id,
            order_index=section.order_index,
            type=section.type,
            agent_id=section.agent_id,
            language=section.language,
            target_audience=section.target_audience,
            audio_asset_id=section.audio_asset_id,
            created_by=current_user.id
        )
        
        session.add(new_section)
        session.commit()
        session.refresh(new_section)
        sections_copied += 1
        
        # Copy overlays for this section
        source_overlays = session.exec(
            select(Overlay).where(Overlay.training_section_id == section.id)
        ).all()
        
        for overlay in source_overlays:
            # Copy style if referenced
            new_style_id = None
            if overlay.style_id:
                if overlay.style_id not in copied_styles:
                    source_style = session.get(Style, overlay.style_id)
                    if source_style:
                        new_style = copy_style_to_company(source_style, current_user.company_id, current_user.id, session)
                        copied_styles[overlay.style_id] = new_style.id
                        styles_copied += 1
                new_style_id = copied_styles.get(overlay.style_id)
            
            # Copy icon style if referenced
            new_icon_style_id = None
            if overlay.icon_style_id:
                if overlay.icon_style_id not in copied_styles:
                    source_icon_style = session.get(Style, overlay.icon_style_id)
                    if source_icon_style:
                        new_icon_style = copy_style_to_company(source_icon_style, current_user.company_id, current_user.id, session)
                        copied_styles[overlay.icon_style_id] = new_icon_style.id
                        styles_copied += 1
                new_icon_style_id = copied_styles.get(overlay.icon_style_id)
            
            # Copy frame config if referenced
            new_frame_config_id = None
            if overlay.frame_config_id:
                if overlay.frame_config_id not in copied_frame_configs:
                    source_frame_config = session.get(FrameConfig, overlay.frame_config_id)
                    if source_frame_config:
                        new_frame_config = copy_frame_config_to_company(source_frame_config, current_user.company_id, current_user.id, session)
                        copied_frame_configs[overlay.frame_config_id] = new_frame_config.id
                        frame_configs_copied += 1
                new_frame_config_id = copied_frame_configs.get(overlay.frame_config_id)
            
            # Create new overlay
            new_overlay = Overlay(
                training_id=new_training.id,
                training_section_id=new_section.id,
                time_stamp=overlay.time_stamp,
                type=overlay.type,
                caption=overlay.caption,
                content_id=overlay.content_id,
                frame=overlay.frame,
                animation=overlay.animation,
                duration=overlay.duration,
                position=overlay.position,
                style_id=new_style_id,
                icon_style_id=new_icon_style_id,
                icon=overlay.icon,
                pause_on_show=overlay.pause_on_show,
                frame_config_id=new_frame_config_id,
                created_by=current_user.id
            )
            
            session.add(new_overlay)
            overlays_copied += 1
    
    session.commit()
    
    return {
        "message": f"Training '{source_training.title}' imported successfully with all dependencies",
        "imported_training": {
            "id": new_training.id,
            "title": new_training.title,
            "description": new_training.description
        },
        "sections_copied": sections_copied,
        "overlays_copied": overlays_copied,
        "assets_copied": assets_copied,
        "styles_copied": styles_copied,
        "frame_configs_copied": frame_configs_copied,
        "avatars_copied": avatars_copied
    }
