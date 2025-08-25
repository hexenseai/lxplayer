import json
import logging
import os
from typing import Dict, Any, List

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, UploadFile, File
from openai import AsyncOpenAI
from sqlmodel import Session, select

from ..db import get_session
from ..storage import get_minio, presign_get_url
from ..models import User, Organization, CompanyTraining, Training, TrainingSection, Overlay, Asset, Style

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatSession:
    def __init__(self, client: AsyncOpenAI, system_prompt: str | None = None):
        self.client = client
        self.messages: List[Dict[str, Any]] = []
        if system_prompt:
            self.messages.append({"role": "system", "content": system_prompt})

    def append_user(self, content: str):
        self.messages.append({"role": "user", "content": content})

    def append_assistant(self, content: str):
        self.messages.append({"role": "assistant", "content": content})


def get_openai_client() -> AsyncOpenAI:
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
    base: Dict[str, Any] = {"training": {"id": training.id, "title": training.title, "description": training.description}}
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
                    section_json = None
                    if s:
                        section_json = {
                            "id": s.id,
                            "title": s.title,
                            "description": s.description,
                            "script": s.script,
                            "duration": s.duration,
                            "order_index": s.order_index,
                            "video_object": resolve_uri(s.video_object),
                            "asset": None,
                            "overlays": []
                        }
                        # asset details
                        if s.asset_id and s.asset_id in assets_map:
                            a = assets_map[s.asset_id]
                            section_json["asset"] = {
                                "id": a.id,
                                "title": a.title,
                                "kind": a.kind,
                                "uri": resolve_uri(a.uri),
                                "description": a.description,
                                "html_content": a.html_content,
                            }
                        # overlays for this section
                        for ov in overlays_by_section.get(s.id, []):
                            content_asset = None
                            if ov.content_id and ov.content_id in assets_map:
                                a = assets_map[ov.content_id]
                                content_asset = {
                                    "id": a.id,
                                    "title": a.title,
                                    "kind": a.kind,
                                    "uri": resolve_uri(a.uri),
                                    "description": a.description,
                                    "html_content": a.html_content,
                                }
                            overlay_json = {
                                "id": ov.id,
                                "time_stamp": ov.time_stamp,
                                "type": ov.type,
                                "caption": ov.caption,
                                "style_id": ov.style_id,
                                "icon": ov.icon,
                                "frame": ov.frame,
                                "animation": ov.animation,
                                "duration": ov.duration,
                                "position": ov.position,
                                "pause_on_show": ov.pause_on_show,
                                "content_asset": content_asset,
                            }
                            
                            # Add style data if style_id exists
                            if ov.style_id and ov.style_id in styles_map:
                                style = styles_map[ov.style_id]
                                overlay_json["style"] = {
                                    "id": style.id,
                                    "name": style.name,
                                    "description": style.description,
                                    "style_json": style.style_json,
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

    # Fallback if no nodes in flow
    if not flow_nodes:
        # Start -> sections linear -> End
        flow_nodes = [
            {"id": "start", "type": "startNode", "position": {"x": 40, "y": 40}, "data": {"label": "Başla"}},
            {"id": "end", "type": "endNode", "position": {"x": 40, "y": 440}, "data": {"label": "Bitiş"}},
        ]
        x = 160
        for s in sorted(sections, key=lambda x: x.order_index):
            flow_nodes.append({
                "id": s.id,
                "type": "sectionNode",
                "position": {"x": x, "y": 120},
                "data": {"label": s.title, "sectionId": s.id},
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
    return base


@router.websocket("/ws")
async def websocket_chat(websocket: WebSocket):
    await websocket.accept()
    try:
        client = get_openai_client()
    except HTTPException as e:
        await websocket.send_text(json.dumps({"type": "error", "detail": e.detail}))
        await websocket.close()
        return

    # Per-connection chat session keeps context until socket closes
    system_prompt = (
        "Sen interaktif eğitim oynatıcısında çalışan bir eğitim asistanısın.\n"
        "Sadece elimizdeki InitContext verilerine güven ve bunun dışına çıkma; uydurma bilgi verme.\n"
        "HER ZAMAN yalnızca geçerli JSON ile yanıt ver. Markdown, doğal dil vb. eklemeyeceksin.\n"
        "Yanıt şeması:\n"
        "{\n"
        "  \"message\": string,                 // kısa ve açık asistan cevabı\n"
        "  \"suggestions\": [string],           // kullanıcıya sunulacak hazır mesajlar\n"
        "  \"actions\": [                       // oynatıcıda icra edilecek eylemler\n"
        "    { \"type\": \"pause_video\" },\n"
        "    { \"type\": \"play_video\" },\n"
        "    { \"type\": \"jump_to_time\", \"time_seconds\": number },\n"
        "    { \"type\": \"play_section\", \"section_id\": string, \"time_seconds\": number? }\n"
        "  ],\n"
        "  \"overlay_suggestions\": [          // varsa ilgili overlay atlamaları\n"
        "    { \"overlay_id\": string, \"caption\": string, \"time_seconds\": number }\n"
        "  ]\n"
        "}\n"
        "Kurallar: JSON dışı hiçbir şey gönderme; alan adlarını aynen kullan. Boş ise suggestions/actions alanlarını boş dizi yap.\n"
    )
    session = ChatSession(client, system_prompt=system_prompt)

    # Notify client that session is ready
    await websocket.send_text(json.dumps({"type": "session_started"}))

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                payload = json.loads(raw)
            except Exception:
                await websocket.send_text(json.dumps({"type": "error", "detail": "invalid_json"}))
                continue

            msg_type = payload.get("type")
            if msg_type == "init":
                # optional context: { accessCode, userId }
                ctx = payload.get("context")
                try:
                    extra_context: Dict[str, Any] = {}
                    db_gen = get_session()
                    db = next(db_gen)
                    if ctx and ctx.get("accessCode"):
                        # find company training
                        ct = db.exec(select(CompanyTraining).where(CompanyTraining.access_code == ctx["accessCode"])) .first()
                        if ct:
                            org = db.get(Organization, ct.organization_id)
                            tr = db.get(Training, ct.training_id)
                            secs = db.exec(select(TrainingSection).where(TrainingSection.training_id == tr.id)).all() if tr else []
                            ovs = db.exec(select(Overlay).where(Overlay.training_id == tr.id)).all() if tr else []
                            asset_ids = [o.content_id for o in ovs if o.content_id]
                            assets = db.exec(select(Asset).where(Asset.id.in_(asset_ids))) .all() if asset_ids else []
                            asset_map = {a.id: a for a in assets}
                            
                            # Get all styles for overlay styling
                            styles = db.exec(select(Style)).all()
                            styles_map = {s.id: s for s in styles}
                            extra_context["organization"] = {"id": org.id, "name": org.name} if org else None
                            extra_context["company_training"] = {"id": ct.id, "expectations": ct.expectations}
                            if tr:
                                extra_context["training_json"] = build_training_json(tr, secs, ovs, asset_map, styles_map)
                    if ctx and ctx.get("userId"):
                        user = db.get(User, ctx["userId"])
                        if user:
                            extra_context["user"] = {
                                "id": user.id,
                                "name": user.full_name or user.username or user.email,
                                "role": user.role,
                                "department": user.department,
                                "gpt_prefs": user.gpt_prefs,
                            }
                    # System message with compact JSON context
                    session.messages.append({
                        "role": "system",
                        "content": f"InitContext: {json.dumps(extra_context, ensure_ascii=False)}"
                    })
                    await websocket.send_text(json.dumps({"type": "initialized", "context": extra_context}))
                except Exception as e:
                    logging.error(f"Chat init error: {e}")
                    await websocket.send_text(json.dumps({"type": "error", "detail": "init_failed"}))
                finally:
                    try:
                        db_gen.close()
                    except Exception:
                        pass
                continue

            if msg_type == "user_message":
                content = payload.get("content", "")
                if not content:
                    await websocket.send_text(json.dumps({"type": "error", "detail": "empty_message"}))
                    continue
                session.append_user(content)

                try:
                    response = await session.client.chat.completions.create(
                        model="gpt-4o",
                        messages=session.messages,
                        max_tokens=400,
                        temperature=0.4,
                    )
                    assistant_text = response.choices[0].message.content or "{}"
                    # Model AŞIRI durumlarda JSON dışı döndürebilir; güvenli parse denemesi
                    try:
                        parsed = json.loads(assistant_text)
                    except Exception:
                        parsed = {"message": assistant_text, "suggestions": [], "actions": [], "overlay_suggestions": []}
                    session.append_assistant(json.dumps(parsed, ensure_ascii=False))
                    await websocket.send_text(json.dumps({
                        "type": "assistant_message",
                        "content": parsed
                    }))
                except Exception as e:
                    logging.error(f"OpenAI error: {e}")
                    await websocket.send_text(json.dumps({"type": "error", "detail": "openai_error"}))
                continue

            # Unknown message types are ignored gracefully
            await websocket.send_text(json.dumps({"type": "noop"}))

    except WebSocketDisconnect:
        # Normal closure
        pass
    except Exception as e:
        logging.error(f"Chat websocket error: {e}")
    finally:
        try:
            await websocket.close()
        except Exception:
            pass


# --- Simple TTS using ElevenLabs REST API ---
@router.post("/tts")
async def text_to_speech(request: dict):
    try:
        import aiohttp
        import base64
        text = request.get("text", "").strip()
        voice_id = request.get("voice_id", os.getenv("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM"))
        model_id = request.get("model_id", os.getenv("ELEVENLABS_MODEL_ID", "eleven_monolingual_v1"))
        if not text:
            raise HTTPException(status_code=400, detail="text is required")

        eleven_api_key = os.getenv("ELEVENLABS_API_KEY")
        if not eleven_api_key:
            raise HTTPException(status_code=500, detail="ELEVENLABS_API_KEY is not set")

        url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
        payload = {
            "text": text,
            "model_id": model_id,
            "voice_settings": {"stability": 0.5, "similarity_boost": 0.7},
        }
        headers = {"xi-api-key": eleven_api_key, "Content-Type": "application/json"}

        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload, headers=headers) as resp:
                if resp.status != 200:
                    detail = await resp.text()
                    raise HTTPException(status_code=502, detail=f"ElevenLabs error: {resp.status} {detail}")
                audio_bytes = await resp.read()
                audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
                return {"audio": audio_b64, "format": "mp3"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"TTS error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# --- Simple STT using OpenAI Whisper ---
@router.post("/stt")
async def speech_to_text(audio_file: UploadFile = File(...)):
    try:
        client = get_openai_client()
        data = await audio_file.read()
        if not data:
            raise HTTPException(status_code=400, detail="empty audio")
        # OpenAI SDK accepts bytes for file input
        text = await client.audio.transcriptions.create(
            model="whisper-1",
            file=data,
            response_format="text",
        )
        return {"text": text}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"STT error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


