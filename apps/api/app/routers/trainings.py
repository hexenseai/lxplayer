from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlmodel import Session, select
from sqlalchemy.exc import IntegrityError
import uuid
import os
import subprocess
import tempfile
import requests
from ..db import get_session
from ..models import Training, TrainingSection, Asset, Overlay, CompanyTraining
from ..auth import hash_password

router = APIRouter(prefix="/trainings", tags=["trainings"])


class TrainingIn(BaseModel):
    title: str
    description: str | None = None
    flow_id: str | None = None
    ai_flow: str | None = None


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
