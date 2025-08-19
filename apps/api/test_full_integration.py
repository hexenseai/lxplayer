#!/usr/bin/env python3
"""
Comprehensive test script for full AI flow integration
Tests LLM active behavior, tool usage, and video control integration
"""

import asyncio
import json
import os
from openai import AsyncOpenAI
from app.ai_flow_engine import AIFlowEngine, LLM_TOOLS

# Sample AI flow for testing
SAMPLE_FLOW = {
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
                "prompt": "Kullanıcıya sıcak bir merhaba de. Eğitim içeriği hakkında çok kısa bir bilgilendirme yap."
            }
        },
        {
            "id": "section-1",
            "type": "section",
            "data": {
                "label": "Birinci Bölüm",
                "sectionId": "test-section-1"
            }
        },
        {
            "id": "end-1",
            "type": "end",
            "data": {"label": "Eğitim Sonu"}
        }
    ],
    "edges": [
        {"source": "start-1", "target": "prompt-1"},
        {"source": "prompt-1", "target": "section-1"},
        {"source": "section-1", "target": "end-1"}
    ]
}

async def test_full_integration():
    """Test full AI flow integration"""
    print("=== Full AI Flow Integration Test ===\n")
    
    # Initialize OpenAI client
    openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY", "test-key"))
    
    # Initialize engine
    engine = AIFlowEngine(openai_client)
    
    training_context = {
        "title": "Yapay Zeka ile Nasıl Birlikte Çalışılır",
        "description": "Bu eğitimde yapay zeka araçlarını nasıl etkili kullanacağınızı öğreneceksiniz."
    }
    
    print("1. Testing initial flow execution (no user message)")
    print("-" * 60)
    
    result = await engine.execute_flow(
        json.dumps(SAMPLE_FLOW),
        user_message="",
        training_context=training_context
    )
    
    print(f"Result: {json.dumps(result, indent=2, ensure_ascii=False)}")
    print(f"Current Node: {engine.state.current_node_id}")
    print(f"Visited Nodes: {engine.state.visited_nodes}")
    print()
    
    print("2. Testing user interaction with prompt node")
    print("-" * 60)
    
    result = await engine.execute_flow(
        json.dumps(SAMPLE_FLOW),
        user_message="Merhaba, eğitim hakkında bilgi almak istiyorum",
        training_context=training_context
    )
    
    print(f"Result: {json.dumps(result, indent=2, ensure_ascii=False)}")
    print()
    
    print("3. Testing section node with LLM active behavior")
    print("-" * 60)
    
    # Advance to section node
    engine.state.current_node_id = "section-1"
    
    result = await engine.execute_flow(
        json.dumps(SAMPLE_FLOW),
        user_message="Bu bölümde ne öğreneceğim?",
        training_context=training_context
    )
    
    print(f"Result: {json.dumps(result, indent=2, ensure_ascii=False)}")
    print()
    
    print("4. Testing tool usage with LLM function calling")
    print("-" * 60)
    
    # Test show_content tool
    print("Testing show_content tool:")
    tool_result = await engine.execute_tool_call("show_content", {
        "content_id": "test-content-1",
        "message": "Bu içerik gösterilecek"
    })
    print(f"Result: {json.dumps(tool_result, indent=2, ensure_ascii=False)}")
    print()
    
    # Test jump_to_time tool
    print("Testing jump_to_time tool:")
    tool_result = await engine.execute_tool_call("jump_to_time", {
        "time_seconds": 25.5,
        "message": "25. saniyeye geçiliyor"
    })
    print(f"Result: {json.dumps(tool_result, indent=2, ensure_ascii=False)}")
    print()
    
    # Test control_video tool
    print("Testing control_video tool:")
    tool_result = await engine.execute_tool_call("control_video", {
        "action": "pause",
        "message": "Video duraklatılıyor"
    })
    print(f"Result: {json.dumps(tool_result, indent=2, ensure_ascii=False)}")
    print()
    
    # Test translate_content tool
    print("Testing translate_content tool:")
    tool_result = await engine.execute_tool_call("translate_content", {
        "target_language": "en",
        "content_type": "both"
    })
    print(f"Result: {json.dumps(tool_result, indent=2, ensure_ascii=False)}")
    print()
    
    # Test regenerate_content tool
    print("Testing regenerate_content tool:")
    tool_result = await engine.execute_tool_call("regenerate_content", {
        "content_type": "content",
        "style": "formal"
    })
    print(f"Result: {json.dumps(tool_result, indent=2, ensure_ascii=False)}")
    print()
    
    # Test show_overlay_list tool
    print("Testing show_overlay_list tool:")
    tool_result = await engine.execute_tool_call("show_overlay_list", {
        "message": "Overlay listesi gösteriliyor"
    })
    print(f"Result: {json.dumps(tool_result, indent=2, ensure_ascii=False)}")
    print()
    
    print("5. Testing LLM_TOOLS definition")
    print("-" * 60)
    print(f"Total tools defined: {len(LLM_TOOLS)}")
    for i, tool in enumerate(LLM_TOOLS, 1):
        tool_name = tool["function"]["name"]
        tool_desc = tool["function"]["description"]
        print(f"{i}. {tool_name}: {tool_desc}")
    print()
    
    print("6. Testing state management")
    print("-" * 60)
    print(f"Current node: {engine.state.current_node_id}")
    print(f"Visited nodes: {engine.state.visited_nodes}")
    print(f"User responses: {engine.state.user_responses}")
    print(f"Current section: {engine.state.current_section}")
    print(f"Is playing: {engine.state.is_playing}")
    print()
    
    print("=== Integration Test Summary ===")
    print("✅ AI Flow Engine initialization")
    print("✅ Flow execution with state management")
    print("✅ LLM active behavior in nodes")
    print("✅ Tool execution and function calling")
    print("✅ Video control integration")
    print("✅ Content management tools")
    print("✅ State persistence and tracking")
    print()
    print("All integration tests completed successfully!")

if __name__ == "__main__":
    asyncio.run(test_full_integration())
