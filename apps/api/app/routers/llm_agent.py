import json
import logging
import asyncio
import httpx
from datetime import datetime
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, WebSocket, HTTPException, Depends, BackgroundTasks
from sqlmodel import Session, select
from app.db import get_session
from app.models import Training, TrainingSection, User, Session as DBSession, UserInteraction, ChatMessage
from app.auth import get_current_user
import os

router = APIRouter()
logger = logging.getLogger(__name__)

# Test endpoint
@router.get("/test", operation_id="test_llm_agent")
def test_llm_agent():
    """Test endpoint to verify llm_agent router is working"""
    logger.info("🧪 LLM Agent test endpoint called")
    return {"status": "ok", "message": "LLM Agent router is working", "timestamp": datetime.utcnow().isoformat()}

# ElevenLabs API configuration
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1"

class ElevenLabsRealtimeClient:
    def __init__(self):
        self.api_key = ELEVENLABS_API_KEY
        self.base_url = ELEVENLABS_BASE_URL
        self.session = None
        
    async def create_session(self, agent_id: str = None):
        """Create a new ElevenLabs realtime session"""
        if not self.api_key:
            logger.warning("ELEVENLABS_API_KEY not configured, using mock mode")
            # Return mock session for development
            return {
                "session_id": f"mock-session-{int(datetime.utcnow().timestamp())}",
                "agent_id": agent_id,
                "status": "active"
            }
            
        headers = {
            "xi-api-key": self.api_key,
            "Content-Type": "application/json"
        }
        
        payload = {
            "agent_id": agent_id,
            "turn_detection": {
                "type": "server_vad",
                "threshold": 0.5,
                "prefix_padding_ms": 300,
                "silence_duration_ms": 500
            }
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/realtime/sessions",
                headers=headers,
                json=payload
            )
            
            if response.status_code != 200:
                logger.error(f"ElevenLabs session creation failed: {response.text}")
                raise HTTPException(status_code=500, detail="Failed to create ElevenLabs session")
                
            return response.json()
    
    async def get_session_token(self, session_id: str):
        """Get WebSocket token for ElevenLabs session"""
        if not self.api_key:
            logger.warning("ELEVENLABS_API_KEY not configured, using mock token")
            # Return mock token for development
            return {
                "token": f"mock-token-{session_id}",
                "expires_at": int((datetime.utcnow().timestamp() + 3600) * 1000)  # 1 hour from now
            }
            
        headers = {
            "xi-api-key": self.api_key,
            "Content-Type": "application/json"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/realtime/sessions/{session_id}/token",
                headers=headers
            )
            
            if response.status_code != 200:
                logger.error(f"ElevenLabs token creation failed: {response.text}")
                raise HTTPException(status_code=500, detail="Failed to get ElevenLabs token")
                
            return response.json()

@router.websocket("/ws/llm-agent/{training_id}/{section_id}")
async def llm_agent_websocket(
    websocket: WebSocket,
    training_id: str,
    section_id: str,
    session: Session = Depends(get_session)
):
    """WebSocket endpoint for real-time LLM Agent interactions"""
    await websocket.accept()
    
    try:
        # Get training and section data
        training_stmt = select(Training).where(Training.id == training_id)
        training = session.exec(training_stmt).first()
        
        if not training:
            await websocket.send_json({"type": "error", "message": "Training not found"})
            return
        
        section_stmt = select(TrainingSection).where(
            TrainingSection.id == section_id,
            TrainingSection.training_id == training_id,
            TrainingSection.type == "llm_agent"
        )
        section = session.exec(section_stmt).first()
        
        if not section:
            await websocket.send_json({"type": "error", "message": "LLM Agent section not found"})
            return
        
        # Initialize ElevenLabs realtime client
        elevenlabs_client = ElevenLabsRealtimeClient()
        
        if not ELEVENLABS_API_KEY:
            logger.warning("ELEVENLABS_API_KEY not configured, using mock mode")
            # Send mock context and welcome message
            await websocket.send_json({
                "type": "context",
                "data": {
                    "section_title": section.title,
                    "section_description": section.description,
                    "ready": True,
                    "mock_mode": True
                }
            })
            
            # Send mock welcome message
            await websocket.send_json({
                "type": "conversation.item.created",
                "item": {
                    "type": "agent_response",
                    "status": "in_progress",
                    "content": f"Merhaba! {section.title} bölümüne hoş geldiniz. Mock LLM Agent ile bağlantı kuruldu."
                }
            })
            
            await websocket.send_json({
                "type": "conversation.item.updated",
                "item": {
                    "type": "agent_response",
                    "status": "completed",
                    "content": f"Merhaba! {section.title} bölümüne hoş geldiniz. Mock LLM Agent ile bağlantı kuruldu."
                }
            })
        else:
            # Create ElevenLabs realtime session
            logger.info("🤖 Creating ElevenLabs realtime session...")
            try:
                elevenlabs_session = await elevenlabs_client.create_session()
                logger.info(f"✅ Created ElevenLabs session: {elevenlabs_session['session_id']}")
                
                # Send context with session info
                await websocket.send_json({
                    "type": "context",
                    "data": {
                        "section_title": section.title,
                        "section_description": section.description,
                        "ready": True,
                        "session_id": elevenlabs_session["session_id"],
                        "mock_mode": False
                    }
                })
                
                # Send welcome message
                await websocket.send_json({
                    "type": "conversation.item.created",
                    "item": {
                        "type": "agent_response",
                        "status": "in_progress",
                        "content": f"Merhaba! {section.title} bölümüne hoş geldiniz. ElevenLabs Agent ile bağlantı kuruldu."
                    }
                })
                
                await websocket.send_json({
                    "type": "conversation.item.updated",
                    "item": {
                        "type": "agent_response",
                        "status": "completed",
                        "content": f"Merhaba! {section.title} bölümüne hoş geldiniz. ElevenLabs Agent ile bağlantı kuruldu."
                    }
                })
                
            except Exception as e:
                logger.error(f"❌ Failed to create ElevenLabs session: {str(e)}")
                await websocket.send_json({
                    "type": "error",
                    "message": f"Failed to create ElevenLabs session: {str(e)}"
                })
                return
        
        # Prepare context from section description and script
        context = {
            "training_title": training.title,
            "training_description": training.description,
            "section_title": section.title,
            "section_description": section.description,
            "section_script": section.script,
            "language": section.language or "TR",
            "target_audience": section.target_audience or "Genel"
        }
        
        # Send initial context to client
        await websocket.send_json({
            "type": "context",
            "data": {
                "section_title": section.title,
                "section_description": section.description,
                "ready": True
            }
        })
        
        conversation_id = None
        
        while True:
            try:
                # Receive message from client
                data = await websocket.receive_json()
                message_type = data.get("type")
                
                if message_type == "user_message":
                    user_message = data.get("message", "")
                    
                    if not user_message.strip():
                        await websocket.send_json({"type": "error", "message": "Empty message"})
                        continue
                    
                    if not ELEVENLABS_API_KEY:
                        # Mock response for development
                        await websocket.send_json({
                            "type": "conversation.item.created",
                            "item": {
                                "type": "agent_response",
                                "status": "in_progress",
                                "content": "Mock yanıt: Mesajınızı aldım. Bu geçici bir test endpoint'idir."
                            }
                        })
                        
                        await websocket.send_json({
                            "type": "conversation.item.updated",
                            "item": {
                                "type": "agent_response",
                                "status": "completed",
                                "content": f"Mock yanıt: '{user_message}' mesajınız için teşekkürler. Bu geçici bir test endpoint'idir."
                            }
                        })
                    else:
                        # For ElevenLabs realtime, we'll handle this differently
                        # The frontend will connect directly to ElevenLabs WebSocket
                        await websocket.send_json({
                            "type": "conversation.item.created",
                            "item": {
                                "type": "agent_response",
                                "status": "in_progress",
                                "content": "ElevenLabs realtime session aktif. Sesli sohbet için mikrofonu kullanın."
                            }
                        })
                        
                        await websocket.send_json({
                            "type": "conversation.item.updated",
                            "item": {
                                "type": "agent_response",
                                "status": "completed",
                                "content": f"'{user_message}' mesajınız için teşekkürler. ElevenLabs realtime session aktif."
                            }
                        })
                
                elif message_type == "audio":
                    # Handle audio input (mock response)
                    await websocket.send_json({
                        "type": "conversation.item.created",
                        "item": {
                            "type": "agent_response",
                            "status": "in_progress",
                            "content": "Mock yanıt: Sesli mesajınızı aldım. Bu geçici bir test endpoint'idir."
                        }
                    })
                    
                    await websocket.send_json({
                        "type": "conversation.item.updated",
                        "item": {
                            "type": "agent_response",
                            "status": "completed",
                            "content": "Mock yanıt: Sesli mesajınızı aldım. Bu geçici bir test endpoint'idir."
                        }
                    })
                
                elif message_type == "ping":
                    await websocket.send_json({"type": "pong"})
                
                elif message_type == "session_complete":
                    # Handle session completion
                    await websocket.send_json({
                        "type": "session_completed",
                        "data": {"message": "Session completed successfully"}
                    })
                    break
                
                else:
                    await websocket.send_json({"type": "error", "message": "Unknown message type"})
                    
            except Exception as e:
                logger.error(f"Error in LLM Agent WebSocket: {str(e)}")
                await websocket.send_json({
                    "type": "error", 
                    "message": f"Internal error: {str(e)}"
                })
                break
                
    except Exception as e:
        logger.error(f"LLM Agent WebSocket error: {str(e)}")
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except:
            pass
    finally:
        try:
            await websocket.close()
        except:
            pass

@router.post("/start/{training_id}/{section_id}", operation_id="start_llm_agent_session")
async def start_llm_agent_session(
    training_id: str,
    section_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Start a new LLM Agent session"""
    try:
        logger.info(f"🚀 Starting LLM Agent session - training_id: {training_id}, section_id: {section_id}")
        logger.info(f"👤 Current user: {current_user.id} ({current_user.email})")
        
        # Verify training and section exist
        logger.info(f"🔍 Looking for training with ID: {training_id}")
        training_stmt = select(Training).where(Training.id == training_id)
        training = session.exec(training_stmt).first()
        
        if not training:
            logger.error(f"❌ Training not found: {training_id}")
            raise HTTPException(status_code=404, detail="Training not found")
        
        logger.info(f"✅ Found training: {training.title}")
        
        logger.info(f"🔍 Looking for section with ID: {section_id}")
        section_stmt = select(TrainingSection).where(
            TrainingSection.id == section_id,
            TrainingSection.training_id == training_id,
            TrainingSection.type == "llm_agent"
        )
        section = session.exec(section_stmt).first()
        
        if not section:
            logger.error(f"❌ LLM Agent section not found: {section_id}")
            # Let's check what sections exist for this training
            all_sections = session.exec(select(TrainingSection).where(TrainingSection.training_id == training_id)).all()
            logger.info(f"📋 Available sections for training {training_id}:")
            for s in all_sections:
                logger.info(f"  - {s.id}: {s.title} (type: {s.type})")
            raise HTTPException(status_code=404, detail="LLM Agent section not found")
        
        logger.info(f"✅ Found section: {section.title} (type: {section.type})")
        
        # Create a new user session for tracking
        logger.info("💾 Creating user session...")
        user_session = DBSession(
            user_id=current_user.id,
            training_id=training_id,
            status="active"
        )
        session.add(user_session)
        session.commit()
        session.refresh(user_session)
        logger.info(f"✅ Created user session: {user_session.id}")
        
        # Log the interaction
        logger.info("📝 Logging interaction...")
        interaction = UserInteraction(
            session_id=user_session.id,
            user_id=current_user.id,
            training_id=training_id,
            section_id=section_id,
            interaction_type="llm_agent_start",
            content=f"Started LLM Agent session for section: {section.title}",
            success=True
        )
        session.add(interaction)
        session.commit()
        logger.info("✅ Interaction logged")
        
        # Check ElevenLabs API key
        logger.info(f"🔑 ELEVENLABS_API_KEY configured: {bool(ELEVENLABS_API_KEY)}")
        
        result = {
            "success": True,
            "session_id": user_session.id,
            "section": {
                "id": section.id,
                "title": section.title,
                "description": section.description,
                "script": section.script
            },
            "mock_mode": not bool(ELEVENLABS_API_KEY)
        }
        
        logger.info(f"🎉 LLM Agent session started successfully: {result}")
        return result
        
    except HTTPException as he:
        logger.error(f"❌ HTTPException in start_llm_agent_session: {he.detail}")
        raise
    except Exception as e:
        logger.error(f"❌ Error starting LLM Agent session: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to start session: {str(e)}")

@router.post("/end/{session_id}", operation_id="end_llm_agent_session")
async def end_llm_agent_session(
    session_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """End an LLM Agent session"""
    try:
        # Find the session
        user_session_stmt = select(DBSession).where(
            DBSession.id == session_id,
            DBSession.user_id == current_user.id
        )
        user_session = session.exec(user_session_stmt).first()
        
        if not user_session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Update session status
        user_session.status = "completed"
        session.add(user_session)
        
        # Log the interaction
        interaction = UserInteraction(
            session_id=user_session.id,
            user_id=current_user.id,
            training_id=user_session.training_id,
            interaction_type="llm_agent_end",
            content="Ended LLM Agent session",
            success=True
        )
        session.add(interaction)
        session.commit()
        
        return {"success": True, "message": "Session ended successfully"}
        
    except Exception as e:
        logger.error(f"Error ending LLM Agent session: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
