import asyncio
import json
import os
from openai import AsyncOpenAI
from app.ai_flow_engine import AIFlowEngine

# Test flow JSON - kullanıcının verdiği flow'u kullan
TEST_FLOW = {
    "nodes": [
        {
            "id": "start-1754857476857",
            "type": "start",
            "data": {"label": "Eğitim Başlıyor"}
        },
        {
            "id": "prompt-1754910029393",
            "type": "prompt",
            "data": {
                "label": "Karşılama",
                "prompt": "Kullanıcı ile tanışma ve eğitim hakkında kısa bir bilgilendirme yapacaksın. Kullanıcının eğitim ile ilgili sorularına içerik üzerinden cevap vereceksin.",
                "purpose": "Kullanıcı eğitime başlamaya *hazır* olduğunda devam et. Eğitmen hakkında bilgi isterse *eğitmen* üzerinden devam et.",
                "initial_message": "Kullanıcıya ismi ile sıcak bir karşılama yap."
            }
        },
        {
            "id": "question-1755013314208",
            "type": "question",
            "data": {
                "label": "Beklentiler",
                "question": "Yapay Zeka işbirliği üzerine bu eğitimden beklentileriniz nelerdir?"
            }
        },
        {
            "id": "section-1754857489584",
            "type": "section",
            "data": {
                "label": "Birinci Bölüm",
                "sectionId": "e4f4cc44-aa18-4afa-a06e-63d107fa48ab"
            }
        }
    ],
    "edges": [
        {
            "source": "start-1754857476857",
            "target": "prompt-1754910029393"
        },
        {
            "source": "prompt-1754910029393",
            "target": "question-1755013314208",
            "data": {"label": "hazır"}
        },
        {
            "source": "question-1755013314208",
            "target": "section-1754857489584"
        }
    ]
}

async def test_flow_debug():
    """Test flow execution with debug logging"""
    print("=== Flow Debug Test ===\n")
    
    # Initialize OpenAI client
    client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY", "test-key"))
    
    # Initialize flow engine
    flow_engine = AIFlowEngine(client)
    
    # Test context
    training_context = {
        "title": "Yapay Zeka ile Nasıl Birlikte Çalışılır",
        "description": "Bu bir test eğitimidir"
    }
    
    try:
        # Test 1: Initial flow execution (no user message)
        print("Test 1: Initial flow execution (no user message)")
        print("-" * 50)
        
        result = await flow_engine.execute_flow(
            json.dumps(TEST_FLOW), 
            "", 
            training_context
        )
        
        print(f"Result: {json.dumps(result, indent=2, ensure_ascii=False)}")
        print(f"Current Node: {flow_engine.state.current_node_id}")
        print(f"Visited Nodes: {flow_engine.state.visited_nodes}")
        print()
        
        # Test 2: User says "start"
        print("Test 2: User says 'start'")
        print("-" * 50)
        
        result = await flow_engine.execute_flow(
            json.dumps(TEST_FLOW), 
            "start", 
            training_context
        )
        
        print(f"Result: {json.dumps(result, indent=2, ensure_ascii=False)}")
        print(f"Current Node: {flow_engine.state.current_node_id}")
        print(f"Visited Nodes: {flow_engine.state.visited_nodes}")
        print()
        
        # Test 3: User says "hazır"
        print("Test 3: User says 'hazır'")
        print("-" * 50)
        
        result = await flow_engine.execute_flow(
            json.dumps(TEST_FLOW), 
            "hazır", 
            training_context
        )
        
        print(f"Result: {json.dumps(result, indent=2, ensure_ascii=False)}")
        print(f"Current Node: {flow_engine.state.current_node_id}")
        print(f"Visited Nodes: {flow_engine.state.visited_nodes}")
        print()
        
        # Test 4: User answers question
        print("Test 4: User answers question")
        print("-" * 50)
        
        result = await flow_engine.execute_flow(
            json.dumps(TEST_FLOW), 
            "Bu eğitimden çok şey öğrenmeyi bekliyorum", 
            training_context
        )
        
        print(f"Result: {json.dumps(result, indent=2, ensure_ascii=False)}")
        print(f"Current Node: {flow_engine.state.current_node_id}")
        print(f"Visited Nodes: {flow_engine.state.visited_nodes}")
        print()
        
    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_flow_debug())
