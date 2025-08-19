from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlmodel import Session, select
from typing import Dict, List, Optional, Any
import json
import asyncio
import logging
import os
from openai import AsyncOpenAI
from pydantic import BaseModel

from ..db import get_session
from ..models import Training, TrainingSection, Overlay, Asset, CompanyTraining, User, Organization
from ..storage import get_minio, presign_get_url
from ..ai_flow_engine import AIFlowEngine, LLM_TOOLS

router = APIRouter(prefix="/llm", tags=["llm"])

# OpenAI client
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# WebSocket connections
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.flow_engines: Dict[str, AIFlowEngine] = {}
        self.session_contexts: Dict[str, Dict[str, Any]] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket
        # Her bağlantı için yeni bir flow engine oluştur
        self.flow_engines[client_id] = AIFlowEngine(client)

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]
        if client_id in self.flow_engines:
            del self.flow_engines[client_id]
        if client_id in self.session_contexts:
            del self.session_contexts[client_id]

    async def send_personal_message(self, message: str, client_id: str):
        if client_id in self.active_connections:
            await self.active_connections[client_id].send_text(message)

manager = ConnectionManager()

# State management
class PlayerState(BaseModel):
    current_section: Optional[str] = None
    current_time: float = 0.0
    is_playing: bool = False
    current_overlay: Optional[str] = None
    user_message: Optional[str] = None
    ai_response: Optional[str] = None
    action: Optional[str] = None
    action_value: Optional[Any] = None

# Training data fetcher
async def get_training_by_access_code(access_code: str, session: Session) -> Dict:
    """Access code ile training bilgilerini getir"""
    print(f"Looking for access_code: {access_code}")
    
    stmt = select(CompanyTraining).where(CompanyTraining.access_code == access_code)
    company_training = session.exec(stmt).first()
    
    print(f"Found company_training: {company_training}")
    
    if not company_training:
        # Debug: List all company trainings
        all_company_trainings = session.exec(select(CompanyTraining)).all()
        print(f"All company trainings: {[(ct.access_code, ct.training_id) for ct in all_company_trainings]}")
        raise HTTPException(status_code=404, detail="Training not found")
    
    # Training bilgilerini al
    training = session.get(Training, company_training.training_id)
    print(f"Found training: {training}")
    
    if not training:
        raise HTTPException(status_code=404, detail="Training not found")
    
    # Sections ve overlays'leri al
    sections_stmt = select(TrainingSection).where(
        TrainingSection.training_id == training.id
    ).order_by(TrainingSection.order_index)
    sections = session.exec(sections_stmt).all()
    
    print(f"Found sections: {len(sections)}")
    
    training_data = {
        "id": training.id,
        "title": training.title,
        "description": training.description,
        "ai_flow": training.ai_flow,
        "sections": []
    }
    
    for section in sections:
        # Section'ın asset'ini al
        asset = None
        if section.asset_id:
            asset = session.get(Asset, section.asset_id)
        
        # Section'ın overlays'lerini al
        overlays_stmt = select(Overlay).where(
            Overlay.training_section_id == section.id
        ).order_by(Overlay.time_stamp)
        overlays = session.exec(overlays_stmt).all()
        
        print(f"Section {section.title}: {len(overlays)} overlays")
        
        # Video URL'sini oluştur - önce section.video_object, yoksa asset'ten
        video_url = None
        # 1) Section video_object alanı
        if getattr(section, 'video_object', None):
            try:
                object_or_url = section.video_object or ''
                if object_or_url.startswith('http'):
                    video_url = object_or_url
                else:
                    minio_client = get_minio()
                    video_url = presign_get_url(minio_client, object_or_url, expires=3600)
            except Exception as e:
                print(f"Error creating presigned URL for section.video_object {section.video_object}: {e}")
                video_url = section.video_object
        # 2) Geriye dönük uyumluluk: asset_id
        elif asset:
            if asset.uri.startswith('http'):
                video_url = asset.uri
            else:
                try:
                    minio_client = get_minio()
                    video_url = presign_get_url(minio_client, asset.uri, expires=3600)
                except Exception as e:
                    print(f"Error creating presigned URL for {asset.uri}: {e}")
                    video_url = asset.uri
        
        section_data = {
            "id": section.id,
            "title": section.title,
            "description": section.description,
            "script": section.script,
            "duration": section.duration,
            "order_index": section.order_index,
            "video_url": video_url,
            "overlays": []
        }
        
        for overlay in overlays:
            # Overlay'in content asset'ini al
            content_asset = None
            if overlay.content_id:
                content_asset_model = session.get(Asset, overlay.content_id)
                if content_asset_model:
                    # Prepare content asset payload, presign uri if necessary
                    signed_uri = None
                    if content_asset_model.uri and not content_asset_model.uri.startswith('http'):
                        try:
                            minio_client = get_minio()
                            signed_uri = presign_get_url(minio_client, content_asset_model.uri, expires=3600)
                        except Exception as e:
                            print(f"Error creating presigned URL for content asset {content_asset_model.uri}: {e}")
                            signed_uri = content_asset_model.uri
                    content_asset = {
                        'id': content_asset_model.id,
                        'title': content_asset_model.title,
                        'kind': content_asset_model.kind,
                        'uri': signed_uri or content_asset_model.uri,
                        'description': content_asset_model.description,
                        'html_content': getattr(content_asset_model, 'html_content', None)
                    }
            
            overlay_data = {
                "id": overlay.id,
                "time_stamp": overlay.time_stamp,
                "type": overlay.type,
                "caption": overlay.caption,
                "content_id": overlay.content_id,
                "style_id": overlay.style_id,
                "frame": overlay.frame,
                "animation": overlay.animation,
                "duration": overlay.duration,
                "position": overlay.position,
                "icon": overlay.icon,
                "pause_on_show": getattr(overlay, 'pause_on_show', False),
                "content_asset": content_asset if content_asset else None
            }
            section_data["overlays"].append(overlay_data)
        
        training_data["sections"].append(section_data)
    
    print(f"Returning training data with {len(training_data['sections'])} sections")
    return training_data

# Enhanced intent analysis with AI flow support
def analyze_intent(message: str, flow_engine: AIFlowEngine = None) -> Dict[str, Any]:
    """Gelişmiş intent analizi - AI flow desteği ile"""
    message_lower = message.lower()
    
    # Player control intents
    if any(word in message_lower for word in ["dur", "stop", "pause", "durdur"]):
        return {"action": "pause_video", "response": "Video durduruldu."}
    elif any(word in message_lower for word in ["başla", "play", "devam", "oynat"]):
        return {"action": "play_video", "response": "Video başlatıldı."}
    elif any(word in message_lower for word in ["ileri", "next", "sonraki", "geç"]):
        return {"action": "next_section", "response": "Sonraki bölüme geçiliyor."}
    elif any(word in message_lower for word in ["geri", "previous", "önceki"]):
        return {"action": "previous_section", "response": "Önceki bölüme geçiliyor."}
    elif any(word in message_lower for word in ["tekrar", "repeat", "yeniden"]):
        return {"action": "repeat_section", "response": "Bölüm tekrarlanıyor."}
    elif any(word in message_lower for word in ["overlay", "göster", "show"]):
        return {"action": "show_overlay", "response": "Overlay gösteriliyor."}
    elif any(word in message_lower for word in ["flow", "akış", "devam et", "ilerle"]):
        return {"action": "continue_flow", "response": None}
    # Yeni araç intent'leri
    elif any(word in message_lower for word in ["içerik", "content", "göster"]):
        return {"action": "show_content", "response": None}
    elif any(word in message_lower for word in ["çevir", "translate", "dil"]):
        return {"action": "translate_content", "response": None}
    elif any(word in message_lower for word in ["yeniden", "regenerate", "farklı"]):
        return {"action": "regenerate_content", "response": None}
    elif any(word in message_lower for word in ["saniye", "time", "geç", "jump"]):
        return {"action": "jump_to_time", "response": None}
    elif any(word in message_lower for word in ["liste", "list", "overlay"]):
        return {"action": "show_overlay_list", "response": None}
    else:
        return {"action": "respond", "response": None}

# Enhanced AI response generation with flow support
async def generate_ai_response(message: str, training_context: str = "", flow_engine: AIFlowEngine = None, flow_json: str = None) -> Dict[str, Any]:
    """Gelişmiş AI yanıtı oluştur - AI flow desteği ile"""
    
    # Eğer AI flow varsa, flow engine'i kullan
    if flow_engine and flow_json:
        try:
            logging.info(f"Using AI flow. Message: '{message}', Flow JSON length: {len(flow_json) if flow_json else 0}")
            
            training_context_dict = {
                "title": training_context,
                "description": ""
            }
            
            result = await flow_engine.execute_flow(flow_json, message, training_context_dict)
            
            logging.info(f"Flow execution result: {result}")
            
            if "error" in result:
                # Flow hatası durumunda fallback
                logging.error(f"Flow error: {result['error']}")
                return await generate_fallback_response(message, training_context)
            
            return result
            
        except Exception as e:
            logging.error(f"Flow execution error: {e}")
            return await generate_fallback_response(message, training_context)
    
    # Fallback: Basit AI yanıtı
    return await generate_fallback_response(message, training_context)

async def generate_fallback_response(message: str, training_context: str = "") -> Dict[str, Any]:
    """Fallback AI yanıtı oluştur"""
    try:
        system_prompt = f"""Sen bir eğitim asistanısın. Kısa ve öz yanıtlar ver. 
        Eğitim konusu: {training_context}
        Kullanıcı isteklerine göre eğitimi yönlendir ve kullanıcıya elindeki içerikleri yöneterek destek ol.
        Bilgi verici olma, flow'daki amaç doğrultusunda kısa cevaplarla diyalog kur ve player'ı yönlendir."""
        
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": message}
            ],
            max_tokens=150,
            temperature=0.7
        )
        
        ai_response = response.choices[0].message.content or "Anladım, size yardımcı olmaya çalışıyorum."
        
        return {
            "action": "respond",
            "message": ai_response
        }
        
    except Exception as e:
        logging.error(f"OpenAI API error: {e}")
        return {
            "action": "respond", 
            "message": "Üzgünüm, şu anda yanıt veremiyorum."
        }

# WebSocket endpoint
@router.websocket("/ws/{access_code}")
async def websocket_endpoint(websocket: WebSocket, access_code: str, session: Session = Depends(get_session)):
    client_id = f"client_{access_code}"
    
    try:
        await manager.connect(websocket, client_id)
        
        # Training verilerini yükle
        training_data = await get_training_by_access_code(access_code, session)
        
        # Başlangıç mesajı gönder
        await manager.send_personal_message(
            json.dumps({
                "type": "training_loaded",
                "data": training_data
            }),
            client_id
        )
        
        # WebSocket mesajlarını dinle
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            user_message = message_data.get("message", "")
            action = message_data.get("action", "")
            payload = message_data.get("payload", {})
            
            # Flow engine'i al
            flow_engine = manager.flow_engines.get(client_id)
            
            # Flow engine debug log
            logging.info(f"Flow engine for {client_id}: {flow_engine is not None}")
            if flow_engine:
                logging.info(f"Flow engine state: current_node={flow_engine.state.current_node_id}, visited={flow_engine.state.visited_nodes}")
            
            # Oturum başlatma (istemciden gelen eğitim ve kullanıcı/organizasyon bağlamı)
            if action == "init_session":
                # Eğitim, kullanıcı, organizasyon ve akış bağlamını sakla
                manager.session_contexts[client_id] = {
                    "training": payload.get("training", {}),
                    "user": payload.get("user", {}),
                    "organization": payload.get("organization", {}),
                    "flow": payload.get("flow", None)
                }
                await manager.send_personal_message(json.dumps({
                    "type": "ai_response",
                    "message": "",
                    "action": "session_initialized",
                    "state": {"is_playing": False, "current_section": None, "current_time": 0}
                }), client_id)
                continue

            # Video kontrol aksiyonlarını kontrol et
            if action in ["video_paused", "video_ended", "video_resumed"]:
                # Video duraklatıldığında veya bittiğinde LLM'i aktif et
                try:
                    if action == "video_resumed":
                        # Devam ettirmede AI devreye girmesin
                        response = {
                            "type": "ai_response",
                            "message": "",
                            "action": "respond",
                            "action_value": None,
                            "state": {
                                "is_playing": True,
                                "current_section": None,
                                "current_time": 0
                            }
                        }
                        await manager.send_personal_message(json.dumps(response), client_id)
                        continue
                    system_prompt = f"""Sen bir eğitim asistanısın. Video {'duraklatıldı' if action == 'video_paused' else 'bitti'}.
                    
                    Eğitim Konusu: {training_data.get('title', '')}
                    
                    Kurallar:
                    - Video {'duraklatıldığını' if action == 'video_paused' else 'bittiğini'} bildir
                    - Kullanıcıya nasıl yardımcı olabileceğini sor
                    - Kullanıcıdan yanıt bekle
                    - Türkçe yanıt ver
                    - Kullanıcının isteklerine göre uygun araçları kullan
                    
                    Kullanabileceğin araçlar:
                    - show_content: İçerik göstermek için
                    - translate_content: İçerik çevirmek için
                    - regenerate_content: İçerik yeniden oluşturmak için
                    - jump_to_time: Video'da belirli saniyeye geçmek için
                    - show_overlay_list: Overlay listesi göstermek için
                    - control_video: Video kontrolü için"""
                    
                    response = await client.chat.completions.create(
                        model="gpt-4o-mini",
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": f"Video {'duraklatıldı' if action == 'video_paused' else 'bitti'}. Size nasıl yardımcı olabilirim?"}
                        ],
                        tools=LLM_TOOLS,
                        tool_choice="auto",
                        max_tokens=200,
                        temperature=0.7
                    )
                    
                    ai_response = response.choices[0].message.content or f"Video {'duraklatıldı' if action == 'video_paused' else 'bitti'}. Size nasıl yardımcı olabilirim?"
                    
                    # Sonucu gönder
                    response_data = {
                        "type": "ai_response",
                        "message": ai_response,
                        "action": "respond",
                        "action_value": None,
                        "state": {
                            "is_playing": False,
                            "current_section": None,
                            "current_time": 0
                        }
                    }
                    
                    await manager.send_personal_message(json.dumps(response_data), client_id)
                    continue
                    
                except Exception as e:
                    logging.error(f"Video control LLM error: {e}")
                    ai_response = f"Video {'duraklatıldı' if action == 'video_paused' else 'bitti'}. Size nasıl yardımcı olabilirim?"
            
            # Intent analizi
            intent = analyze_intent(user_message, flow_engine)
            
            # AI yanıtı oluştur
            if intent["action"] == "respond" or intent["action"] == "continue_flow":
                # AI flow varsa kullan, yoksa fallback
                # Bağlamı hazırla (init_session'dan gelenler dahil)
                session_ctx = manager.session_contexts.get(client_id, {})
                flow_json = session_ctx.get("flow") or training_data.get("ai_flow")
                training_context = {
                    "title": training_data.get("title", ""),
                    "description": training_data.get("description", ""),
                    "user": session_ctx.get("user", {}),
                    "organization": session_ctx.get("organization", {})
                }
                ai_result = await generate_ai_response(
                    user_message,
                    training_context.get("title", ""),
                    flow_engine,
                    flow_json
                )
                
                # AI flow sonucunu kontrol et
                if isinstance(ai_result, dict) and ai_result.get("waiting_for_response"):
                    # Kullanıcı yanıtı bekleniyor - sadece mesajı gönder
                    response = {
                        "type": "ai_response",
                        "message": ai_result.get("message", ""),
                        "action": ai_result.get("action", "respond"),
                        "action_value": None,
                        "state": {
                            "is_playing": False,
                            "current_section": None,
                            "current_time": 0
                        }
                    }
                    await manager.send_personal_message(json.dumps(response), client_id)
                    continue
                
                # Result formatını standardize et
                if isinstance(ai_result, dict):
                    ai_response = ai_result.get("message", "Anladım, size yardımcı olmaya çalışıyorum.")
                    action = ai_result.get("action", "respond")
                    
                    # Action value'yu belirle
                    if action == "jump_to_time":
                        action_value = ai_result.get("time_seconds")
                    else:
                        action_value = ai_result.get("section_id") or ai_result.get("content_id")
                    
                    # Section değişikliği varsa state'i güncelle
                    if action == "play_section":
                        if ai_result.get("section_id"):
                            current_section = ai_result.get("section_id")
                        elif action_value:
                            current_section = action_value
                        else:
                            current_section = None
                    else:
                        current_section = None
                        
                else:
                    # Fallback durumu
                    ai_response = ai_result
                    action = intent["action"]
                    action_value = None
                    current_section = None
            else:
                ai_response = intent["response"] or "Anladım, size yardımcı olmaya çalışıyorum."
                action = intent["action"]
                action_value = None
                current_section = None
            
            # is_playing durumunu belirle
            is_playing = False
            if action == "play_video":
                is_playing = True
            elif action == "play_section":
                try:
                    is_playing = bool(ai_result.get("start_video")) if isinstance(ai_result, dict) else False
                except Exception:
                    is_playing = False

            # Sonucu gönder (tekil action + actions listesi)
            response = {
                "type": "ai_response",
                "message": ai_response,
                "action": action,
                "action_value": action_value,
                "actions": ([{"type": action, "value": action_value}] if action else []),
                "state": {
                    "is_playing": is_playing,
                    "current_section": current_section,
                    "current_time": 0
                }
            }
            
            await manager.send_personal_message(json.dumps(response), client_id)
            
    except WebSocketDisconnect:
        manager.disconnect(client_id)
    except Exception as e:
        logging.error(f"WebSocket error: {e}")
        manager.disconnect(client_id)

# REST endpoint for TTS (ElevenLabs)
@router.post("/tts")
async def text_to_speech(request: dict):
    """Text-to-Speech endpoint using ElevenLabs"""
    try:
        import aiohttp
        import base64
        text = request.get("text", "")
        voice_id = request.get("voice_id", os.getenv("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM"))
        model_id = request.get("model_id", os.getenv("ELEVENLABS_MODEL_ID", "eleven_monolingual_v1"))
        if not text:
            return JSONResponse({"error": "Text is required"}, status_code=400)

        eleven_api_key = os.getenv("ELEVENLABS_API_KEY")
        if not eleven_api_key:
            return JSONResponse({"error": "ELEVENLABS_API_KEY not set"}, status_code=500)

        url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
        payload = {
            "text": text,
            "model_id": model_id,
            "voice_settings": {"stability": 0.5, "similarity_boost": 0.7}
        }
        headers = {
            "xi-api-key": eleven_api_key,
            "Content-Type": "application/json"
        }
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload, headers=headers) as resp:
                if resp.status != 200:
                    return JSONResponse({"error": f"ElevenLabs error: {resp.status}"}, status_code=500)
                audio_bytes = await resp.read()
                audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
                return {"audio": audio_b64, "format": "mp3"}
    except Exception as e:
        logging.error(f"TTS error: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

# REST endpoint for STT
@router.post("/stt")
async def speech_to_text(audio_file: bytes):
    """Speech-to-Text endpoint"""
    try:
        # OpenAI Whisper API çağrısı
        response = await client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            response_format="text"
        )
        
        return {"text": response}
        
    except Exception as e:
        logging.error(f"STT error: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)
