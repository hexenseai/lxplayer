from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select
from typing import Optional
from ..db import get_session
from ..models import Training, TrainingSection, Overlay, CompanyTraining, Asset

router = APIRouter(prefix="/trainings", tags=["trainings"])


class TrainingIn(BaseModel):
    title: str
    description: str | None = None
    flow_id: str | None = None
    ai_flow: str | None = None


class TrainingSectionIn(BaseModel):
    title: str
    description: Optional[str] = None
    script: Optional[str] = None
    duration: Optional[int] = None
    video_object: Optional[str] = None
    asset_id: Optional[str] = None
    order_index: int = 0


class OverlayIn(BaseModel):
    time_stamp: int
    type: str
    caption: Optional[str] = None
    content_id: Optional[str] = None
    style_id: Optional[str] = None
    frame: Optional[str] = None
    animation: Optional[str] = None
    duration: Optional[float] = 2.0
    position: Optional[str] = None  # includes 'fullscreen'
    training_section_id: Optional[str] = None
    icon: Optional[str] = None
    pause_on_show: Optional[bool] = False


@router.get("", operation_id="list_trainings")
def list_trainings(session: Session = Depends(get_session)):
    return session.exec(select(Training)).all()


@router.get("/{training_id}", operation_id="get_training")
def get_training(training_id: str, session: Session = Depends(get_session)):
    training = session.get(Training, training_id)
    if not training:
        raise HTTPException(status_code=404, detail="Training not found")
    return training


@router.post("", operation_id="create_training")
def create_training(training: TrainingIn, session: Session = Depends(get_session)):
    obj = Training(**training.model_dump())
    session.add(obj)
    session.commit()
    session.refresh(obj)
    return obj


@router.put("/{training_id}", operation_id="update_training")
def update_training(training_id: str, body: TrainingIn, session: Session = Depends(get_session)):
    training = session.get(Training, training_id)
    if not training:
        raise HTTPException(404, "Training not found")
    for k, v in body.model_dump().items():
        setattr(training, k, v)
    session.add(training)
    session.commit()
    session.refresh(training)
    return training


@router.delete("/{training_id}", operation_id="delete_training")
def delete_training(training_id: str, session: Session = Depends(get_session)):
    training = session.get(Training, training_id)
    if not training:
        raise HTTPException(404, "Training not found")
    
    try:
        # Delete related data first (if cascade doesn't work)
        # Delete overlays
        overlays = session.exec(select(Overlay).where(Overlay.training_id == training_id)).all()
        for overlay in overlays:
            session.delete(overlay)
        
        # Delete training sections
        sections = session.exec(select(TrainingSection).where(TrainingSection.training_id == training_id)).all()
        for section in sections:
            session.delete(section)
        
        # Delete company trainings
        company_trainings = session.exec(select(CompanyTraining).where(CompanyTraining.training_id == training_id)).all()
        for ct in company_trainings:
            session.delete(ct)
        
        # Delete the training
        session.delete(training)
        session.commit()
        return {"ok": True}
    except Exception as e:
        session.rollback()
        raise HTTPException(500, f"Error deleting training: {str(e)}")


# Training Sections endpoints
@router.get("/{training_id}/sections", operation_id="list_training_sections")
def list_training_sections(training_id: str, session: Session = Depends(get_session)):
    # Verify training exists
    training = session.get(Training, training_id)
    if not training:
        raise HTTPException(404, "Training not found")
    
    sections = session.exec(
        select(TrainingSection)
        .where(TrainingSection.training_id == training_id)
        .order_by(TrainingSection.order_index)
    ).all()
    
    # Include asset information for each section
    result = []
    for section in sections:
        section_dict = section.model_dump()
        if section.asset_id:
            asset = session.get(Asset, section.asset_id)
            if asset:
                section_dict["asset"] = asset.model_dump()
        result.append(section_dict)
    
    return result


@router.get("/{training_id}/sections/{section_id}", operation_id="get_training_section")
def get_training_section(training_id: str, section_id: str, session: Session = Depends(get_session)):
    # Verify training exists
    training = session.get(Training, training_id)
    if not training:
        raise HTTPException(404, "Training not found")
    
    section = session.get(TrainingSection, section_id)
    if not section or section.training_id != training_id:
        raise HTTPException(404, "Training section not found")
    
    result = section.model_dump()
    if section.asset_id:
        asset = session.get(Asset, section.asset_id)
        if asset:
            result["asset"] = asset.model_dump()
    
    return result


@router.post("/{training_id}/sections", operation_id="create_training_section")
def create_training_section(training_id: str, section: TrainingSectionIn, session: Session = Depends(get_session)):
    # Verify training exists
    training = session.get(Training, training_id)
    if not training:
        raise HTTPException(404, "Training not found")
    
    # Verify asset exists if provided
    if section.asset_id:
        asset = session.get(Asset, section.asset_id)
        if not asset:
            raise HTTPException(404, "Asset not found")
    
    # Eğer order_index belirtilmemişse, en son sıra numarasını bul ve +1 yap
    if section.order_index == 0:
        last_section = session.exec(
            select(TrainingSection)
            .where(TrainingSection.training_id == training_id)
            .order_by(TrainingSection.order_index.desc())
        ).first()
        if last_section:
            section.order_index = last_section.order_index + 1
        else:
            section.order_index = 1
    
    section_data = section.model_dump()
    section_data["training_id"] = training_id
    
    obj = TrainingSection(**section_data)
    session.add(obj)
    session.commit()
    session.refresh(obj)
    return obj


@router.put("/{training_id}/sections/{section_id}", operation_id="update_training_section")
def update_training_section(training_id: str, section_id: str, section: TrainingSectionIn, session: Session = Depends(get_session)):
    # Verify training exists
    training = session.get(Training, training_id)
    if not training:
        raise HTTPException(404, "Training not found")
    
    existing_section = session.get(TrainingSection, section_id)
    if not existing_section or existing_section.training_id != training_id:
        raise HTTPException(404, "Training section not found")
    
    # Verify asset exists if provided
    if section.asset_id:
        asset = session.get(Asset, section.asset_id)
        if not asset:
            raise HTTPException(404, "Asset not found")
    
    for k, v in section.model_dump().items():
        setattr(existing_section, k, v)
    
    session.add(existing_section)
    session.commit()
    session.refresh(existing_section)
    return existing_section


@router.delete("/{training_id}/sections/{section_id}", operation_id="delete_training_section")
def delete_training_section(training_id: str, section_id: str, session: Session = Depends(get_session)):
    # Verify training exists
    training = session.get(Training, training_id)
    if not training:
        raise HTTPException(404, "Training not found")
    
    section = session.get(TrainingSection, section_id)
    if not section or section.training_id != training_id:
        raise HTTPException(404, "Training section not found")
    
    try:
        # Delete related overlays first
        overlays = session.exec(select(Overlay).where(Overlay.training_section_id == section_id)).all()
        for overlay in overlays:
            session.delete(overlay)
        
        # Delete the section
        session.delete(section)
        session.commit()
        return {"ok": True}
    except Exception as e:
        session.rollback()
        raise HTTPException(500, f"Error deleting training section: {str(e)}")


# Training Section Overlays endpoints
@router.get("/{training_id}/sections/{section_id}/overlays", operation_id="list_section_overlays")
def list_section_overlays(training_id: str, section_id: str, session: Session = Depends(get_session)):
    # Verify training exists
    training = session.get(Training, training_id)
    if not training:
        raise HTTPException(404, "Training not found")
    
    # Verify section exists and belongs to training
    section = session.get(TrainingSection, section_id)
    if not section or section.training_id != training_id:
        raise HTTPException(404, "Training section not found")
    
    overlays = session.exec(
        select(Overlay)
        .where(Overlay.training_section_id == section_id)
        .order_by(Overlay.time_stamp)
    ).all()
    
    # Include content asset information for each overlay
    result = []
    for overlay in overlays:
        overlay_dict = overlay.model_dump()
        if overlay.content_id:
            content_asset = session.get(Asset, overlay.content_id)
            if content_asset:
                overlay_dict["content_asset"] = content_asset.model_dump()
        result.append(overlay_dict)
    
    return result


@router.get("/{training_id}/sections/{section_id}/overlays/{overlay_id}", operation_id="get_section_overlay")
def get_section_overlay(training_id: str, section_id: str, overlay_id: str, session: Session = Depends(get_session)):
    # Verify training exists
    training = session.get(Training, training_id)
    if not training:
        raise HTTPException(404, "Training not found")
    
    # Verify section exists and belongs to training
    section = session.get(TrainingSection, section_id)
    if not section or section.training_id != training_id:
        raise HTTPException(404, "Training section not found")
    
    overlay = session.get(Overlay, overlay_id)
    if not overlay or overlay.training_section_id != section_id:
        raise HTTPException(404, "Overlay not found")
    
    result = overlay.model_dump()
    if overlay.content_id:
        content_asset = session.get(Asset, overlay.content_id)
        if content_asset:
            result["content_asset"] = content_asset.model_dump()
    
    return result


@router.post("/{training_id}/sections/{section_id}/overlays", operation_id="create_section_overlay")
def create_section_overlay(training_id: str, section_id: str, overlay: OverlayIn, session: Session = Depends(get_session)):
    # Verify training exists
    training = session.get(Training, training_id)
    if not training:
        raise HTTPException(404, "Training not found")
    
    # Verify section exists and belongs to training
    section = session.get(TrainingSection, section_id)
    if not section or section.training_id != training_id:
        raise HTTPException(404, "Training section not found")
    
    # Verify content asset exists if provided
    if overlay.content_id:
        content_asset = session.get(Asset, overlay.content_id)
        if not content_asset:
            raise HTTPException(404, "Content asset not found")
    
    overlay_data = overlay.model_dump()
    
    # Convert empty strings to None for optional fields
    for key in ['caption', 'content_id', 'style_id', 'frame', 'animation', 'position', 'icon']:
        if key in overlay_data and overlay_data[key] == '':
            overlay_data[key] = None
    
    # Set default duration if not provided
    if 'duration' not in overlay_data or overlay_data['duration'] is None:
        overlay_data['duration'] = 2.0
    
    overlay_data["training_id"] = training_id
    overlay_data["training_section_id"] = section_id
    
    obj = Overlay(**overlay_data)
    session.add(obj)
    session.commit()
    session.refresh(obj)
    return obj


@router.put("/{training_id}/sections/{section_id}/overlays/{overlay_id}", operation_id="update_section_overlay")
def update_section_overlay(training_id: str, section_id: str, overlay_id: str, overlay: OverlayIn, session: Session = Depends(get_session)):
    print(f"DEBUG: Updating overlay {overlay_id} for section {section_id}")
    print(f"DEBUG: Received data: {overlay.model_dump()}")
    
    # Verify training exists
    training = session.get(Training, training_id)
    if not training:
        print(f"DEBUG: Training {training_id} not found")
        raise HTTPException(404, "Training not found")
    
    # Verify section exists and belongs to training
    section = session.get(TrainingSection, section_id)
    if not section or section.training_id != training_id:
        print(f"DEBUG: Section {section_id} not found or doesn't belong to training {training_id}")
        raise HTTPException(404, "Training section not found")
    
    existing_overlay = session.get(Overlay, overlay_id)
    if not existing_overlay or existing_overlay.training_section_id != section_id:
        print(f"DEBUG: Overlay {overlay_id} not found or doesn't belong to section {section_id}")
        raise HTTPException(404, "Overlay not found")
    
    # Verify content asset exists if provided
    if overlay.content_id:
        content_asset = session.get(Asset, overlay.content_id)
        if not content_asset:
            print(f"DEBUG: Content asset {overlay.content_id} not found")
            raise HTTPException(404, "Content asset not found")
    
    print(f"DEBUG: Updating overlay with data: {overlay.model_dump()}")
    
    # Convert empty strings to None for optional fields
    overlay_data = overlay.model_dump()
    for key in ['caption', 'content_id', 'style_id', 'frame', 'animation', 'position', 'icon']:
        if key in overlay_data and overlay_data[key] == '':
            overlay_data[key] = None
    
    # Set default duration if not provided
    if 'duration' not in overlay_data or overlay_data['duration'] is None:
        overlay_data['duration'] = 2.0
    
    print(f"DEBUG: Processed data: {overlay_data}")
    
    for k, v in overlay_data.items():
        setattr(existing_overlay, k, v)
    
    session.add(existing_overlay)
    session.commit()
    session.refresh(existing_overlay)
    
    print(f"DEBUG: Overlay updated successfully")
    return existing_overlay


@router.delete("/{training_id}/sections/{section_id}/overlays/{overlay_id}", operation_id="delete_section_overlay")
def delete_section_overlay(training_id: str, section_id: str, overlay_id: str, session: Session = Depends(get_session)):
    # Verify training exists
    training = session.get(Training, training_id)
    if not training:
        raise HTTPException(404, "Training not found")
    
    # Verify section exists and belongs to training
    section = session.get(TrainingSection, section_id)
    if not section or section.training_id != training_id:
        raise HTTPException(404, "Training section not found")
    
    overlay = session.get(Overlay, overlay_id)
    if not overlay or overlay.training_section_id != section_id:
        raise HTTPException(404, "Overlay not found")
    
    try:
        session.delete(overlay)
        session.commit()
        return {"ok": True}
    except Exception as e:
        session.rollback()
        raise HTTPException(500, f"Error deleting overlay: {str(e)}")
