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
from ..db import get_session
from ..models import Training, TrainingSection, Asset, Overlay, CompanyTraining, User
from ..auth import hash_password, get_current_user, is_super_admin, check_company_access

router = APIRouter(prefix="/trainings", tags=["trainings"])


class TrainingIn(BaseModel):
    title: str
    description: str | None = None
    flow_id: str | None = None
    ai_flow: str | None = None
    company_id: str | None = None


class TrainingSectionIn(BaseModel):
    title: str
    description: str | None = None
    script: str | None = None
    duration: int | None = None
    video_object: str | None = None
    asset_id: str | None = None
    order_index: int = 0


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
        return session.exec(select(Training)).all()
    else:
        # Diğer kullanıcılar sadece kendi şirketlerindeki eğitimleri görebilir
        if not current_user.company_id:
            return []
        return session.exec(
            select(Training).where(Training.company_id == current_user.company_id)
        ).all()


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
    
    return training


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


# Transcript generation endpoint
@router.post("/{training_id}/sections/{section_id}/transcript")
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
            cdn_url = os.getenv('CDN_URL', 'http://localhost:9000/lxplayer')
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
                                cdn_url = os.getenv('CDN_URL', 'http://localhost:9000/lxplayer')
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
