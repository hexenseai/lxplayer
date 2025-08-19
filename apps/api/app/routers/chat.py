import json
import logging
import os
from typing import Dict, Any, List

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from openai import AsyncOpenAI

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
        "Sen bir eğitim asistanısın. Kısa ve öz, yardımsever ve doğal bir Türkçe ile yanıt ver."
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
                # optional context (e.g., training title/access code) – stored as system note
                ctx = payload.get("context")
                try:
                    if ctx:
                        session.messages.append({
                            "role": "system",
                            "content": f"Bağlam: {json.dumps(ctx, ensure_ascii=False)}"
                        })
                    await websocket.send_text(json.dumps({"type": "initialized"}))
                except Exception as e:
                    logging.error(f"Chat init error: {e}")
                    await websocket.send_text(json.dumps({"type": "error", "detail": "init_failed"}))
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
                        max_tokens=300,
                        temperature=0.7,
                    )
                    assistant_text = response.choices[0].message.content or ""
                    session.append_assistant(assistant_text)
                    await websocket.send_text(json.dumps({
                        "type": "assistant_message",
                        "content": assistant_text
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


