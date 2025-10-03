from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
import httpx
import os
import json
import logging

from ..db import get_session
from ..models import InteractionSession

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/elevenlabs", tags=["elevenlabs"])

async def get_elevenlabs_conversation(conversation_id: str) -> Dict[str, Any]:
    """Fetch conversation details from ElevenLabs API"""
    api_key = os.getenv("ELEVENLABS_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ElevenLabs API key not configured")
    
    url = f"https://api.elevenlabs.io/v1/convai/conversations/{conversation_id}"
    headers = {
        "xi-api-key": api_key,
        "Content-Type": "application/json"
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as e:
        logger.error(f"ElevenLabs API error: {e.response.status_code} - {e.response.text}")
        raise HTTPException(status_code=e.response.status_code, detail=f"ElevenLabs API error: {e.response.text}")
    except Exception as e:
        logger.error(f"Failed to fetch ElevenLabs conversation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch conversation: {str(e)}")

@router.get("/conversation/{conversation_id}")
async def get_conversation_details(
    conversation_id: str,
    session: Session = Depends(get_session)
):
    """Get ElevenLabs conversation details"""
    try:
        conversation_data = await get_elevenlabs_conversation(conversation_id)
        
        # Extract evaluation results from conversation analysis
        evaluation_results = []
        if conversation_data.get("analysis"):
            analysis = conversation_data["analysis"]
            # Process analysis data to extract evaluation criteria results
            # This depends on how ElevenLabs structures their analysis data
            
        return {
            "conversation_id": conversation_id,
            "status": conversation_data.get("status"),
            "transcript": conversation_data.get("transcript", []),
            "metadata": conversation_data.get("metadata", {}),
            "analysis": conversation_data.get("analysis"),
            "evaluation_results": evaluation_results
        }
    except Exception as e:
        logger.error(f"Error fetching conversation {conversation_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/session/{session_id}/conversation")
async def get_session_conversation(
    session_id: str,
    session: Session = Depends(get_session)
):
    """Get ElevenLabs conversation for a specific interaction session"""
    try:
        # Get interaction session
        interaction_session = session.get(InteractionSession, session_id)
        if not interaction_session:
            raise HTTPException(status_code=404, detail="Interaction session not found")
        
        # Extract conversation_id from metadata
        metadata = {}
        if interaction_session.metadata_json:
            try:
                metadata = json.loads(interaction_session.metadata_json)
            except json.JSONDecodeError:
                pass
        
        conversation_id = metadata.get("elevenlabs_conversation_id")
        if not conversation_id:
            logger.warning(f"No ElevenLabs conversation_id found in session {session_id} metadata: {metadata}")
            raise HTTPException(status_code=404, detail="No ElevenLabs conversation found for this session")
        
        # Fetch conversation details
        conversation_data = await get_elevenlabs_conversation(conversation_id)
        
        # Extract evaluation results from conversation analysis
        evaluation_results = []
        if conversation_data.get("analysis"):
            analysis = conversation_data["analysis"]
            # Process analysis data to extract evaluation criteria results
            # This depends on how ElevenLabs structures their analysis data
            
        return {
            "session_id": session_id,
            "conversation_id": conversation_id,
            "status": conversation_data.get("status"),
            "transcript": conversation_data.get("transcript", []),
            "metadata": conversation_data.get("metadata", {}),
            "analysis": conversation_data.get("analysis"),
            "evaluation_results": evaluation_results
        }
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"Error fetching session conversation {session_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")
