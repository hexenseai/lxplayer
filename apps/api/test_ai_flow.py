#!/usr/bin/env python3
"""
Test script for AI Flow Engine with LLM active behavior and tool integration
"""

import asyncio
import json
import os
from openai import AsyncOpenAI
from app.ai_flow_engine import AIFlowEngine

# Test flow JSON
TEST_FLOW = {
    "nodes": [
        {
            "id": "start-1",
            "type": "start",
            "data": {"label": "Eğitim Başlıyor"}
        },
        {
            "id": "prompt-1",
            "type": "prompt",
            "data": {
                "label": "Karşılama",
                "prompt": "Kullanıcı ile tanışma ve eğitim hakkında kısa bir bilgilendirme yapacaksın.",
                "purpose": "Kullanıcı eğitime başlamaya *hazır* olduğunda devam et.",
                "initial_message": "Kullanıcıya ismi ile sıcak bir karşılama yap."
            }
        },
        {
            "id": "section-1",
            "type": "section",
            "data": {
                "label": "Birinci Bölüm",
                "sectionId": "test-section-1"
            }
        }
    ],
    "edges": [
        {
            "source": "start-1",
            "target": "prompt-1"
        },
        {
            "source": "prompt-1",
            "target": "section-1",
            "data": {"label": "hazır"}
        }
    ]
}

async def test_initial_message():
    """Test initial message generation"""
    print("Testing AI Flow Engine Initial Message Generation...")
    
    # Initialize OpenAI client
    client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY", "test-key"))
    
    # Initialize flow engine
    flow_engine = AIFlowEngine(client)
    
    # Test context
    training_context = {
        "title": "Test Eğitimi",
        "description": "Bu bir test eğitimidir"
    }
    
    try:
        # Execute flow with no user message (should trigger initial message)
        result = await flow_engine.execute_flow(
            json.dumps(TEST_FLOW), 
            "", 
            training_context
        )
        
        print("Initial execution result:")
        print(f"Action: {result.get('action')}")
        print(f"Message: {result.get('message')}")
        print(f"Waiting for response: {result.get('waiting_for_response')}")
        print(f"Purpose completed: {result.get('purpose_completed')}")
        
        # Check if the message is not the raw initial_message
        if result.get('message') != "Kullanıcıya ismi ile sıcak bir karşılama yap.":
            print("✅ SUCCESS: Initial message was processed by LLM")
        else:
            print("❌ FAILED: Initial message was sent as raw text")
            
        # Test with user response
        print("\nTesting with user response...")
        result2 = await flow_engine.execute_flow(
            json.dumps(TEST_FLOW), 
            "Hazırım, başlayalım", 
            training_context
        )
        
        print("User response result:")
        print(f"Action: {result2.get('action')}")
        print(f"Message: {result2.get('message')}")
        print(f"Waiting for response: {result2.get('waiting_for_response')}")
        print(f"Purpose completed: {result2.get('purpose_completed')}")
        
    except Exception as e:
        print(f"❌ ERROR: {e}")

if __name__ == "__main__":
    asyncio.run(test_initial_message())
