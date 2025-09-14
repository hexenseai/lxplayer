import json
import logging
import base64
import httpx
from datetime import datetime
from typing import Dict, Any, List
from fastapi import APIRouter, WebSocket, HTTPException, Depends, File, UploadFile
from sqlmodel import Session, select
from app.db import get_session
from app.models import Training, TrainingSection, Overlay, Asset, Style, CompanyTraining, Avatar, User, Session, UserInteraction, ChatMessage
from app.storage import get_minio, presign_get_url
from app.auth import get_current_user
from openai import AsyncOpenAI
import os

router = APIRouter()
logger = logging.getLogger(__name__)

def get_openai_client():
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not set")
    return AsyncOpenAI(api_key=api_key)


def build_training_json(training: Training, sections: List[TrainingSection], overlays: List[Overlay], assets_map: Dict[str, Asset], styles_map: Dict[str, Style]) -> Dict[str, Any]:
    """Build a unified JSON using training.ai_flow as the primary graph.
    - Nodes/edges come from ai_flow (if present), otherwise fallback to linearized sections
    - Section nodes embed section details and their overlays
    - Task nodes carry label/description
    """
    base: Dict[str, Any] = {
        "training": {
            "id": training.id, 
            "title": training.title, 
            "description": training.description,
            "avatar_id": training.avatar_id
        }
    }
    # Map helpers
    section_by_id: Dict[str, TrainingSection] = {s.id: s for s in sections}
    overlays_by_section: Dict[str, List[Overlay]] = {}
    for ov in overlays:
        if ov.training_section_id:
            overlays_by_section.setdefault(ov.training_section_id, []).append(ov)

    # presign helper
    minio = None
    try:
        minio = get_minio()
    except Exception:
        minio = None

    def resolve_uri(uri: str | None) -> str | None:
        if not uri:
            return None
        if isinstance(uri, str) and uri.startswith("http"):
            return uri
        try:
            if minio:
                return presign_get_url(minio, uri, expires=3600)
        except Exception:
            pass
        return uri

    # Parse ai_flow
    flow_nodes: List[Dict[str, Any]] = []
    flow_edges: List[Dict[str, Any]] = []
    try:
        if training.ai_flow:
            flow = json.loads(training.ai_flow)
            raw_nodes = flow.get("nodes", []) if isinstance(flow, dict) else []
            raw_edges = flow.get("edges", []) if isinstance(flow, dict) else []
            # Build nodes with enrichment
            for n in raw_nodes:
                ntype = n.get("type")
                nid = n.get("id")
                data_obj = n.get("data", {}) or {}
                enriched = {k: v for k, v in n.items() if k in ("id", "type", "position")}
                if ntype == "sectionNode":
                    sid = data_obj.get("sectionId") or data_obj.get("section_id")
                    s = section_by_id.get(sid)
                    if s:
                        section_json = {
                            "id": s.id,
                            "title": s.title,
                            "description": s.description,
                            "type": s.type,
                            "video_object": resolve_uri(s.video_object),
                            "asset": None,
                            "overlays": []
                        }
                        # Add asset if present
                        if s.asset_id and s.asset_id in assets_map:
                            a = assets_map[s.asset_id]
                            section_json["asset"] = {
                                "id": a.id,
                                "title": a.title,
                                "kind": a.kind,
                                "uri": resolve_uri(a.uri),
                                "description": a.description,
                                "html_content": a.html_content
                            }
                        # Add overlays for this section
                        for overlay in overlays_by_section.get(s.id, []):
                            overlay_json = {
                                "id": overlay.id,
                                "time_stamp": overlay.time_stamp,
                                "type": overlay.type,
                                "caption": overlay.caption,
                                "duration": overlay.duration,
                                "pause_on_show": overlay.pause_on_show,
                                "position": overlay.position,
                                "frame": overlay.frame,
                                "animation": overlay.animation,
                                "icon": overlay.icon
                            }
                            if overlay.content_id and overlay.content_id in assets_map:
                                content_asset = assets_map[overlay.content_id]
                                overlay_json["content_asset"] = {
                                    "id": content_asset.id,
                                    "title": content_asset.title,
                                    "kind": content_asset.kind,
                                    "uri": resolve_uri(content_asset.uri),
                                    "description": content_asset.description,
                                    "html_content": content_asset.html_content
                                }
                            if overlay.style_id and overlay.style_id in styles_map:
                                style = styles_map[overlay.style_id]
                                overlay_json["style"] = {
                                    "id": style.id,
                                    "name": style.name,
                                    "description": style.description,
                                    "style_json": style.style_json
                                }
                            section_json["overlays"].append(overlay_json)
                    enriched["data"] = {
                        "label": data_obj.get("label") or (s.title if s else "Bölüm"),
                        "sectionId": sid,
                        "section": section_json,
                    }
                elif ntype == "taskNode":
                    enriched["data"] = {
                        "label": data_obj.get("label") or "LLM Görevi",
                        "description": data_obj.get("description", ""),
                    }
                else:
                    enriched["data"] = {"label": data_obj.get("label") or ("Başla" if ntype == "startNode" else ("Bitiş" if ntype == "endNode" else ""))}
                flow_nodes.append(enriched)
            # Edges as-is
            for e in raw_edges:
                if isinstance(e, dict) and e.get("source") and e.get("target"):
                    flow_edges.append({"source": e.get("source"), "target": e.get("target"), "animated": True})
    except Exception:
        flow_nodes = []
        flow_edges = []

    # Fallback if no nodes in flow - sections'dan flow oluştur
    if not flow_nodes:
        # Start -> sections linear -> End
        flow_nodes = [
            {"id": "start", "type": "startNode", "position": {"x": 40, "y": 40}, "data": {"label": "Başla"}},
            {"id": "end", "type": "endNode", "position": {"x": 40, "y": 440}, "data": {"label": "Bitiş"}},
        ]
        x = 160
        for s in sorted(sections, key=lambda x: x.order_index):
            # Section type'a göre node type belirle
            node_type = "taskNode" if s.type == "llm_task" else "sectionNode"
            flow_nodes.append({
                "id": s.id,
                "type": node_type,
                "position": {"x": x, "y": 120},
                "data": {
                    "label": s.title, 
                    "sectionId": s.id,
                    "section": s,
                    "description": s.description or ""
                },
            })
            x += 240
        # simple edges
        prev = "start"
        for n in flow_nodes:
            if n["id"] in ("start", "end"): continue
            flow_edges.append({"source": prev, "target": n["id"], "animated": True})
            prev = n["id"]
        flow_edges.append({"source": prev, "target": "end", "animated": True})

    base["flow"] = {"nodes": flow_nodes, "edges": flow_edges}
    
    # InteractivePlayer için sections ve overlays array'lerini ekle
    sections_array = []
    overlays_array = []
    
    # Artık tüm sections'ları doğrudan kullan (flow'dan değil)
    for section in sorted(sections, key=lambda x: x.order_index):
        section_data = {
            "id": section.id,
            "title": section.title,
            "description": section.description or "",
            "type": section.type,
            "video_object": section.video_object,
            "asset": None,
            "overlays": []
        }
        
        # Video sections için asset bilgisi ekle
        if section.asset_id and section.asset_id in assets_map:
            asset = assets_map[section.asset_id]
            section_data["asset"] = {
                "id": asset.id,
                "title": asset.title,
                "kind": asset.kind,
                "uri": asset.uri,
                "description": asset.description,
                "html_content": asset.html_content
            }
        
        sections_array.append(section_data)
    
    # Tüm overlay'leri topla
    for section in sections:
        for overlay in overlays_by_section.get(section.id, []):
            content_asset = None
            if overlay.content_id and overlay.content_id in assets_map:
                a = assets_map[overlay.content_id]
                content_asset = {
                    "id": a.id,
                    "title": a.title,
                    "kind": a.kind,
                    "uri": resolve_uri(a.uri),
                    "description": a.description,
                    "html_content": a.html_content
                }
            style = None
            if overlay.style_id and overlay.style_id in styles_map:
                s = styles_map[overlay.style_id]
                style = {
                    "id": s.id,
                    "name": s.name,
                    "description": s.description,
                    "style_json": s.style_json
                }
            overlay_json = {
                "id": overlay.id,
                "section_id": section.id,
                "time_stamp": overlay.time_stamp,
                "type": overlay.type,
                "caption": overlay.caption,
                "duration": overlay.duration,
                "pause_on_show": overlay.pause_on_show,
                "position": overlay.position,
                "frame": overlay.frame,
                "animation": overlay.animation,
                "icon": overlay.icon,
                "content_asset": content_asset,
                "style": style
            }
            overlays_array.append(overlay_json)
    
    base["sections"] = sections_array
    base["overlays"] = overlays_array
    
    return base


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, session: Session = Depends(get_session)):
    print("🔌 WebSocket connection attempt...")
    await websocket.accept()
    print("✅ WebSocket connection accepted!")
    
    try:
        # Send immediate response to test connection
        await websocket.send_text(json.dumps({
            "type": "test",
            "message": "WebSocket connection successful!"
        }))
        print("📤 Test message sent")
        
        openai_client = get_openai_client()
        print("🤖 OpenAI client initialized")
        
        # Store training context and current section state
        training_context = None
        current_section = None
        current_session = None
        
        while True:
            data = await websocket.receive_text()
            print(f"📨 Received WebSocket message: {data}")
            message = json.loads(data)
            print(f"📨 Parsed message: {message}")
            
            if message.get("type") == "init":
                print("🚀 Init message received")
                # Initialize with training context
                context = message.get("context", {})
                access_code = context.get("accessCode")
                user_id = context.get("userId")
                
                if not access_code:
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "message": "Access code required"
                    }))
                    continue
                
                # Find training by access code
                training = None
                company_training = None
                
                # First try direct training access code
                stmt = select(Training).where(Training.access_code == access_code)
                training = session.exec(stmt).first()
                
                if not training:
                    # Try company training access code
                    stmt = select(CompanyTraining).where(CompanyTraining.access_code == access_code)
                    company_training = session.exec(stmt).first()
                    if company_training:
                        stmt = select(Training).where(Training.id == company_training.training_id)
                        training = session.exec(stmt).first()
                
                if not training:
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "message": "Training not found"
                    }))
                    continue
                
                print(f"📚 Found training: {training.title}")
                
                # Load training data
                sections = session.exec(select(TrainingSection).where(TrainingSection.training_id == training.id)).all()
                overlays = session.exec(select(Overlay).where(Overlay.training_section_id.in_([s.id for s in sections]))).all()
                
                print(f"📚 Loaded {len(sections)} sections and {len(overlays)} overlays")
                
                # Load assets and styles
                asset_ids = set()
                style_ids = set()
                for section in sections:
                    if section.asset_id:
                        asset_ids.add(section.asset_id)
                for overlay in overlays:
                    if overlay.content_id:
                        asset_ids.add(overlay.content_id)
                    if overlay.style_id:
                        style_ids.add(overlay.style_id)
                
                assets = session.exec(select(Asset).where(Asset.id.in_(asset_ids))).all() if asset_ids else []
                styles = session.exec(select(Style).where(Style.id.in_(style_ids))).all() if style_ids else []
                
                assets_map = {a.id: a for a in assets}
                styles_map = {s.id: s for s in styles}
                
                print(f"📚 Loaded {len(assets)} assets and {len(styles)} styles")
                
                # Build training context
                training_context = build_training_json(training, sections, overlays, assets_map, styles_map)
                
                # Create session for interaction tracking
                current_session = Session(
                    user_id=user_id,
                    training_id=training.id,
                    company_id=training.company_id,
                    started_at=datetime.utcnow(),
                    status="active"
                )
                session.add(current_session)
                session.commit()
                session.refresh(current_session)
                print(f"📝 Created session: {current_session.id}")
                
                print(f"🎭 Training avatar_id: {training.avatar_id}")
                if training.avatar_id:
                    avatar = session.get(Avatar, training.avatar_id)
                    print(f"🎭 Avatar from DB: {avatar}")
                    if avatar:
                        print(f"🎭 Avatar voice_id: {avatar.elevenlabs_voice_id}")
                
                print("🚀 Sending training context to frontend")
                await websocket.send_text(json.dumps({
                    "type": "initialized",
                    "context": {"training_json": training_context}
                }))
                
            elif message.get("type") == "section_change":
                print("🔄 Section change message received")
                # Update current section state
                context = message.get("context", {})
                current_section = context.get("currentSection")
                available_sections = context.get("availableSections", [])
                print(f"🔄 Current section updated: {current_section}")
                print(f"🔄 Available sections: {len(available_sections)} sections")
                
                # Store available sections in websocket for LLM access
                websocket._available_sections = available_sections
                
                # Send acknowledgment
                await websocket.send_text(json.dumps({
                    "type": "section_updated",
                    "message": f"Section changed to: {current_section.get('title', 'Unknown') if current_section else 'None'}"
                }))
                
            elif message.get("type") == "sections_loaded":
                print("📚 Sections loaded message received")
                # Update current section state and available sections
                context = message.get("context", {})
                current_section = context.get("currentSection")
                available_sections = context.get("availableSections", [])
                print(f"📚 Initial section: {current_section}")
                print(f"📚 Available sections: {len(available_sections)} sections")
                
                # Store available sections in websocket for LLM access
                websocket._available_sections = available_sections
                
                # Send acknowledgment
                await websocket.send_text(json.dumps({
                    "type": "sections_loaded_ack",
                    "message": f"Sections loaded: {len(available_sections)} sections available, starting with: {current_section.get('title', 'Unknown') if current_section else 'None'}"
                }))
                
            elif message.get("type") == "system_message":
                print("🔧 System message received")
                # Handle system message (context for LLM)
                content = message.get("content", "")
                print(f"🔧 System message content: {content}")
                
                # Add system message to chat history for LLM context
                if current_session:
                    try:
                        system_message = ChatMessage(
                            session_id=current_session.id,
                            user_id=user_id,
                            training_id=current_session.training_id,
                            company_id=current_session.company_id,
                            message_type="system",
                            content=content,
                            section_id=current_section.get('id') if current_section else None,
                            timestamp=datetime.utcnow()
                        )
                        session.add(system_message)
                        session.commit()
                        print(f"📝 Recorded system message: {system_message.id}")
                    except Exception as e:
                        print(f"⚠️ Failed to record system message: {e}")
                
                # System messages are handled by the LLM context, no response needed
                
            elif message.get("type") == "video_ended":
                print("🎬 Video ended message received")
                # Handle video ended - send special LLM response
                content = message.get("content", "")
                section_id = message.get("section_id")
                print(f"🎬 Video ended content: {content}, section_id: {section_id}")
                
                # Send special video ended response to LLM
                await websocket.send_text(json.dumps({
                    "type": "assistant_message",
                    "content": {
                        "message": "🎉 Tebrikler! Bu bölümü başarıyla tamamladınız!\n\nŞimdi ne yapmak istersiniz?\n\n📚 **Eğitim Seçenekleri:**\n• Sonraki bölüme geçmek için 'devam et' yazın\n• Bu bölümü tekrar izlemek için 'tekrar et' yazın\n• Başka bir bölüme geçmek için bölüm adını yazın\n\n❓ **Sorularınız varsa:**\n• Bu bölümle ilgili sorularınızı sorabilirsiniz\n• Anlamadığınız kısımları tekrar açıklayabilirim\n\n🔄 **Tekrar İzleme:**\n• Belirli bir kısmı tekrar izlemek isterseniz, o kısmın zamanını söyleyin\n• Overlay'lerden seçerek o kısma gidebilirsiniz",
                        "is_video_ended": True,
                        "section_id": section_id
                    }
                }))
                
                # Record video ended event (but don't add to chat history for LLM context)
                if current_session:
                    try:
                        video_ended_message = ChatMessage(
                            session_id=current_session.id,
                            user_id=user_id,
                            training_id=current_session.training_id,
                            company_id=current_session.company_id,
                            message_type="system",
                            content=f"VIDEO_ENDED: {content}",
                            section_id=section_id,
                            timestamp=datetime.utcnow()
                        )
                        session.add(video_ended_message)
                        session.commit()
                        print(f"📝 Recorded video ended message: {video_ended_message.id}")
                    except Exception as e:
                        print(f"⚠️ Failed to record video ended message: {e}")
                
            elif message.get("type") == "user_message":
                print("💬 User message received")
                # Handle user message and LLM response
                content = message.get("content", "")
                print(f"💬 Message content: {content}")
                
                # Check if this is a video ended response
                is_video_ended_response = any(keyword in content.lower() for keyword in ['devam et', 'sonraki', 'tekrar et'])
                
                # Record user chat message
                if current_session:
                    try:
                        user_message = ChatMessage(
                            session_id=current_session.id,
                            user_id=user_id,
                            training_id=current_session.training_id,
                            company_id=current_session.company_id,
                            message_type="user",
                            content=content,
                            section_id=current_section.get('id') if current_section else None,
                            timestamp=datetime.utcnow()
                        )
                        session.add(user_message)
                        session.commit()
                        print(f"📝 Recorded user message: {user_message.id}")
                    except Exception as e:
                        print(f"⚠️ Failed to record user message: {e}")
                
                # If this is a video ended response, handle specially
                if is_video_ended_response:
                    if 'tekrar et' in content.lower():
                        # Restart current section
                        await websocket.send_text(json.dumps({
                            "type": "assistant_message",
                            "content": {
                                "message": "🔄 Bu bölümü tekrar izliyorsunuz. Video başa sarılıyor...",
                                "action": "restart_video"
                            }
                        }))
                    elif 'devam et' in content.lower() or 'sonraki' in content.lower():
                        # Navigate to next section
                        await websocket.send_text(json.dumps({
                            "type": "assistant_message", 
                            "content": {
                                "message": "➡️ Sonraki bölüme geçiyorsunuz...",
                                "action": "navigate_next"
                            }
                        }))
                    return
                
                # Get current context from message if available
                current_context = message.get("context", {})
                
                # Get chat history for context
                chat_history = []
                if current_session:
                    try:
                        # Get recent chat messages for context (last 10 messages)
                        recent_messages = session.exec(
                            select(ChatMessage)
                            .where(ChatMessage.session_id == current_session.id)
                            .order_by(ChatMessage.timestamp.desc())
                            .limit(10)
                        ).all()
                        
                        # Reverse to get chronological order and filter out system messages
                        for msg in reversed(recent_messages):
                            # Skip system messages (VIDEO_ENDED, LLM_INTERACTION_WAITING, etc.)
                            if msg.message_type == "system":
                                continue
                            chat_history.append({
                                "role": "user" if msg.message_type == "user" else "assistant",
                                "content": msg.content,
                                "timestamp": msg.timestamp.isoformat(),
                                "section_id": msg.section_id
                            })
                    except Exception as e:
                        print(f"⚠️ Failed to get chat history: {e}")

                # Build system prompt with training context
                training_data = training_context or {}
                current_section_info = current_section or {}
                
                # Get available sections from the latest section change message
                available_sections = []
                if hasattr(websocket, '_available_sections'):
                    available_sections = websocket._available_sections
                
                print(f"🤖 Available sections for LLM: {len(available_sections)} sections")
                if available_sections:
                    print(f"🤖 Section IDs: {[s.get('id', 'no-id') for s in available_sections]}")
                    print(f"🤖 Section titles: {[s.get('title', 'no-title') for s in available_sections]}")
                
                system_prompt = f"""
Sen bir eğitim asistanısın. Kullanıcıya eğitim sürecinde rehberlik ediyorsun.

Eğitim Bilgileri:
- Başlık: {training_data.get('training', {}).get('title', 'Bilinmiyor')}
- Açıklama: {training_data.get('training', {}).get('description', '')}

Mevcut Bölüm:
- ID: {current_section_info.get('id', 'Bilinmiyor')}
- Başlık: {current_section_info.get('title', 'Bilinmiyor')}
- Açıklama: {current_section_info.get('description', '')}
- Tip: {current_section_info.get('type', 'Bilinmiyor')}
- Sıra: {current_section_info.get('order_index', 'Bilinmiyor')}

Mevcut Bölümler (Sıralı):
{json.dumps(available_sections if available_sections else training_data.get('sections', []), indent=2, ensure_ascii=False)}

ÖNEMLİ KURALLAR:
1. Eğer bu bir overlay-triggered LLM interaction ise (OVERLAY_INTERACTION mesajı geldiyse), kullanıcı cevap verdiğinde VİDEO DEVAM ETMELİ, sonraki bölüme geçmemeli.
2. Normal sohbet durumunda kullanıcı "tamam", "hadi başlayalım", "devam edelim" gibi ifadeler kullandığında, mevcut bölümden sonraki bölüme geçmek için navigate_next action'ını kullan.
3. Overlay interaction'da kullanıcı cevabını onayla ve video devam etsin.

Flow Bilgileri:
- Flow Var mı: {bool(training_data.get('flow', {}).get('nodes', []))}
- Node Sayısı: {len(training_data.get('flow', {}).get('nodes', []))}

Sohbet Geçmişi:
{json.dumps(chat_history, indent=2, ensure_ascii=False) if chat_history else "Henüz sohbet geçmişi yok."}

Görevlerin:
1. Kullanıcıya eğitim sürecinde rehberlik et
2. Karar noktalarında hangi section'a geçileceğine karar ver
3. Section geçişlerini yönet
4. Kullanıcının ilerlemesini takip et

ÖNEMLİ KURALLAR:
- Sadece mevcut bölümler listesindeki section_id'leri kullan
- Mevcut bölümden farklı bir bölüme geçiş yap
- Bölüm sırasını takip et (order_index'e göre) ama gerekirse atlama yapabilirsin
- Karar noktalarında kullanıcının durumuna göre uygun bölüme geç
- Cevabını her zaman aşağıdaki JSON formatında ver

NAVIGATION ÖRNEKLERİ:
- Sıradaki bölüm: order_index'i mevcut bölümden 1 fazla olan
- Önceki bölüm: order_index'i mevcut bölümden 1 az olan  
- Belirli bölüm: Kullanıcının ihtiyacına göre herhangi bir bölüm
- Karar noktası: Kullanıcının cevabına göre farklı bölümlere yönlendir

ÖNEMLİ: Cevabını her zaman aşağıdaki JSON formatında ver:

{{
  "message": "Kullanıcıya gösterilecek mesaj",
  "suggestions": [
    {{
      "text": "Öneri metni",
      "action": "suggestion_type"
    }}
  ],
  "actions": [
    {{
      "type": "navigate_to_section",
      "section_id": "section_id_here",
      "reason": "Neden bu section'a geçildiği"
    }},
    {{
      "type": "navigate_next",
      "reason": "Sıradaki bölüme geçiş"
    }},
    {{
      "type": "navigate_previous", 
      "reason": "Önceki bölüme geçiş"
    }},
    {{
      "type": "show_overlay",
      "overlay_id": "overlay_id_here",
      "time": 30.5
    }},
    {{
      "type": "pause_video",
      "reason": "Video neden duraklatıldı"
    }},
    {{
      "type": "resume_video",
      "reason": "Video neden devam ettirildi"
    }}
  ]
}}

Mevcut bölümün tipine göre davran:
- "llm_task": Bu bölümde LLM görevleri var, kullanıcıyla etkileşim kur
- "video": Video bölümü, video kontrollerini kullan
- "interactive": Etkileşimli bölüm, kullanıcıdan input al
"""
                
                try:
                    print(f"🤖 Calling OpenAI API with model: gpt-4o")
                    print(f"🤖 System prompt length: {len(system_prompt)}")
                    print(f"🤖 User message: {content}")
                    
                    response = await openai_client.chat.completions.create(
                        model="gpt-4o",
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": content}
                        ],
                        max_tokens=1000,
                        temperature=0.7
                    )
                    
                    llm_response = response.choices[0].message.content
                    print(f"🤖 LLM Response: {llm_response}")
                    
                    # Try to parse JSON response
                    try:
                        # Clean markdown code blocks if present
                        cleaned_response = llm_response.strip()
                        if cleaned_response.startswith('```json'):
                            cleaned_response = cleaned_response[7:]  # Remove ```json
                        if cleaned_response.startswith('```'):
                            cleaned_response = cleaned_response[3:]   # Remove ```
                        if cleaned_response.endswith('```'):
                            cleaned_response = cleaned_response[:-3]  # Remove trailing ```
                        cleaned_response = cleaned_response.strip()
                        
                        parsed_response = json.loads(cleaned_response)
                        print(f"🤖 Parsed JSON response: {parsed_response}")
                        
                        # Generate TTS audio if avatar has voice_id
                        audio_data = None
                        print(f"🎤 Training context: {training_context}")
                        if training_context and training_context.get("training", {}).get("avatar_id"):
                            avatar_id = training_context["training"]["avatar_id"]
                            print(f"🎤 Avatar ID from context: {avatar_id}")
                            try:
                                avatar = session.get(Avatar, avatar_id)
                                print(f"🎤 Avatar from DB: {avatar}")
                                if avatar and avatar.elevenlabs_voice_id:
                                    print(f"🎤 Generating TTS audio with voice_id: {avatar.elevenlabs_voice_id}")
                                    print(f"🎤 Text to convert: {parsed_response.get('message', llm_response)[:100]}...")
                                    audio_data = await generate_tts_audio(
                                        parsed_response.get("message", llm_response),
                                        avatar.elevenlabs_voice_id
                                    )
                                    print(f"🎤 TTS audio generated successfully, data length: {len(audio_data) if audio_data else 0}")
                                else:
                                    print(f"⚠️ Avatar has no voice_id: {avatar.elevenlabs_voice_id if avatar else 'No avatar'}")
                            except Exception as e:
                                print(f"⚠️ TTS generation failed: {e}")
                        else:
                            print("⚠️ No avatar_id in training context, using default voice")
                            # Use default voice for testing
                            try:
                                print("🎤 Generating TTS audio with default voice_id: 21m00Tcm4TlvDq8ikWAM")
                                audio_data = await generate_tts_audio(
                                    parsed_response.get("message", llm_response),
                                    "21m00Tcm4TlvDq8ikWAM"
                                )
                                print("🎤 TTS audio generated successfully with default voice")
                            except Exception as e:
                                print(f"⚠️ Default TTS generation failed: {e}")
                        
                        # Record assistant chat message
                        if current_session:
                            try:
                                assistant_message = ChatMessage(
                                    session_id=current_session.id,
                                    user_id=user_id,
                                    training_id=current_session.training_id,
                                    company_id=current_session.company_id,
                                    message_type="assistant",
                                    content=parsed_response.get("message", llm_response),
                                    section_id=current_section.get('id') if current_section else None,
                                    llm_model="gpt-4o",
                                    audio_data=audio_data,
                                    has_audio=bool(audio_data),
                                    timestamp=datetime.utcnow(),
                                    message_metadata=json.dumps({
                                        "suggestions": parsed_response.get("suggestions", []),
                                        "actions": parsed_response.get("actions", [])
                                    })
                                )
                                session.add(assistant_message)
                                session.commit()
                                print(f"📝 Recorded assistant message: {assistant_message.id}")
                            except Exception as e:
                                print(f"⚠️ Failed to record assistant message: {e}")
                        
                        # Send structured response
                        await websocket.send_text(json.dumps({
                            "type": "assistant_message",
                            "content": parsed_response.get("message", llm_response),
                            "suggestions": parsed_response.get("suggestions", []),
                            "actions": parsed_response.get("actions", []),
                            "audio_data": audio_data
                        }))
                        print("📤 Structured LLM response sent to frontend")
                        
                    except json.JSONDecodeError:
                        print("⚠️ LLM response is not valid JSON, sending as plain text")
                        # Fallback to plain text
                        await websocket.send_text(json.dumps({
                            "type": "assistant_message",
                            "content": llm_response,
                            "suggestions": [],
                            "actions": []
                        }))
                        print("📤 Plain text LLM response sent to frontend")
                    
                except Exception as e:
                    print(f"❌ OpenAI API error: {e}")
                    logger.error(f"OpenAI API error: {e}")
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "message": f"AI service error: {str(e)}"
                    }))
            
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await websocket.send_text(json.dumps({
            "type": "error",
            "message": f"Connection error: {str(e)}"
        }))
    finally:
        await websocket.close()


async def generate_tts_audio(text: str, voice_id: str) -> str:
    """Generate TTS audio using ElevenLabs"""
    elevenlabs_api_key = os.getenv("ELEVENLABS_API_KEY")
    if not elevenlabs_api_key:
        raise HTTPException(status_code=500, detail="ELEVENLABS_API_KEY is not set")
    
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
                        "similarity_boost": 0.7
                    }
                }
            )
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"ElevenLabs TTS error: {response.text}"
                )
            
            # Return the audio data as base64
            audio_base64 = base64.b64encode(response.content).decode('utf-8')
            return audio_base64
            
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Failed to connect to ElevenLabs API: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating speech: {str(e)}")


@router.post("/stt")
async def speech_to_text(
    audio_file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Convert speech to text using OpenAI Whisper"""
    if not audio_file.filename:
        raise HTTPException(status_code=400, detail="No audio file provided")
    
    # Check file type
    if not audio_file.content_type or not audio_file.content_type.startswith('audio/'):
        raise HTTPException(status_code=400, detail="File must be an audio file")
    
    try:
        # Read audio file
        audio_content = await audio_file.read()
        
        # Use OpenAI Whisper for STT
        openai_client = get_openai_client()
        
        # Create a temporary file-like object
        import io
        audio_buffer = io.BytesIO(audio_content)
        audio_buffer.name = audio_file.filename
        
        # Transcribe using Whisper
        transcript = await openai_client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_buffer,
            language="tr"  # Turkish
        )
        
        return {
            "text": transcript.text,
            "language": "tr"
        }
        
    except Exception as e:
        print(f"❌ STT error: {e}")
        raise HTTPException(status_code=500, detail=f"Speech-to-text conversion failed: {str(e)}")