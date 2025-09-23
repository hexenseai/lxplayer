from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response
from pydantic import BaseModel
from sqlmodel import Session, select
from sqlalchemy.exc import IntegrityError
import uuid
import os
import subprocess
import tempfile
import requests
import zipfile
import json
import xml.etree.ElementTree as ET
from datetime import datetime
import re
from openai import OpenAI
from ..db import get_session
from ..models import Training, TrainingSection, Asset, Overlay, CompanyTraining, User, Style, Avatar, FrameConfig, GlobalFrameConfig, Company, UserInteraction
from ..auth import hash_password, get_current_user, is_super_admin, is_admin, check_company_access
from ..storage import get_minio

router = APIRouter(prefix="/trainings", tags=["trainings"])


class TrainingIn(BaseModel):
    title: str
    description: str | None = None
    flow_id: str | None = None
    ai_flow: str | None = None
    access_code: str | None = None
    avatar_id: str | None = None
    company_id: str | None = None


class TrainingSectionIn(BaseModel):
    title: str
    description: str | None = None
    script: str | None = None
    duration: int | None = 1
    video_object: str | None = None
    asset_id: str | None = None
    order_index: int = 0
    type: str = "video"  # "video", "llm_interaction", or "llm_agent"
    agent_id: str | None = None  # ElevenLabs Agent ID for llm_agent sections
    language: str | None = "TR"
    target_audience: str | None = "Genel"
    audio_asset_id: str | None = None


class OverlayIn(BaseModel):
    time_stamp: int
    type: str
    caption: str | None = None
    content_id: str | None = None
    style_id: str | None = None
    frame: str | None = None
    animation: str | None = None
    duration: float | None = None
    position: str | None = None
    icon: str | None = None
    pause_on_show: bool | None = None


@router.get("", operation_id="list_trainings")
def list_trainings(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if is_super_admin(current_user):
        # Süper admin tüm eğitimleri görebilir
        trainings = session.exec(select(Training)).all()
    else:
        # Diğer kullanıcılar sadece kendi şirketlerindeki eğitimleri görebilir
        if not current_user.company_id:
            return []
        trainings = session.exec(
            select(Training).where(Training.company_id == current_user.company_id)
        ).all()
    
    # Avatar ve Company bilgilerini ekle
    result = []
    for training in trainings:
        training_dict = training.model_dump()
        
        # Avatar bilgilerini ekle
        if training.avatar_id:
            avatar = session.get(Avatar, training.avatar_id)
            if avatar:
                training_dict['avatar'] = avatar.model_dump()
        
        # Company bilgilerini ekle
        if training.company_id:
            company = session.get(Company, training.company_id)
            if company:
                training_dict['company'] = {
                    'id': company.id,
                    'name': company.name,
                    'display_name': company.name  # Company modelinde display_name yok, name kullanıyoruz
                }
        else:
            # Sistem eğitimi (SuperAdmin)
            training_dict['company'] = {
                'id': None,
                'name': 'System',
                'display_name': 'Sistem Eğitimi'
            }
        
        result.append(training_dict)
    
    return result


@router.get("/system", operation_id="list_system_trainings")
def list_system_trainings(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """LXPlayer sistem eğitimlerini listele (sadece admin'ler için)"""
    print(f"DEBUG: list_system_trainings called by user: {current_user.email}")
    print(f"DEBUG: is_admin: {is_admin(current_user)}, is_super_admin: {is_super_admin(current_user)}")
    
    if not is_admin(current_user) and not is_super_admin(current_user):
        print("DEBUG: Access denied - user is not admin or super admin")
        raise HTTPException(403, "Access denied")
    
    # Sistem eğitimlerini al (company_id null olanlar)
    try:
        trainings = session.exec(
            select(Training).where(Training.company_id.is_(None))
        ).all()
        print(f"DEBUG: Found {len(trainings)} system trainings")
        return trainings
    except Exception as e:
        print(f"DEBUG: Error querying system trainings: {e}")
        raise HTTPException(500, f"Database error: {str(e)}")


@router.post("/{source_training_id}/copy", operation_id="copy_training")
def copy_training(
    source_training_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Sistem eğitimini mevcut firmaya kopyala (sadece admin'ler için)"""
    if not is_admin(current_user) and not is_super_admin(current_user):
        raise HTTPException(403, "Access denied")
    
    if not current_user.company_id:
        raise HTTPException(400, "User must belong to a company")
    
    # Kaynak eğitimi bul
    source_training = session.get(Training, source_training_id)
    if not source_training:
        raise HTTPException(404, "Source training not found")
    
    # Yeni eğitim oluştur
    new_training = Training(
        title=f"{source_training.title} (Kopya)",
        description=source_training.description,
        flow_id=source_training.flow_id,
        ai_flow=source_training.ai_flow,
        company_id=current_user.company_id
    )
    session.add(new_training)
    session.commit()
    session.refresh(new_training)
    
    # Asset ve stil mapping'leri
    asset_mapping = {}  # source_asset_id -> new_asset_id
    style_mapping = {}  # source_style_id -> new_style_id
    
    # Kaynak eğitimin bölümlerini al
    source_sections = session.exec(
        select(TrainingSection).where(TrainingSection.training_id == source_training_id)
    ).all()
    
    # Bölümleri kopyala
    for source_section in source_sections:
        # Asset'leri kopyala
        new_asset_id = None
        if source_section.asset_id:
            if source_section.asset_id not in asset_mapping:
                source_asset = session.get(Asset, source_section.asset_id)
                if source_asset:
                    new_asset = Asset(
                        title=f"{source_asset.title} (Kopya)",
                        kind=source_asset.kind,
                        uri=source_asset.uri,
                        description=source_asset.description,
                        language=source_asset.language,
                        original_asset_id=source_asset.id,
                        company_id=current_user.company_id
                    )
                    session.add(new_asset)
                    session.commit()
                    session.refresh(new_asset)
                    asset_mapping[source_section.asset_id] = new_asset.id
            new_asset_id = asset_mapping.get(source_section.asset_id)
        
        # Audio asset'ini kopyala
        new_audio_asset_id = None
        if source_section.audio_asset_id:
            if source_section.audio_asset_id not in asset_mapping:
                source_audio_asset = session.get(Asset, source_section.audio_asset_id)
                if source_audio_asset:
                    new_audio_asset = Asset(
                        title=f"{source_audio_asset.title} (Kopya)",
                        kind=source_audio_asset.kind,
                        uri=source_audio_asset.uri,
                        description=source_audio_asset.description,
                        language=source_audio_asset.language,
                        original_asset_id=source_audio_asset.id,
                        company_id=current_user.company_id
                    )
                    session.add(new_audio_asset)
                    session.commit()
                    session.refresh(new_audio_asset)
                    asset_mapping[source_section.audio_asset_id] = new_audio_asset.id
            new_audio_asset_id = asset_mapping.get(source_section.audio_asset_id)
        
        new_section = TrainingSection(
            title=source_section.title,
            description=source_section.description,
            script=source_section.script,
            duration=source_section.duration,
            video_object=source_section.video_object,
            asset_id=new_asset_id,
            order_index=source_section.order_index,
            type=source_section.type,  # Bölüm tipini kopyala (video, llm_interaction, llm_agent)
            agent_id=source_section.agent_id,  # ElevenLabs Agent ID'sini kopyala
            language=source_section.language,
            target_audience=source_section.target_audience,
            audio_asset_id=new_audio_asset_id,
            training_id=new_training.id
        )
        session.add(new_section)
        session.commit()
        session.refresh(new_section)
        
        # Kaynak bölümün overlay'lerini al
        source_overlays = session.exec(
            select(Overlay).where(Overlay.training_section_id == source_section.id)
        ).all()
        
        # Overlay'leri kopyala
        for source_overlay in source_overlays:
            # Content asset'ini kopyala
            new_content_id = None
            if source_overlay.content_id:
                if source_overlay.content_id not in asset_mapping:
                    source_content_asset = session.get(Asset, source_overlay.content_id)
                    if source_content_asset:
                        new_content_asset = Asset(
                            title=f"{source_content_asset.title} (Kopya)",
                            kind=source_content_asset.kind,
                            uri=source_content_asset.uri,
                            description=source_content_asset.description,
                            language=source_content_asset.language,
                            original_asset_id=source_content_asset.id,
                            company_id=current_user.company_id
                        )
                        session.add(new_content_asset)
                        session.commit()
                        session.refresh(new_content_asset)
                        asset_mapping[source_overlay.content_id] = new_content_asset.id
                new_content_id = asset_mapping.get(source_overlay.content_id)
            
            # Style'ları kopyala
            new_style_id = None
            if source_overlay.style_id:
                if source_overlay.style_id not in style_mapping:
                    source_style = session.get(Style, source_overlay.style_id)
                    if source_style:
                        new_style = Style(
                            name=f"{source_style.name} (Kopya)",
                            description=source_style.description,
                            style_json=source_style.style_json,
                            company_id=current_user.company_id
                        )
                        session.add(new_style)
                        session.commit()
                        session.refresh(new_style)
                        style_mapping[source_overlay.style_id] = new_style.id
                new_style_id = style_mapping.get(source_overlay.style_id)
            
            # Icon style'ını kopyala
            new_icon_style_id = None
            if source_overlay.icon_style_id:
                if source_overlay.icon_style_id not in style_mapping:
                    source_icon_style = session.get(Style, source_overlay.icon_style_id)
                    if source_icon_style:
                        new_icon_style = Style(
                            name=f"{source_icon_style.name} (Kopya)",
                            description=source_icon_style.description,
                            style_json=source_icon_style.style_json,
                            company_id=current_user.company_id
                        )
                        session.add(new_icon_style)
                        session.commit()
                        session.refresh(new_icon_style)
                        style_mapping[source_overlay.icon_style_id] = new_icon_style.id
                new_icon_style_id = style_mapping.get(source_overlay.icon_style_id)
            
            new_overlay = Overlay(
                training_id=new_training.id,
                training_section_id=new_section.id,
                time_stamp=source_overlay.time_stamp,
                type=source_overlay.type,
                caption=source_overlay.caption,
                content_id=new_content_id,
                frame=source_overlay.frame,
                animation=source_overlay.animation,
                duration=source_overlay.duration,
                position=source_overlay.position,
                style_id=new_style_id,
                icon_style_id=new_icon_style_id,
                icon=source_overlay.icon,
                pause_on_show=source_overlay.pause_on_show,
                frame_config_id=source_overlay.frame_config_id
            )
            session.add(new_overlay)
    
    session.commit()
    
    return {
        "message": "Training copied successfully",
        "new_training_id": new_training.id,
        "sections_copied": len(source_sections),
        "overlays_copied": sum(len(session.exec(select(Overlay).where(Overlay.training_section_id == s.id)).all()) for s in source_sections),
        "assets_copied": len(asset_mapping),
        "styles_copied": len(style_mapping)
    }


@router.get("/public/access-code/{access_code}", operation_id="get_training_by_access_code")
def get_training_by_access_code(
    access_code: str, 
    session: Session = Depends(get_session)
):
    """Public endpoint to get training by access code - no authentication required"""
    try:
        print(f"🔍 Looking for training with access_code: {access_code}")
        
        training = session.exec(
            select(Training).where(Training.access_code == access_code)
        ).first()
        
        if not training:
            print(f"❌ Training not found for access_code: {access_code}")
            raise HTTPException(status_code=404, detail="Training not found")
        
        print(f"✅ Found training: {training.title} (ID: {training.id})")
        
        # Get training sections with overlays
        sections = session.exec(
            select(TrainingSection)
            .where(TrainingSection.training_id == training.id)
            .order_by(TrainingSection.order_index)
        ).all()
        
        print(f"📚 Found {len(sections)} sections")
        
        # Build training data with sections and overlays
        training_dict = training.model_dump()
        
        # Add sections with overlays
        sections_data = []
        for section in sections:
            try:
                section_dict = section.model_dump()
                print(f"🔍 Section {section.id} ({section.title}): type={section.type}, agent_id={section.agent_id}, video_object={section.video_object}")
                
                # Get overlays for this section
                overlays = session.exec(
                    select(Overlay)
                    .where(Overlay.section_id == section.id)
                    .order_by(Overlay.time_stamp)
                ).all()
                
                # Get asset information for section
                if section.asset_id:
                    asset = session.get(Asset, section.asset_id)
                    if asset:
                        section_dict['asset'] = asset.model_dump()
                
                # Process overlays with their asset information
                overlays_data = []
                for overlay in overlays:
                    try:
                        overlay_dict = overlay.model_dump()
                        
                        # Get content asset for overlay
                        if overlay.content_asset_id:
                            content_asset = session.get(Asset, overlay.content_asset_id)
                            if content_asset:
                                overlay_dict['content_asset'] = content_asset.model_dump()
                        
                        overlays_data.append(overlay_dict)
                    except Exception as e:
                        print(f"❌ Error processing overlay {overlay.id}: {e}")
                        # Add overlay without content_asset if there's an error
                        try:
                            overlay_dict = overlay.model_dump()
                            overlays_data.append(overlay_dict)
                        except Exception as e2:
                            print(f"❌ Error even with basic overlay dump: {e2}")
                            continue
                
                # Add overlays to section
                section_dict['overlays'] = overlays_data
                sections_data.append(section_dict)
                
            except Exception as e:
                print(f"❌ Error processing section {section.id}: {e}")
                # Add section without overlays if there's an error
                try:
                    section_dict = section.model_dump()
                    section_dict['overlays'] = []
                    sections_data.append(section_dict)
                except Exception as e2:
                    print(f"❌ Error even with basic section dump: {e2}")
                    continue
        
        training_dict['sections'] = sections_data
        
        # Avatar bilgilerini ekle
        if training.avatar_id:
            try:
                avatar = session.get(Avatar, training.avatar_id)
                if avatar:
                    training_dict['avatar'] = avatar.model_dump()
            except Exception as e:
                print(f"❌ Error loading avatar: {e}")
        
        # Company bilgilerini ekle
        if training.company_id:
            try:
                company = session.get(Company, training.company_id)
                if company:
                    training_dict['company'] = {
                        'id': company.id,
                        'name': company.name,
                        'display_name': company.name
                    }
            except Exception as e:
                print(f"❌ Error loading company: {e}")
        else:
            # Sistem eğitimi (SuperAdmin)
            training_dict['company'] = {
                'id': None,
                'name': 'System',
                'display_name': 'Sistem Eğitimi'
            }
        
        print(f"✅ Successfully built training data with {len(sections_data)} sections")
        return training_dict
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Unexpected error in get_training_by_access_code: {e}")
        print(f"❌ Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{training_id}", operation_id="get_training")
def get_training(
    training_id: str, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    training = session.get(Training, training_id)
    if not training:
        raise HTTPException(status_code=404, detail="Training not found")
    
    # Yetki kontrolü
    if not check_company_access(current_user, training.company_id):
        raise HTTPException(403, "Access denied")
    
    # Avatar ve Company bilgilerini ekle
    training_dict = training.model_dump()
    
    # Avatar bilgilerini ekle
    if training.avatar_id:
        avatar = session.get(Avatar, training.avatar_id)
        if avatar:
            training_dict['avatar'] = avatar.model_dump()
    
    # Company bilgilerini ekle
    if training.company_id:
        company = session.get(Company, training.company_id)
        if company:
            training_dict['company'] = {
                'id': company.id,
                'name': company.name,
                'display_name': company.name  # Company modelinde display_name yok, name kullanıyoruz
            }
    else:
        # Sistem eğitimi (SuperAdmin)
        training_dict['company'] = {
            'id': None,
            'name': 'System',
            'display_name': 'Sistem Eğitimi'
        }
    
    return training_dict


@router.post("", operation_id="create_training")
def create_training(
    training: TrainingIn, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Admin ve süper admin kullanıcılar eğitim oluşturabilir
    if current_user.role not in ["Admin", "SuperAdmin"]:
        raise HTTPException(403, "Only admins can create trainings")
    
    # Admin kullanıcı sadece kendi şirketine eğitim ekleyebilir
    if current_user.role == "Admin" and not is_super_admin(current_user):
        if training.company_id and training.company_id != current_user.company_id:
            raise HTTPException(403, "Admin can only create trainings in their own company")
        if not training.company_id:
            training.company_id = current_user.company_id
    
    obj = Training(**training.model_dump())
    session.add(obj)
    session.commit()
    session.refresh(obj)
    return obj


@router.put("/{training_id}", operation_id="update_training")
def update_training(
    training_id: str, 
    body: TrainingIn, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    training = session.get(Training, training_id)
    if not training:
        raise HTTPException(404, "Training not found")
    
    # Yetki kontrolü
    if not check_company_access(current_user, training.company_id):
        raise HTTPException(403, "Access denied")
    
    # Admin kullanıcı sadece kendi şirketindeki eğitimleri güncelleyebilir
    if current_user.role == "Admin" and not is_super_admin(current_user):
        if body.company_id and body.company_id != current_user.company_id:
            raise HTTPException(403, "Admin can only update trainings in their own company")
    
    for k, v in body.model_dump().items():
        setattr(training, k, v)
    
    session.add(training)
    session.commit()
    session.refresh(training)
    return training


@router.delete("/{training_id}", operation_id="delete_training")
def delete_training(
    training_id: str, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    training = session.get(Training, training_id)
    if not training:
        raise HTTPException(404, "Training not found")
    
    # Yetki kontrolü
    if not check_company_access(current_user, training.company_id):
        raise HTTPException(403, "Access denied")
    
    # Sadece admin ve süper admin kullanıcılar eğitim silebilir
    if current_user.role not in ["Admin", "SuperAdmin"]:
        raise HTTPException(403, "Only admins can delete trainings")
    
    try:
        # Delete related data first (if cascade doesn't work)
        # Delete overlays and their user interactions
        overlays = session.exec(select(Overlay).where(Overlay.training_id == training_id)).all()
        for overlay in overlays:
            # Delete user interactions that reference this overlay
            user_interactions = session.exec(
                select(UserInteraction).where(UserInteraction.overlay_id == overlay.id)
            ).all()
            for interaction in user_interactions:
                session.delete(interaction)
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
    
    # Verify audio asset exists if provided
    if section.audio_asset_id:
        audio_asset = session.get(Asset, section.audio_asset_id)
        if not audio_asset:
            raise HTTPException(404, "Audio asset not found")
    
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
    
    # Convert empty strings to None for optional fields
    section_data = section.model_dump()
    for key in ['asset_id', 'audio_asset_id', 'description', 'script', 'video_object']:
        if key in section_data and section_data[key] == '':
            section_data[key] = None
    
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
    
    # Verify audio asset exists if provided
    if section.audio_asset_id:
        audio_asset = session.get(Asset, section.audio_asset_id)
        if not audio_asset:
            raise HTTPException(404, "Audio asset not found")
    
    # Convert empty strings to None for optional fields
    section_data = section.model_dump()
    for key in ['asset_id', 'audio_asset_id', 'description', 'script', 'video_object']:
        if key in section_data and section_data[key] == '':
            section_data[key] = None
    
    for k, v in section_data.items():
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
        # Delete related overlays and their user interactions first
        overlays = session.exec(select(Overlay).where(Overlay.training_section_id == section_id)).all()
        for overlay in overlays:
            # Delete user interactions that reference this overlay
            user_interactions = session.exec(
                select(UserInteraction).where(UserInteraction.overlay_id == overlay.id)
            ).all()
            for interaction in user_interactions:
                session.delete(interaction)
            session.delete(overlay)
        
        # Delete the section
        session.delete(section)
        session.commit()
        return {"ok": True}
    except Exception as e:
        session.rollback()
        raise HTTPException(500, f"Error deleting training section: {str(e)}")


# Description generation endpoint
@router.post("/{training_id}/sections/{section_id}/description", operation_id="generate_section_description")
def generate_description(training_id: str, section_id: str, session: Session = Depends(get_session)):
    section = session.get(TrainingSection, section_id)
    if not section or section.training_id != training_id:
        raise HTTPException(404, "Training section not found")
    
    # Get the training
    training = session.get(Training, training_id)
    if not training:
        raise HTTPException(404, "Training not found")
    
    try:
        # Prepare context for description generation
        context_parts = []
        
        # Add training description if available
        if training.description:
            context_parts.append(f"Eğitim Açıklaması: {training.description}")
        
        # Add section title
        if section.title:
            context_parts.append(f"Bölüm Başlığı: {section.title}")
        
        # Add section script if available
        if section.script:
            context_parts.append(f"Bölüm İçeriği: {section.script}")
        
        if not context_parts:
            raise HTTPException(400, "Bölüm için yeterli içerik bulunamadı. En azından bölüm başlığı veya script gerekli.")
        
        context = "\n\n".join(context_parts)
        
        # Generate description using OpenAI
        openai_api_key = os.getenv("OPENAI_API_KEY")
        if not openai_api_key:
            raise HTTPException(500, "OpenAI API key not configured")
        
        prompt = f"""Aşağıdaki eğitim bölümü bilgilerini kullanarak, bu bölüm için kısa ve öz bir açıklama oluştur. Açıklama:

1. Bölümün ne hakkında olduğunu açıklasın
2. Öğrencilerin ne öğreneceğini belirtsin  
3. 2-3 cümle uzunluğunda olsun
4. Türkçe olsun
5. Profesyonel ve eğitici bir ton kullansın

Eğitim Bilgileri:
{context}

Açıklama:"""

        response = requests.post(
            'https://api.openai.com/v1/chat/completions',
            headers={
                'Authorization': f'Bearer {openai_api_key}',
                'Content-Type': 'application/json'
            },
            json={
                'model': 'gpt-3.5-turbo',
                'messages': [
                    {'role': 'user', 'content': prompt}
                ],
                'max_tokens': 150,
                'temperature': 0.7
            }
        )
        response.raise_for_status()
        result = response.json()
        
        description = result['choices'][0]['message']['content'].strip()
        
        return {
            "description": description
        }
        
    except requests.RequestException as e:
        raise HTTPException(500, f"Error calling OpenAI API: {str(e)}")
    except Exception as e:
        raise HTTPException(500, f"Unexpected error: {str(e)}")


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
    
    # Validate overlay duration against video duration
    if section.asset_id:
        asset = session.get(Asset, section.asset_id)
        if asset and asset.kind == 'video':
            video_duration = get_video_duration(asset.uri)
            overlay_start_time = overlay_data['time_stamp']
            overlay_duration = overlay_data['duration']
            
            # Check if overlay extends beyond video duration
            if overlay_start_time + overlay_duration > video_duration:
                # Adjust overlay duration to fit within video
                max_allowed_duration = video_duration - overlay_start_time
                if max_allowed_duration > 0:
                    overlay_data['duration'] = max_allowed_duration
                    print(f"DEBUG: Adjusted overlay duration from {overlay_duration} to {max_allowed_duration} to fit video duration")
                else:
                    raise HTTPException(400, f"Overlay başlangıç zamanı ({overlay_start_time}s) video süresinden ({video_duration}s) büyük olamaz")
    
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
    
    # Validate overlay duration against video duration
    if section.asset_id:
        asset = session.get(Asset, section.asset_id)
        if asset and asset.kind == 'video':
            video_duration = get_video_duration(asset.uri)
            overlay_start_time = overlay_data['time_stamp']
            overlay_duration = overlay_data['duration']
            
            # Check if overlay extends beyond video duration
            if overlay_start_time + overlay_duration > video_duration:
                # Adjust overlay duration to fit within video
                max_allowed_duration = video_duration - overlay_start_time
                if max_allowed_duration > 0:
                    overlay_data['duration'] = max_allowed_duration
                    print(f"DEBUG: Adjusted overlay duration from {overlay_duration} to {max_allowed_duration} to fit video duration")
                else:
                    raise HTTPException(400, f"Overlay başlangıç zamanı ({overlay_start_time}s) video süresinden ({video_duration}s) büyük olamaz")
    
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
        # First, delete all UserInteraction records that reference this overlay
        user_interactions = session.exec(
            select(UserInteraction).where(UserInteraction.overlay_id == overlay_id)
        ).all()
        
        for interaction in user_interactions:
            session.delete(interaction)
        
        # Then delete the overlay
        session.delete(overlay)
        session.commit()
        return {"ok": True}
    except Exception as e:
        session.rollback()
        raise HTTPException(500, f"Error deleting overlay: {str(e)}")


# Transcript generation endpoint
@router.post("/{training_id}/sections/{section_id}/transcript", operation_id="generate_section_transcript")
def generate_transcript(training_id: str, section_id: str, session: Session = Depends(get_session)):
    section = session.get(TrainingSection, section_id)
    if not section or section.training_id != training_id:
        raise HTTPException(404, "Training section not found")
    
    # Get the video asset
    if not section.asset_id:
        raise HTTPException(400, "No video asset found for this section")
    
    asset = session.get(Asset, section.asset_id)
    if not asset or asset.kind != 'video':
        raise HTTPException(400, "Asset is not a video")
    
    try:
        # Check if ffmpeg is available
        ffmpeg_paths = [
            'ffmpeg',  # PATH'te varsa
            r'C:\ffmpeg\bin\ffmpeg.exe',  # Tam yol
            r'C:\Program Files\ffmpeg\bin\ffmpeg.exe',  # Program Files
        ]
        
        ffmpeg_found = False
        ffmpeg_cmd = None
        
        for path in ffmpeg_paths:
            try:
                result = subprocess.run([path, '-version'], capture_output=True, text=True, check=True)
                print(f"FFmpeg found at: {path}")  # Debug log
                ffmpeg_found = True
                ffmpeg_cmd = path
                break
            except (subprocess.CalledProcessError, FileNotFoundError) as e:
                print(f"FFmpeg not found at: {path} - {e}")  # Debug log
                continue
        
        if not ffmpeg_found:
            raise HTTPException(500, "FFmpeg is not installed or not in PATH. Please install FFmpeg and restart the server.")
        
        # Download video to temporary file
        video_url = asset.uri
        if not video_url.startswith('http'):
            # Assume it's a local file path
            cdn_url = os.getenv('CDN_URL', 'http://minio:9000/lxplayer')
            video_url = f"{cdn_url}/{video_url}"
        
        # Create temporary file for video
        with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as temp_video:
            response = requests.get(video_url, stream=True)
            response.raise_for_status()
            for chunk in response.iter_content(chunk_size=8192):
                temp_video.write(chunk)
            temp_video_path = temp_video.name
        
        # Extract audio using ffmpeg
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_audio:
            audio_path = temp_audio.name
        
        # Extract audio from video
        subprocess.run([
            ffmpeg_cmd, '-i', temp_video_path, 
            '-vn', '-acodec', 'pcm_s16le', 
            '-ar', '16000', '-ac', '1', 
            audio_path, '-y'
        ], check=True)
        
        # Use OpenAI Whisper API to transcribe
        openai_api_key = os.getenv('OPENAI_API_KEY')
        if not openai_api_key:
            raise HTTPException(500, "OpenAI API key not configured")
        
        with open(audio_path, 'rb') as audio_file:
            response = requests.post(
                'https://api.openai.com/v1/audio/transcriptions',
                headers={
                    'Authorization': f'Bearer {openai_api_key}'
                },
                files={
                    'file': ('audio.wav', audio_file, 'audio/wav')
                },
                data={
                    'model': 'whisper-1',
                    'language': 'tr',  # Turkish language
                    'response_format': 'verbose_json'  # Zaman etiketli çıktı için
                }
            )
            response.raise_for_status()
            result = response.json()
            
            # Tam transcript
            transcript = result.get('text', '')
            
            # Zaman etiketli segmentler
            segments = result.get('segments', [])
            
            # SRT formatına çevir
            srt_content = ""
            for i, segment in enumerate(segments, 1):
                start_time = segment.get('start', 0)
                end_time = segment.get('end', 0)
                text = segment.get('text', '').strip()
                
                # Saniyeyi SRT formatına çevir (HH:MM:SS,mmm)
                start_srt = f"{int(start_time//3600):02d}:{int((start_time%3600)//60):02d}:{int(start_time%60):02d},{int((start_time%1)*1000):03d}"
                end_srt = f"{int(end_time//3600):02d}:{int((end_time%3600)//60):02d}:{int(end_time%60):02d},{int((end_time%1)*1000):03d}"
                
                srt_content += f"{i}\n{start_srt} --> {end_srt}\n{text}\n\n"
        
        # Clean up temporary files
        os.unlink(temp_video_path)
        os.unlink(audio_path)
        
        return {
            "transcript": transcript,
            "srt": srt_content,
            "segments": segments
        }
        
    except subprocess.CalledProcessError as e:
        raise HTTPException(500, f"Error processing video: {str(e)}")
    except requests.RequestException as e:
        raise HTTPException(500, f"Error downloading video or calling OpenAI API: {str(e)}")
    except Exception as e:
        raise HTTPException(500, f"Unexpected error: {str(e)}")


# Audio dubbing endpoint
@router.post("/{training_id}/sections/{section_id}/dub-audio", operation_id="dub_section_audio")
def parse_srt_content(srt_content: str):
    """SRT formatındaki içeriği parse eder ve segment listesi döndürür"""
    segments = []
    lines = srt_content.strip().split('\n')
    
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        
        # Segment numarası
        if line.isdigit():
            segment_num = int(line)
            i += 1
            
            # Zaman damgası satırı
            if i < len(lines):
                time_line = lines[i].strip()
                if '-->' in time_line:
                    start_time, end_time = time_line.split(' --> ')
                    start_seconds = srt_time_to_seconds(start_time)
                    end_seconds = srt_time_to_seconds(end_time)
                    i += 1
                    
                    # Metin satırları
                    text_lines = []
                    while i < len(lines) and lines[i].strip():
                        text_lines.append(lines[i].strip())
                        i += 1
                    
                    if text_lines:
                        text = ' '.join(text_lines)
                        segments.append({
                            'number': segment_num,
                            'start_time': start_seconds,
                            'end_time': end_seconds,
                            'duration': end_seconds - start_seconds,
                            'text': text
                        })
        i += 1
    
    return segments

def srt_time_to_seconds(srt_time: str) -> float:
    """SRT zaman formatını (HH:MM:SS,mmm) saniyeye çevirir"""
    time_part, ms_part = srt_time.split(',')
    h, m, s = map(int, time_part.split(':'))
    ms = int(ms_part)
    return h * 3600 + m * 60 + s + ms / 1000.0

def seconds_to_srt_time(seconds: float) -> str:
    """Saniyeyi SRT zaman formatına çevirir"""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

def dub_audio(training_id: str, section_id: str, session: Session = Depends(get_session)):
    section = session.get(TrainingSection, section_id)
    if not section or section.training_id != training_id:
        raise HTTPException(404, "Training section not found")
    
    # Check if script exists
    if not section.script or not section.script.strip():
        raise HTTPException(400, "Script alanı boş. Lütfen seslendirilecek metni script alanına yazın.")
    
    try:
        script_content = section.script.strip()
        
        # Check if it's SRT format
        is_srt = '-->' in script_content and any(line.strip().isdigit() for line in script_content.split('\n'))
        
        if is_srt:
            # Parse SRT content
            segments = parse_srt_content(script_content)
            if not segments:
                raise HTTPException(400, "SRT formatı geçersiz veya boş segment bulunamadı.")
        else:
            # Plain text - get video duration and create single segment
            video_duration = 10.0  # Default duration
            
            # Try to get video duration from asset
            if section.asset_id:
                asset = session.get(Asset, section.asset_id)
                if asset and asset.kind == 'video':
                    # Try to get duration from video metadata
                    try:
                        # Download video to get duration
                        video_url = asset.uri
                        if not video_url.startswith('http'):
                            cdn_url = os.getenv('CDN_URL', 'http://minio:9000/lxplayer')
                            video_url = f"{cdn_url}/{video_url}"
                        
                        # Use ffprobe to get duration
                        ffprobe_cmd = [
                            'ffprobe', '-v', 'quiet', '-show_entries', 
                            'format=duration', '-of', 'csv=p=0', video_url
                        ]
                        
                        result = subprocess.run(ffprobe_cmd, capture_output=True, text=True, timeout=30)
                        if result.returncode == 0:
                            video_duration = float(result.stdout.strip())
                            print(f"Video duration: {video_duration} seconds")
                        else:
                            print(f"Could not get video duration, using default: {video_duration}")
                    except Exception as e:
                        print(f"Error getting video duration: {e}, using default: {video_duration}")
            
            segments = [{
                'number': 1,
                'start_time': 0.0,
                'end_time': video_duration,
                'duration': video_duration,
                'text': script_content
            }]
        
        # Use ElevenLabs to generate new audio in target language
        eleven_api_key = os.getenv("ELEVENLABS_API_KEY")
        if not eleven_api_key:
            raise HTTPException(500, "ELEVENLABS_API_KEY is not set")
        
        # For now, we'll use the same voice but you can make this configurable
        voice_id = os.getenv("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")
        model_id = os.getenv("ELEVENLABS_MODEL_ID", "eleven_multilingual_v2")
        
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
        headers = {"xi-api-key": eleven_api_key, "Content-Type": "application/json"}
        
        # Generate audio for each segment
        segment_audio_files = []
        total_duration = 0
        
        for segment in segments:
            payload = {
                "text": segment['text'],
                "model_id": model_id,
                "voice_settings": {"stability": 0.5, "similarity_boost": 0.7},
            }
            
            response = requests.post(url, json=payload, headers=headers)
            response.raise_for_status()
            segment_audio_bytes = response.content
            
            # Save segment audio
            with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as temp_segment_audio:
                temp_segment_audio.write(segment_audio_bytes)
                segment_audio_files.append({
                    'file_path': temp_segment_audio.name,
                    'start_time': segment['start_time'],
                    'duration': segment['duration'],
                    'text': segment['text']
                })
            
            total_duration = max(total_duration, segment['end_time'])
        
        # Combine all segments into one audio file using FFmpeg
        if len(segment_audio_files) > 1:
            # Create a filter complex to combine segments with proper timing
            filter_parts = []
            input_parts = []
            
            for i, seg in enumerate(segment_audio_files):
                input_parts.extend(['-i', seg['file_path']])
                # Add silence before this segment if needed
                if seg['start_time'] > 0:
                    filter_parts.append(f"[{i}]adelay={int(seg['start_time'] * 1000)}|{int(seg['start_time'] * 1000)}[delayed{i}]")
                else:
                    filter_parts.append(f"[{i}]acopy[delayed{i}]")
            
            # Mix all delayed segments
            mix_inputs = ''.join([f"[delayed{i}]" for i in range(len(segment_audio_files))])
            filter_parts.append(f"{mix_inputs}amix=inputs={len(segment_audio_files)}:duration=longest[out]")
            
            filter_complex = ';'.join(filter_parts)
            
            # Create final combined audio
            with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as temp_combined_audio:
                combined_audio_path = temp_combined_audio.name
            
            # Run FFmpeg to combine segments
            ffmpeg_cmd = [
                'ffmpeg', '-y',
                *input_parts,
                '-filter_complex', filter_complex,
                '-map', '[out]',
                '-c:a', 'mp3',
                '-b:a', '128k',
                combined_audio_path
            ]
            
            try:
                subprocess.run(ffmpeg_cmd, check=True, capture_output=True)
                new_audio_path = combined_audio_path
            except subprocess.CalledProcessError as e:
                print(f"FFmpeg error: {e}")
                # Fallback: use first segment
                new_audio_path = segment_audio_files[0]['file_path']
        else:
            # Single segment
            new_audio_path = segment_audio_files[0]['file_path']
        
        # Upload to MinIO
        object_name = f"audio/{uuid.uuid4()}.mp3"
        cdn_url = os.getenv('CDN_URL', 'http://minio:9000/lxplayer')
        minio_client = get_minio()
        
        with open(new_audio_path, 'rb') as audio_file:
            minio_client.put_object(
                bucket_name='lxplayer',
                object_name=object_name,
                data=audio_file,
                length=len(audio_bytes),
                content_type='audio/mpeg'
            )
        
        # Create asset for the new audio
        audio_asset = Asset(
            title=f"{section.title} - Dubbed Audio",
            kind='audio',
            uri=object_name
        )
        session.add(audio_asset)
        session.commit()
        session.refresh(audio_asset)
        
        # Update section with audio_asset_id
        section.audio_asset_id = audio_asset.id
        session.add(section)
        session.commit()
        
        # Clean up temporary files
        os.unlink(new_audio_path)
        for seg in segment_audio_files:
            if os.path.exists(seg['file_path']):
                os.unlink(seg['file_path'])
        
        return {
            "audio_asset_id": audio_asset.id,
            "transcript": script_content,
            "audio_url": f"{cdn_url}/{object_name}",
            "segments_count": len(segments),
            "total_duration": total_duration,
            "is_srt_format": is_srt
        }
        
    except requests.RequestException as e:
        raise HTTPException(500, f"Error calling ElevenLabs API: {str(e)}")
    except Exception as e:
        raise HTTPException(500, f"Unexpected error: {str(e)}")




def create_scorm_manifest(training, sections, overlays):
    """SCORM 2004 manifest dosyası oluşturur"""
    # SCORM manifest template
    manifest_template = '''<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="MANIFEST-{training_id}" version="1.3" 
         xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2" 
         xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2" 
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
         xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd 
                             http://www.imsglobal.org/xsd/imsmd_rootv1p2p1 imsmd_rootv1p2p1.xsd 
                             http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
    <metadata>
        <schema>ADL SCORM</schema>
        <schemaversion>1.3</schemaversion>
    </metadata>
    <organizations default="TOC1">
        <organization identifier="TOC1">
            <title>{training_title}</title>
            <item identifier="ITEM1" identifierref="RESOURCE1">
                <title>{training_title}</title>
                <adlcp:completionThreshold>1</adlcp:completionThreshold>
            </item>
        </organization>
    </organizations>
    <resources>
        <resource identifier="RESOURCE1" type="webcontent" adlcp:scormtype="sco" href="index.html">
            <file href="index.html"/>
            <file href="player.js"/>
            <file href="styles.css"/>
            <file href="training-data.json"/>
            {asset_files}
        </resource>
    </resources>
</manifest>'''
    
    # Asset dosyalarını ekle
    asset_files = ""
    for section in sections:
        if section.asset:
            # Dosya uzantısını belirle
            file_extension = section.asset.kind.split('/')[-1]
            if file_extension == 'jpeg':
                file_extension = 'jpg'
            elif file_extension == 'mpeg':
                file_extension = 'mp4'
            
            asset_files += f'<file href="assets/{section.asset.id}.{file_extension}"/>\n            '
    
    return manifest_template.format(
        training_id=training.id,
        training_title=training.title,
        asset_files=asset_files
    )


def create_scorm_html(training, sections, overlays):
    """SCORM uyumlu HTML dosyası oluşturur"""
    html_template = '''<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{training_title}</title>
    <link rel="stylesheet" href="styles.css">
    <script src="https://pixijs.download/release/pixi.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
</head>
<body>
    <div id="app">
        <div id="player-container">
            <video id="video-player" controls>
                <source src="" type="video/mp4">
                Tarayıcınız video oynatmayı desteklemiyor.
            </video>
            <div id="overlay-container"></div>
        </div>
        <div id="controls">
            <button id="prev-section">Önceki Bölüm</button>
            <button id="next-section">Sonraki Bölüm</button>
            <button id="complete-training">Eğitimi Tamamla</button>
        </div>
    </div>
    <script src="player.js"></script>
</body>
</html>'''
    
    return html_template.format(training_title=training.title)


def get_video_duration(asset_uri: str) -> float:
    """Get video duration in seconds from asset URI"""
    try:
        # Check if ffmpeg is available
        ffmpeg_paths = [
            'ffprobe',  # PATH'te varsa
            r'C:\ffmpeg\bin\ffprobe.exe',  # Tam yol
            r'C:\Program Files\ffmpeg\bin\ffprobe.exe',  # Program Files
        ]
        
        ffprobe_found = False
        ffprobe_cmd = None
        
        for path in ffmpeg_paths:
            try:
                result = subprocess.run([path, '-version'], capture_output=True, text=True, check=True)
                ffprobe_found = True
                ffprobe_cmd = path
                break
            except (subprocess.CalledProcessError, FileNotFoundError):
                continue
        
        if not ffprobe_found:
            print("FFprobe not found, using default video duration")
            return 300.0  # Default 5 minutes
        
        # Prepare video URL
        video_url = asset_uri
        if not video_url.startswith('http'):
            cdn_url = os.getenv('CDN_URL', 'http://minio:9000/lxplayer')
            video_url = f"{cdn_url}/{video_url}"
        
        # Use ffprobe to get duration
        ffprobe_cmd = [
            ffprobe_cmd, '-v', 'quiet', '-show_entries', 
            'format=duration', '-of', 'csv=p=0', video_url
        ]
        
        result = subprocess.run(ffprobe_cmd, capture_output=True, text=True, timeout=30)
        if result.returncode == 0:
            duration = float(result.stdout.strip())
            print(f"Video duration: {duration} seconds")
            return duration
        else:
            print(f"Could not get video duration, using default: 300 seconds")
            return 300.0
            
    except Exception as e:
        print(f"Error getting video duration: {e}, using default: 300 seconds")
        return 300.0


def create_scorm_css():
    """SCORM için CSS dosyası oluşturur"""
    return '''body {
    margin: 0;
    padding: 20px;
    font-family: Arial, sans-serif;
    background-color: #f5f5f5;
}

#app {
    max-width: 1200px;
    margin: 0 auto;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    overflow: hidden;
}

#player-container {
    position: relative;
    width: 100%;
    background: #000;
}

#video-player {
    width: 100%;
    height: auto;
    display: block;
}

#overlay-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
}

.overlay {
    position: absolute;
    pointer-events: auto;
    background: rgba(0,0,0,0.8);
    color: white;
    padding: 10px;
    border-radius: 4px;
    max-width: 300px;
    word-wrap: break-word;
}

#controls {
    padding: 20px;
    text-align: center;
    background: #f8f9fa;
}

button {
    background: #007bff;
    color: white;
    border: none;
    padding: 10px 20px;
    margin: 0 5px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
}

button:hover {
    background: #0056b3;
}

button:disabled {
    background: #6c757d;
    cursor: not-allowed;
}'''


def create_scorm_js(training, sections, overlays):
    """SCORM uyumlu JavaScript dosyası oluşturur"""
    js_template = '''// SCORM API Wrapper
let scorm = {{
    version: "1.2",
    api: null,
    data: {{
        lessonStatus: "not attempted",
        lessonLocation: "",
        score: {{
            raw: 0,
            min: 0,
            max: 100,
            scaled: 0
        }},
        time: {{
            session: "0000:00:00",
            total: "0000:00:00"
        }}
    }},
    
    init: function() {{
        // SCORM API'yi bul
        this.api = this.findAPI();
        if (this.api) {{
            this.api.LMSInitialize("");
            console.log("SCORM API initialized");
        }}
    }},
    
    findAPI: function() {{
        // SCORM API'yi farklı frame'lerde ara
        let api = null;
        let findAttempts = 0;
        const findAPITries = 500;
        
        while ((api == null) && (findAttempts < findAPITries)) {{
            findAttempts++;
            api = this.getAPI();
            if (api == null) {{
                setTimeout(() => {{}}, 100);
            }}
        }}
        return api;
    }},
    
    getAPI: function() {{
        // Farklı frame'lerde SCORM API'yi ara
        let api = null;
        if (window.parent && window.parent != window) {{
            api = window.parent.API;
        }}
        if (api == null && window.top) {{
            api = window.top.API;
        }}
        return api;
    }},
    
    setLessonStatus: function(status) {{
        this.data.lessonStatus = status;
        if (this.api) {{
            this.api.LMSSetValue("cmi.core.lesson_status", status);
        }}
    }},
    
    setScore: function(score) {{
        this.data.score.raw = score;
        this.data.score.scaled = score / 100;
        if (this.api) {{
            this.api.LMSSetValue("cmi.core.score.raw", score);
            this.api.LMSSetValue("cmi.core.score.scaled", this.data.score.scaled);
        }}
    }},
    
    commit: function() {{
        if (this.api) {{
            this.api.LMSCommit("");
        }}
    }},
    
    terminate: function() {{
        if (this.api) {{
            this.api.LMSFinish("");
        }}
    }}
}};

// Training Data
const trainingData = {training_data};

// Player State
let currentSectionIndex = 0;
let currentVideo = null;
let overlays = [];
let isPlaying = false;

// Initialize
document.addEventListener('DOMContentLoaded', function() {{
    scorm.init();
    loadSection(currentSectionIndex);
    setupEventListeners();
}});

function loadSection(sectionIndex) {{
    if (sectionIndex < 0 || sectionIndex >= trainingData.sections.length) {{
        return;
    }}
    
    const section = trainingData.sections[sectionIndex];
    const videoPlayer = document.getElementById('video-player');
    
    // Video source'u ayarla
    if (section.asset && section.asset.uri) {{
        videoPlayer.src = section.asset.uri;
        currentVideo = section.asset.uri;
    }}
    
    // Overlay'leri yükle
    overlays = section.overlays || [];
    
    // Section başlığını güncelle
    document.title = `${{trainingData.title}} - ${{section.title}}`;
    
    // SCORM lesson location'ı güncelle
    scorm.data.lessonLocation = sectionIndex.toString();
    if (scorm.api) {{
        scorm.api.LMSSetValue("cmi.core.lesson_location", sectionIndex.toString());
    }}
    
    updateControls();
}});

function setupEventListeners() {{
    const videoPlayer = document.getElementById('video-player');
    const prevBtn = document.getElementById('prev-section');
    const nextBtn = document.getElementById('next-section');
    const completeBtn = document.getElementById('complete-training');
    
    videoPlayer.addEventListener('loadedmetadata', function() {{
        scorm.setLessonStatus("incomplete");
    }});
    
    videoPlayer.addEventListener('ended', function() {{
        if (currentSectionIndex < trainingData.sections.length - 1) {{
            currentSectionIndex++;
            loadSection(currentSectionIndex);
        }} else {{
            scorm.setLessonStatus("completed");
            scorm.setScore(100);
            scorm.commit();
        }}
    }});
    
    prevBtn.addEventListener('click', function() {{
        if (currentSectionIndex > 0) {{
            currentSectionIndex--;
            loadSection(currentSectionIndex);
        }}
    }});
    
    nextBtn.addEventListener('click', function() {{
        if (currentSectionIndex < trainingData.sections.length - 1) {{
            currentSectionIndex++;
            loadSection(currentSectionIndex);
        }}
    }});
    
    completeBtn.addEventListener('click', function() {{
        scorm.setLessonStatus("completed");
        scorm.setScore(100);
        scorm.commit();
        scorm.terminate();
        alert("Eğitim tamamlandı!");
    }});
    
    // Overlay'leri göster
    videoPlayer.addEventListener('timeupdate', function() {{
        const currentTime = videoPlayer.currentTime;
        showOverlaysAtTime(currentTime);
    }});
}});

function showOverlaysAtTime(currentTime) {{
    const overlayContainer = document.getElementById('overlay-container');
    overlayContainer.innerHTML = '';
    
    overlays.forEach(overlay => {{
        if (currentTime >= overlay.time_stamp && 
            currentTime <= overlay.time_stamp + (overlay.duration || 5)) {{
            
            const overlayElement = document.createElement('div');
            overlayElement.className = 'overlay';
            overlayElement.style.left = '10px';
            overlayElement.style.top = '10px';
            overlayElement.textContent = overlay.caption || 'Overlay';
            
            overlayContainer.appendChild(overlayElement);
        }}
    }});
}}

function updateControls() {{
    const prevBtn = document.getElementById('prev-section');
    const nextBtn = document.getElementById('next-section');
    
    prevBtn.disabled = currentSectionIndex === 0;
    nextBtn.disabled = currentSectionIndex === trainingData.sections.length - 1;
}};'''
    
    # Training data'yı JSON formatında hazırla
    training_data = {
        "id": training.id,
        "title": training.title,
        "description": training.description,
        "sections": []
    }
    
    for section in sections:
        section_data = {
            "id": section.id,
            "title": section.title,
            "description": section.description,
            "duration": section.duration,
            "asset": None,
            "overlays": []
        }
        
        # Asset bilgilerini ekle
        if section.asset:
            # Dosya uzantısını belirle
            file_extension = section.asset.kind.split('/')[-1]
            if file_extension == 'jpeg':
                file_extension = 'jpg'
            elif file_extension == 'mpeg':
                file_extension = 'mp4'
            
            section_data["asset"] = {
                "id": section.asset.id,
                "uri": f"assets/{section.asset.id}.{file_extension}",
                "kind": section.asset.kind
            }
        
        # Section'a ait overlay'leri ekle
        section_overlays = [o for o in overlays if o.training_section_id == section.id]
        for overlay in section_overlays:
            overlay_data = {
                "id": overlay.id,
                "time_stamp": overlay.time_stamp,
                "type": overlay.type,
                "caption": overlay.caption,
                "duration": overlay.duration,
                "position": overlay.position
            }
            section_data["overlays"].append(overlay_data)
        
        training_data["sections"].append(section_data)
    
    return js_template.format(training_data=json.dumps(training_data, ensure_ascii=False))


@router.get("/{training_id}/scorm-package", operation_id="download_scorm_package")
def download_scorm_package(training_id: str, session: Session = Depends(get_session)):
    """Eğitimi SCORM 2004 formatında paket olarak indir"""
    try:
        # Eğitimi al
        training = session.get(Training, training_id)
        if not training:
            raise HTTPException(404, "Training not found")
        
        # Eğitim bölümlerini al
        sections = session.exec(select(TrainingSection).where(TrainingSection.training_id == training_id).order_by(TrainingSection.order_index)).all()
        
        # Tüm overlay'leri al
        overlays = session.exec(select(Overlay).where(Overlay.training_id == training_id)).all()
        
        # Geçici ZIP dosyası oluştur
        with tempfile.NamedTemporaryFile(suffix='.zip', delete=False) as temp_zip:
            with zipfile.ZipFile(temp_zip, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                # SCORM manifest dosyası
                manifest_content = create_scorm_manifest(training, sections, overlays)
                zip_file.writestr('imsmanifest.xml', manifest_content)
                
                # HTML dosyası
                html_content = create_scorm_html(training, sections, overlays)
                zip_file.writestr('index.html', html_content)
                
                # CSS dosyası
                css_content = create_scorm_css()
                zip_file.writestr('styles.css', css_content)
                
                # JavaScript dosyası
                js_content = create_scorm_js(training, sections, overlays)
                zip_file.writestr('player.js', js_content)
                
                # Training data JSON dosyası
                training_data = {
                    "id": training.id,
                    "title": training.title,
                    "description": training.description,
                    "sections": []
                }
                
                for section in sections:
                    section_data = {
                        "id": section.id,
                        "title": section.title,
                        "description": section.description,
                        "duration": section.duration,
                        "asset": None,
                        "overlays": []
                    }
                    
                    # Asset bilgilerini ekle
                    if section.asset:
                        # Dosya uzantısını belirle
                        file_extension = section.asset.kind.split('/')[-1]
                        if file_extension == 'jpeg':
                            file_extension = 'jpg'
                        elif file_extension == 'mpeg':
                            file_extension = 'mp4'
                        
                        section_data["asset"] = {
                            "id": section.asset.id,
                            "uri": f"assets/{section.asset.id}.{file_extension}",
                            "kind": section.asset.kind
                        }
                    
                    # Section'a ait overlay'leri ekle
                    section_overlays = [o for o in overlays if o.training_section_id == section.id]
                    for overlay in section_overlays:
                        overlay_data = {
                            "id": overlay.id,
                            "time_stamp": overlay.time_stamp,
                            "type": overlay.type,
                            "caption": overlay.caption,
                            "duration": overlay.duration,
                            "position": overlay.position
                        }
                        section_data["overlays"].append(overlay_data)
                    
                    training_data["sections"].append(section_data)
                
                zip_file.writestr('training-data.json', json.dumps(training_data, ensure_ascii=False, indent=2))
                
                # Asset dosyalarını ekle
                assets_dir = "assets"
                for section in sections:
                    if section.asset:
                        try:
                            # Asset'i CDN'den indir
                            asset_url = section.asset.uri
                            if not asset_url.startswith('http'):
                                cdn_url = os.getenv('CDN_URL', 'http://minio:9000/lxplayer')
                                asset_url = f"{cdn_url}/{asset_url}"
                            
                            response = requests.get(asset_url, stream=True)
                            response.raise_for_status()
                            
                            # Dosya uzantısını belirle
                            file_extension = section.asset.kind.split('/')[-1]
                            if file_extension == 'jpeg':
                                file_extension = 'jpg'
                            elif file_extension == 'mpeg':
                                file_extension = 'mp4'
                            
                            asset_filename = f"{assets_dir}/{section.asset.id}.{file_extension}"
                            zip_file.writestr(asset_filename, response.content)
                            
                            # Manifest'e asset dosyasını ekle
                            print(f"Added asset: {asset_filename}")
                            
                        except Exception as e:
                            print(f"Warning: Could not download asset {section.asset.id}: {e}")
                            # Asset indirilemezse, boş bir dosya oluştur
                            file_extension = section.asset.kind.split('/')[-1]
                            if file_extension == 'jpeg':
                                file_extension = 'jpg'
                            elif file_extension == 'mpeg':
                                file_extension = 'mp4'
                            
                            asset_filename = f"{assets_dir}/{section.asset.id}.{file_extension}"
                            zip_file.writestr(asset_filename, b'')
                            print(f"Created empty asset file: {asset_filename}")
                            continue
            
            # ZIP dosyasını oku
            with open(temp_zip.name, 'rb') as f:
                zip_content = f.read()
        
        # Geçici dosyayı sil
        os.unlink(temp_zip.name)
        
        # Response olarak ZIP dosyasını döndür
        filename = f"scorm-{training.title.replace(' ', '-').lower()}-{datetime.now().strftime('%Y%m%d')}.zip"
        
        return Response(
            content=zip_content,
            media_type="application/zip",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
        
    except Exception as e:
        raise HTTPException(500, f"Error creating SCORM package: {str(e)}")


# LLM Overlay Management endpoints
class LLMOverlayRequest(BaseModel):
    command: str  # LLM command/prompt
    section_script: str | None = None  # SRT format script for context


class LLMOverlayResponse(BaseModel):
    success: bool
    message: str
    actions: list[dict] = []  # Actions performed (created, updated, deleted overlays)
    warnings: list[str] = []  # Any warnings or issues


def parse_srt_content(srt_content: str) -> list[dict]:
    """Parse SRT content and return list of segments with timing"""
    segments = []
    
    # Split by double newlines to get individual subtitle blocks
    blocks = re.split(r'\n\s*\n', srt_content.strip())
    
    for block in blocks:
        lines = block.strip().split('\n')
        if len(lines) >= 3:
            try:
                # Parse sequence number
                seq_num = int(lines[0])
                
                # Parse timing line
                timing_line = lines[1]
                if ' --> ' in timing_line:
                    start_str, end_str = timing_line.split(' --> ')
                    
                    # Convert SRT time format to seconds
                    start_seconds = srt_time_to_seconds(start_str.strip())
                    end_seconds = srt_time_to_seconds(end_str.strip())
                    
                    # Get text content (can be multiple lines)
                    text = '\n'.join(lines[2:]).strip()
                    
                    segments.append({
                        'id': seq_num,
                        'start': start_seconds,
                        'end': end_seconds,
                        'text': text
                    })
            except (ValueError, IndexError) as e:
                print(f"Error parsing SRT block: {block} - {e}")
                continue
    
    return segments


def srt_time_to_seconds(time_str: str) -> float:
    """Convert SRT time format (HH:MM:SS,mmm) to seconds"""
    try:
        # Replace comma with dot for milliseconds
        time_str = time_str.replace(',', '.')
        
        # Split by colon
        parts = time_str.split(':')
        if len(parts) == 3:
            hours = int(parts[0])
            minutes = int(parts[1])
            seconds = float(parts[2])
            
            return hours * 3600 + minutes * 60 + seconds
        else:
            return 0.0
    except (ValueError, IndexError):
        return 0.0


def build_llm_overlay_system_prompt(available_styles: list, available_frames: list) -> str:
    """Build system prompt for LLM overlay management"""
    
    # Format available styles
    styles_text = ""
    if available_styles:
        styles_text = "\n## Mevcut Stiller\nBu stil ID'lerini style_id alanında kullanabilirsin:\n"
        for style in available_styles:
            safe_name = style['name'].replace('{', '{{').replace('}', '}}') if style['name'] else 'İsim yok'
            safe_desc = style.get('description', 'Açıklama yok').replace('{', '{{').replace('}', '}}') if style.get('description') else 'Açıklama yok'
            styles_text += f"- {style['id']}: {safe_name} - {safe_desc}\n"
    
    # Format available frame configs
    frames_text = ""
    if available_frames:
        frames_text = "\n## Mevcut Frame Konfigürasyonları\nBu frame config ID'lerini frame_config_id alanında kullanabilirsin:\n"
        for frame in available_frames:
            safe_name = frame['name'].replace('{', '{{').replace('}', '}}') if frame['name'] else 'İsim yok'
            safe_desc = frame.get('description', 'Açıklama yok').replace('{', '{{').replace('}', '}}') if frame.get('description') else 'Açıklama yok'
            frames_text += f"- {frame['id']}: {safe_name} - {safe_desc}\n"
    
    return f"""Sen bir video eğitim overlay yönetim asistanısın. Kullanıcının komutlarına göre video üzerinde overlay'ler oluştur, düzenle veya sil.

## Overlay Veri Yapısı
Overlay sistemi çakışmaları otomatik olarak yönetir - aynı zamanda birden fazla overlay gösterebilir ve farklı pozisyonlarda yerleştirir.

Overlay'ler aşağıdaki özelliklere sahiptir:
- time_stamp (integer): Video'da görüneceği saniye (zorunlu) - SADECE TAM SAYI KULLAN
- type (string): Overlay tipi (zorunlu)
  * "label": Basit metin etiketi
  * "button_link": Tıklanabilir link butonu
  * "button_message": Mesaj gösteren buton
  * "button_content": İçerik gösteren buton
  * "content": İçerik gösterimi
  * "frame_set": Frame değiştirme
  * "llm_interaction": LLM etkileşimi
- caption (string): Görünecek metin (opsiyonel)
- position (string): Ekrandaki konum (opsiyonel)
  * "bottom_middle", "bottom_left", "bottom_right"
  * "top_left", "top_middle", "top_right"
  * "center", "left_content", "right_content"
  * "left_half_content", "right_half_content"
- animation (string): Animasyon tipi (opsiyonel)
  * "fade_in", "slide_in_left", "slide_in_right", "scale_in"
- duration (float): Görünme süresi saniye cinsinden (varsayılan: 2.0)
- frame (string): Video frame tipi (opsiyonel)
  * "wide", "face_left", "face_right", "face_middle", "face_close"
- pause_on_show (boolean): Gösterilirken videoyu duraklat (varsayılan: false)
- style_id (string): Stil ID'si (opsiyonel) - Aşağıdaki mevcut stillerden seçebilirsin
- frame_config_id (string): Frame konfigürasyonu ID'si (opsiyonel) - Aşağıdaki mevcut frame'lerden seçebilirsin{styles_text}{frames_text}

## Komut Örnekleri ve Yanıtları
1. "5. saniyede 'Dikkat!' yazısı ekle"
   -> {{"action": "create", "time_stamp": 5, "type": "label", "caption": "Dikkat!", "position": "center"}}

2. "10-15 saniye arası tüm overlay'leri sil"
   -> {{"action": "delete_range", "start_time": 10, "end_time": 15}}

3. "Script'te 'önemli' kelimesi geçen yerlere vurgu ekle"
   -> SRT script'ini analiz et, "önemli" kelimesinin geçtiği zaman dilimlerini bul
   -> Her biri için: {{"action": "create", "time_stamp": X, "type": "label", "caption": "⚠️ Önemli", "position": "top_middle"}}

4. "25. saniyedeki örneği maddeleyerek ekrana yaz"
   -> SRT script'ten 25. saniye civarındaki metni al, maddelere ayır
   -> {{"action": "create", "time_stamp": 25, "type": "content", "caption": "• Madde 1\\n• Madde 2", "position": "right_content"}}

5. "Kırmızı stille uyarı ekle" (stil kullanımı)
   -> Mevcut stillerden uygun olanı seç: {{"action": "create", "time_stamp": X, "type": "label", "caption": "Uyarı", "style_id": "STIL_ID"}}

6. "Yakın çekim frame'i ile 10. saniyede başlık ekle" (frame kullanımı)
   -> Mevcut frame'lerden uygun olanı seç: {{"action": "create", "time_stamp": 10, "type": "label", "caption": "Başlık", "frame_config_id": "FRAME_ID"}}

## Yanıt Formatı
Yanıtın JSON formatında olmalı ve şu yapıda:
{{
  "success": true/false,
  "message": "Açıklayıcı mesaj",
  "actions": [
    {{
      "action": "create|update|delete|delete_range",
      "overlay_id": "sadece update/delete için",
      "time_stamp": 5,
      "type": "label",
      "caption": "Metin",
      "position": "center",
      "animation": "fade_in",
      "duration": 2.0,
      "pause_on_show": false,
      "style_id": "stil_id_buraya",
      "frame_config_id": "frame_id_buraya"
    }}
  ],
  "warnings": ["Uyarı mesajları"]
}}

## Kurallar
1. time_stamp her zaman TAM SAYI (integer) olarak belirt - ONDALIK SAYI KULLANMA!
2. Belirsiz komutlarda kullanıcıdan netleştirme iste
3. SRT script'i varsa zaman bilgilerini kullan ve tam sayıya yuvarla
4. Overlay'lerin aynı zamanda görünmesi sorun değil - sistem otomatik olarak farklı pozisyonlarda yerleştirir
5. Mantıklı pozisyon ve animasyon seç
6. ÖNEMLİ: Tüm zaman değerleri sadece tam sayı olmalı (1, 5, 10, 25 gibi)

## Akıllı Öneriler
Kullanıcının isteğine göre uygun overlay türlerini seç:
- Soru istiyorsa: button_message ile düşündürücü sorular
- Kaynak istiyorsa: button_link ile ilgili web kaynakları  
- Açıklama istiyorsa: content ile detaylı bilgi
- Vurgu istiyorsa: label ile görsel vurgular
- Etkileşim istiyorsa: llm_interaction ile AI sohbeti

## Video Süresi Kullanımı
- Video süresinin TAMAMINI kullan - sadece başlangıçta değil!
- Overlay'leri 0'dan video sonuna kadar yayarak yerleştir
- SRT script'teki zaman bilgilerini kullanarak uygun yerlerde overlay'ler öner
- Video uzunsa daha fazla overlay, kısaysa daha az overlay öner

Kendi zekanı kullanarak en uygun overlay türünü ve içeriği öner."""


@router.post("/{training_id}/sections/{section_id}/llm-overlay-preview", operation_id="llm_preview_overlays")
def llm_preview_overlays(
    training_id: str, 
    section_id: str, 
    request: LLMOverlayRequest, 
    session: Session = Depends(get_session)
):
    """LLM ile overlay aksiyonlarını önizle (yürütmeden)"""
    print(f"🔍 DEBUG: llm_preview_overlays called for training {training_id}, section {section_id}")
    print(f"🔍 DEBUG: Command: {request.command}")
    
    # Verify training and section exist
    training = session.get(Training, training_id)
    if not training:
        print("🔍 DEBUG: Training not found!")
        raise HTTPException(404, "Training not found")
    
    section = session.get(TrainingSection, section_id)
    if not section or section.training_id != training_id:
        print("🔍 DEBUG: Section not found!")
        raise HTTPException(404, "Training section not found")
    
    print("🔍 DEBUG: Training and section verified")
    
    # Get OpenAI API key
    openai_api_key = os.getenv("OPENAI_API_KEY")
    print(f"🔍 DEBUG: OpenAI API key present: {bool(openai_api_key)}")
    if not openai_api_key:
        print("🔍 DEBUG: OpenAI API key missing!")
        raise HTTPException(500, "OpenAI API key not configured")
    
    try:
        print("🔍 DEBUG: Starting overlay processing...")
        # Get current overlays for context
        current_overlays = session.exec(
            select(Overlay)
            .where(Overlay.training_section_id == section_id)
            .order_by(Overlay.time_stamp)
        ).all()
        print(f"🔍 DEBUG: Found {len(current_overlays)} existing overlays")
        
        # Get available styles and frame configs
        available_styles = session.exec(select(Style)).all()
        print(f"🔍 DEBUG: Found {len(available_styles)} styles")
        
        # Get both global and section-specific frame configs
        global_frame_configs = session.exec(
            select(FrameConfig).where(FrameConfig.training_section_id.is_(None))
        ).all()
        print(f"🔍 DEBUG: Found {len(global_frame_configs)} global frame configs")
        
        section_frame_configs = session.exec(
            select(FrameConfig).where(FrameConfig.training_section_id == section_id)
        ).all()
        print(f"🔍 DEBUG: Found {len(section_frame_configs)} section frame configs")
        
        all_frame_configs = list(global_frame_configs) + list(section_frame_configs)
        print("🔍 DEBUG: Creating context...")
        
        context = {
            "training_title": training.title,
            "section_title": section.title,
            "section_duration": section.duration,
            "current_overlays": [
                {
                    "id": ov.id,
                    "time_stamp": ov.time_stamp,
                    "type": ov.type,
                    "caption": ov.caption,
                    "position": ov.position
                } for ov in current_overlays
            ]
        }
        print("🔍 DEBUG: Context created successfully")

        
        # Parse SRT script if provided
        print("🔍 DEBUG: Parsing SRT script...")
        srt_segments = []
        if request.section_script:
            if '-->' in request.section_script:
                srt_segments = parse_srt_content(request.section_script)
                context["srt_segments"] = srt_segments
                print(f"🔍 DEBUG: Parsed {len(srt_segments)} SRT segments")
            else:
                print("🔍 DEBUG: Script not in SRT format")
                return LLMOverlayResponse(
                    success=False,
                    message="Script SRT formatında değil. Lütfen SRT formatında (zaman etiketli) script sağlayın.",
                    warnings=["Script formatı SRT olmalı: '00:00:05,000 --> 00:00:08,000' formatında"]
                )
        else:
            print("🔍 DEBUG: No script provided")
        
        # Prepare style and frame data for LLM
        styles_data = [
            {
                "id": style.id,
                "name": style.name,
                "description": style.description
            } for style in available_styles
        ]
        
        frames_data = [
            {
                "id": frame.id,
                "name": frame.name,
                "description": frame.description,
                "type": "section" if hasattr(frame, 'training_section_id') else "global"
            } for frame in all_frame_configs
        ]
        
        # Build LLM prompt
        system_prompt = build_llm_overlay_system_prompt(styles_data, frames_data)
        
        # Calculate video duration from SRT segments
        video_duration = 0
        if srt_segments:
            video_duration = max(seg['end'] for seg in srt_segments)
        else:
            video_duration = section.duration or 300  # fallback to 5 minutes
        
        user_message = f"""
Komut: {request.command.replace('{', '{{').replace('}', '}}')}

Mevcut Bağlam:
- Bölüm: {section.title.replace('{', '{{').replace('}', '}}') if section.title else 'Başlık yok'}
- Video Süresi: {video_duration:.1f} saniye (TÜM BU SÜREYİ KULLAN!)
- Mevcut Overlay Sayısı: {len(current_overlays)}

{f"SRT Script Segmentleri ({len(srt_segments)} adet):" if srt_segments else "SRT Script: Yok"}
{chr(10).join([f"{seg['start']:.1f}s-{seg['end']:.1f}s: {seg['text'].replace('{', '{{').replace('}', '}}')}" for seg in srt_segments[:10]]) if srt_segments else ""}
{f"... ve {len(srt_segments)-10} segment daha" if len(srt_segments) > 10 else ""}

Mevcut Overlay'ler:
{chr(10).join([f"- {ov.time_stamp}s: {ov.type} - {ov.caption.replace('{', '{{').replace('}', '}}') if ov.caption else 'Caption yok'}" for ov in current_overlays]) if current_overlays else "Henüz overlay yok"}

ÖNEMLİ: Overlay zamanlarını 0-{int(video_duration)} saniye aralığına yayarak öner. Sadece başlangıçta değil, video süresinin tamamını kullan!

Lütfen bu komuta göre gerekli overlay işlemlerini JSON formatında belirt.
"""
        
        # Call OpenAI API
        print("🔍 DEBUG: Calling OpenAI API...")
        client = OpenAI(api_key=openai_api_key)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            temperature=0.3,
            max_tokens=1500
        )
        
        llm_response = response.choices[0].message.content
        print(f"🔍 DEBUG: LLM Response: {llm_response[:200]}...")
        
        # Parse LLM response
        try:
            llm_data = json.loads(llm_response)
            print(f"🔍 DEBUG: JSON parsed successfully")
        except json.JSONDecodeError as e:
            print(f"🔍 DEBUG: JSON parse failed: {e}")
            # Try to extract JSON from response if it's wrapped in text
            json_match = re.search(r'\{.*\}', llm_response, re.DOTALL)
            if json_match:
                try:
                    llm_data = json.loads(json_match.group())
                    print(f"🔍 DEBUG: JSON extracted successfully")
                except json.JSONDecodeError as e2:
                    print(f"🔍 DEBUG: JSON extraction also failed: {e2}")
                    safe_response = str(llm_response).replace("{", "{{").replace("}", "}}")
                    raise HTTPException(500, f"LLM yanıtı JSON formatında değil: {safe_response}")
            else:
                print("🔍 DEBUG: No JSON found in response")
                safe_response = str(llm_response).replace("{", "{{").replace("}", "}}")
                raise HTTPException(500, f"LLM yanıtı JSON formatında değil: {safe_response}")
        
        # Return preview without executing actions
        print(f"🔍 DEBUG: Returning preview with {len(llm_data.get('actions', []))} actions")
        return LLMOverlayResponse(
            success=True,
            message=llm_data.get("message", "Aksiyonlar hazır"),
            actions=llm_data.get("actions", []),
            warnings=llm_data.get("warnings", [])
        )
        
    except Exception as e:
        print(f"🔍 DEBUG: Exception caught in preview: {e}")
        print(f"🔍 DEBUG: Exception type: {type(e)}")
        error_message = str(e).replace("{", "{{").replace("}", "}}")
        return LLMOverlayResponse(
            success=False,
            message=f"LLM overlay önizleme hatası: {error_message}",
            warnings=[error_message]
        )


@router.post("/{training_id}/sections/{section_id}/llm-overlay", operation_id="llm_manage_overlays")
def llm_manage_overlays(
    training_id: str, 
    section_id: str, 
    request: LLMOverlayRequest, 
    session: Session = Depends(get_session)
):
    """LLM ile overlay yönetimi"""
    print(f"⚙️ DEBUG: llm_manage_overlays called for training {training_id}, section {section_id}")
    print(f"⚙️ DEBUG: Command: {request.command}")
    
    # Verify training and section exist
    training = session.get(Training, training_id)
    if not training:
        raise HTTPException(404, "Training not found")
    
    section = session.get(TrainingSection, section_id)
    if not section or section.training_id != training_id:
        raise HTTPException(404, "Training section not found")
    
    # Get OpenAI API key
    openai_api_key = os.getenv("OPENAI_API_KEY")
    if not openai_api_key:
        raise HTTPException(500, "OpenAI API key not configured")
    
    try:
        # Get current overlays for context
        current_overlays = session.exec(
            select(Overlay)
            .where(Overlay.training_section_id == section_id)
            .order_by(Overlay.time_stamp)
        ).all()
        
        # Get available styles
        available_styles = session.exec(
            select(Style).where(Style.is_default == True).order_by(Style.name)
        ).all()
        
        # Get available frame configs for this section
        available_frame_configs = session.exec(
            select(FrameConfig)
            .where(FrameConfig.training_section_id == section_id)
            .order_by(FrameConfig.name)
        ).all()
        
        # Also get global frame configs
        global_frame_configs = session.exec(
            select(GlobalFrameConfig)
            .where(GlobalFrameConfig.is_active == True)
            .order_by(GlobalFrameConfig.name)
        ).all()
        
        # Combine frame configs
        all_frame_configs = list(available_frame_configs) + list(global_frame_configs)
        
        # Prepare context
        context = {
            "section_title": section.title,
            "section_duration": section.duration or 0,
            "current_overlays": [
                {
                    "id": overlay.id,
                    "time_stamp": overlay.time_stamp,
                    "type": overlay.type,
                    "caption": overlay.caption,
                    "position": overlay.position,
                    "animation": overlay.animation,
                    "duration": overlay.duration
                } for overlay in current_overlays
            ]
        }
        
        # Parse SRT script if provided
        srt_segments = []
        if request.section_script:
            if '-->' in request.section_script:
                srt_segments = parse_srt_content(request.section_script)
                context["srt_segments"] = srt_segments
            else:
                return LLMOverlayResponse(
                    success=False,
                    message="Script SRT formatında değil. Lütfen SRT formatında (zaman etiketli) script sağlayın.",
                    warnings=["Script formatı SRT olmalı: '00:00:05,000 --> 00:00:08,000' formatında"]
                )
        
        # Prepare style and frame data for LLM
        styles_data = [
            {
                "id": style.id,
                "name": style.name,
                "description": style.description
            } for style in available_styles
        ]
        
        frames_data = [
            {
                "id": frame.id,
                "name": frame.name,
                "description": frame.description,
                "type": "section" if hasattr(frame, 'training_section_id') else "global"
            } for frame in all_frame_configs
        ]
        
        # Build LLM prompt
        system_prompt = build_llm_overlay_system_prompt(styles_data, frames_data)
        
        # Calculate video duration from SRT segments
        video_duration = 0
        if srt_segments:
            video_duration = max(seg['end'] for seg in srt_segments)
        else:
            video_duration = section.duration or 300  # fallback to 5 minutes
        
        user_message = f"""
Komut: {request.command.replace('{', '{{').replace('}', '}}')}

Mevcut Bağlam:
- Bölüm: {section.title.replace('{', '{{').replace('}', '}}') if section.title else 'Başlık yok'}
- Video Süresi: {video_duration:.1f} saniye (TÜM BU SÜREYİ KULLAN!)
- Mevcut Overlay Sayısı: {len(current_overlays)}

{f"SRT Script Segmentleri ({len(srt_segments)} adet):" if srt_segments else "SRT Script: Yok"}
{chr(10).join([f"{seg['start']:.1f}s-{seg['end']:.1f}s: {seg['text'].replace('{', '{{').replace('}', '}}')}" for seg in srt_segments[:10]]) if srt_segments else ""}
{f"... ve {len(srt_segments)-10} segment daha" if len(srt_segments) > 10 else ""}

Mevcut Overlay'ler:
{chr(10).join([f"- {ov.time_stamp}s: {ov.type} - {ov.caption.replace('{', '{{').replace('}', '}}') if ov.caption else 'Caption yok'}" for ov in current_overlays]) if current_overlays else "Henüz overlay yok"}

ÖNEMLİ: Overlay zamanlarını 0-{int(video_duration)} saniye aralığına yayarak öner. Sadece başlangıçta değil, video süresinin tamamını kullan!

Lütfen bu komuta göre gerekli overlay işlemlerini JSON formatında belirt.
"""
        
        # Call OpenAI API
        client = OpenAI(api_key=openai_api_key)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            temperature=0.3,
            max_tokens=1500
        )
        
        llm_response = response.choices[0].message.content
        
        # Parse LLM response
        try:
            llm_data = json.loads(llm_response)
        except json.JSONDecodeError:
            # Try to extract JSON from response if it's wrapped in text
            json_match = re.search(r'\{.*\}', llm_response, re.DOTALL)
            if json_match:
                llm_data = json.loads(json_match.group())
            else:
                safe_response = str(llm_response).replace("{", "{{").replace("}", "}}")
                raise HTTPException(500, f"LLM yanıtı JSON formatında değil: {safe_response}")
        
        if not llm_data.get("success", False):
            return LLMOverlayResponse(
                success=False,
                message=llm_data.get("message", "LLM komutu işleyemedi"),
                warnings=llm_data.get("warnings", [])
            )
        
        # Execute actions
        executed_actions = []
        warnings = llm_data.get("warnings", [])
        
        for action in llm_data.get("actions", []):
            try:
                action_type = action.get("action")
                
                if action_type == "create":
                    # Create new overlay
                    overlay_data = {
                        "training_id": training_id,
                        "training_section_id": section_id,
                        "time_stamp": int(action.get("time_stamp", 0)),
                        "type": action.get("type", "label"),
                        "caption": action.get("caption"),
                        "position": action.get("position"),
                        "animation": action.get("animation"),
                        "duration": action.get("duration", 2.0),
                        "pause_on_show": action.get("pause_on_show", False),
                        "frame": action.get("frame"),
                        "style_id": action.get("style_id"),
                        "frame_config_id": action.get("frame_config_id")
                    }
                    
                    # Remove None values
                    overlay_data = {k: v for k, v in overlay_data.items() if v is not None}
                    
                    new_overlay = Overlay(**overlay_data)
                    session.add(new_overlay)
                    session.commit()
                    session.refresh(new_overlay)
                    
                    executed_actions.append({
                        "action": "create",
                        "overlay_id": new_overlay.id,
                        "time_stamp": new_overlay.time_stamp,
                        "type": new_overlay.type,
                        "caption": new_overlay.caption
                    })
                
                elif action_type == "delete":
                    # Delete specific overlay
                    overlay_id = action.get("overlay_id")
                    if overlay_id:
                        overlay = session.get(Overlay, overlay_id)
                        if overlay and overlay.training_section_id == section_id:
                            # Delete user interactions that reference this overlay
                            user_interactions = session.exec(
                                select(UserInteraction).where(UserInteraction.overlay_id == overlay_id)
                            ).all()
                            for interaction in user_interactions:
                                session.delete(interaction)
                            session.delete(overlay)
                            session.commit()
                            executed_actions.append({
                                "action": "delete",
                                "overlay_id": overlay_id
                            })
                
                elif action_type == "delete_range":
                    # Delete overlays in time range
                    start_time = action.get("start_time", 0)
                    end_time = action.get("end_time", 0)
                    
                    overlays_to_delete = session.exec(
                        select(Overlay)
                        .where(Overlay.training_section_id == section_id)
                        .where(Overlay.time_stamp >= start_time)
                        .where(Overlay.time_stamp <= end_time)
                    ).all()
                    
                    for overlay in overlays_to_delete:
                        # Delete user interactions that reference this overlay
                        user_interactions = session.exec(
                            select(UserInteraction).where(UserInteraction.overlay_id == overlay.id)
                        ).all()
                        for interaction in user_interactions:
                            session.delete(interaction)
                        session.delete(overlay)
                        executed_actions.append({
                            "action": "delete",
                            "overlay_id": overlay.id,
                            "time_stamp": overlay.time_stamp
                        })
                    
                    session.commit()
                
                elif action_type == "update":
                    # Update existing overlay
                    overlay_id = action.get("overlay_id")
                    if overlay_id:
                        overlay = session.get(Overlay, overlay_id)
                        if overlay and overlay.training_section_id == section_id:
                            # Update fields
                            if "time_stamp" in action:
                                overlay.time_stamp = int(action["time_stamp"])
                            if "type" in action:
                                overlay.type = action["type"]
                            if "caption" in action:
                                overlay.caption = action["caption"]
                            if "position" in action:
                                overlay.position = action["position"]
                            if "animation" in action:
                                overlay.animation = action["animation"]
                            if "duration" in action:
                                overlay.duration = action["duration"]
                            if "pause_on_show" in action:
                                overlay.pause_on_show = action["pause_on_show"]
                            if "style_id" in action:
                                overlay.style_id = action["style_id"]
                            if "frame_config_id" in action:
                                overlay.frame_config_id = action["frame_config_id"]
                            
                            session.commit()
                            executed_actions.append({
                                "action": "update",
                                "overlay_id": overlay_id,
                                "time_stamp": overlay.time_stamp
                            })
            
            except Exception as e:
                error_message = str(e).replace("{", "{{").replace("}", "}}")
                warnings.append(f"Aksiyon hatası: {error_message}")
        
        return LLMOverlayResponse(
            success=True,
            message=llm_data.get("message", f"{len(executed_actions)} overlay işlemi tamamlandı"),
            actions=executed_actions,
            warnings=warnings
        )
        
    except Exception as e:
        error_message = str(e).replace("{", "{{").replace("}", "}}")
        return LLMOverlayResponse(
            success=False,
            message=f"LLM overlay yönetimi hatası: {error_message}",
            warnings=[error_message]
        )
