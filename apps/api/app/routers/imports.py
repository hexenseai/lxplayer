"""
Import endpoints for companies to import default content from system company
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List
from app.db import get_session
from app.models import User, Company, Style, FrameConfig, Asset, Training
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
