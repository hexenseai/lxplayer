"""
Test script for Interaction Session API endpoints
"""

import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"

def test_interaction_session_api():
    """Test interaction session API endpoints"""
    
    print("🧪 Testing Interaction Session API...")
    
    # Test data
    test_data = {
        "training_id": "32535350-5109-4df3-82b0-1f8061165fd9",  # Existing training ID
        "user_id": "c6ce3b39-45d4-40d8-86d7-cd047dba78c9",     # Existing user ID
        "access_code": "zw9hvdm5f4k",                           # Existing access code
        "current_section_id": "303c26a0-2bf4-4800-aa30-b6afe03ffefe"  # Existing section ID
    }
    
    # 1. Create interaction session
    print("\n1️⃣ Creating interaction session...")
    response = requests.post(
        f"{BASE_URL}/api/interaction-sessions/",
        json=test_data,
        headers={"Content-Type": "application/json"}
    )
    
    if response.status_code == 200:
        session_data = response.json()
        session_id = session_data["id"]
        print(f"✅ Session created: {session_id}")
        print(f"   Status: {session_data['status']}")
        print(f"   Current Section: {session_data['current_section_id']}")
    else:
        print(f"❌ Failed to create session: {response.status_code}")
        print(f"   Error: {response.text}")
        return
    
    # 2. Get session
    print(f"\n2️⃣ Getting session {session_id}...")
    response = requests.get(f"{BASE_URL}/api/interaction-sessions/{session_id}")
    
    if response.status_code == 200:
        session_data = response.json()
        print(f"✅ Session retrieved successfully")
        print(f"   Interactions: {session_data['interactions_count']}")
        print(f"   Time spent: {session_data['total_time_spent']}s")
    else:
        print(f"❌ Failed to get session: {response.status_code}")
        print(f"   Error: {response.text}")
    
    # 3. Send message to LLM
    print(f"\n3️⃣ Sending message to LLM...")
    message_data = {
        "message": "Merhaba! Bu eğitimde ne öğreneceğim?",
        "message_type": "user"
    }
    
    response = requests.post(
        f"{BASE_URL}/api/interaction-sessions/{session_id}/messages",
        json=message_data,
        headers={"Content-Type": "application/json"}
    )
    
    if response.status_code == 200:
        llm_response = response.json()
        print(f"✅ LLM response received")
        print(f"   Message: {llm_response['message'][:100]}...")
        print(f"   Suggestions: {len(llm_response['suggestions'])}")
        print(f"   Processing time: {llm_response.get('processing_time_ms', 'N/A')}ms")
    else:
        print(f"❌ Failed to send message: {response.status_code}")
        print(f"   Error: {response.text}")
    
    # 4. Get session messages
    print(f"\n4️⃣ Getting session messages...")
    response = requests.get(f"{BASE_URL}/api/interaction-sessions/{session_id}/messages")
    
    if response.status_code == 200:
        messages = response.json()
        print(f"✅ Retrieved {len(messages)} messages")
        for i, msg in enumerate(messages[:3]):  # Show first 3 messages
            print(f"   {i+1}. [{msg['message_type']}] {msg['message'][:50]}...")
    else:
        print(f"❌ Failed to get messages: {response.status_code}")
        print(f"   Error: {response.text}")
    
    # 5. Get training progress
    print(f"\n5️⃣ Getting training progress...")
    response = requests.get(f"{BASE_URL}/api/interaction-sessions/{session_id}/progress")
    
    if response.status_code == 200:
        progress = response.json()
        print(f"✅ Progress retrieved")
        print(f"   Completion: {progress['completion_percentage']:.1f}%")
        print(f"   Sections: {progress['completed_sections']}/{progress['total_sections']}")
        print(f"   Total time: {progress['total_time_spent']}s")
        print(f"   Interactions: {progress['total_interactions']}")
    else:
        print(f"❌ Failed to get progress: {response.status_code}")
        print(f"   Error: {response.text}")
    
    # 6. Update section progress
    print(f"\n6️⃣ Updating section progress...")
    section_id = test_data["current_section_id"]
    progress_data = {
        "status": "in_progress",
        "time_spent": 120,
        "interactions_count": 3,
        "completion_percentage": 50.0
    }
    
    response = requests.put(
        f"{BASE_URL}/api/interaction-sessions/{session_id}/sections/{section_id}/progress",
        json=progress_data,
        headers={"Content-Type": "application/json"}
    )
    
    if response.status_code == 200:
        section_progress = response.json()
        print(f"✅ Section progress updated")
        print(f"   Status: {section_progress['status']}")
        print(f"   Time spent: {section_progress['time_spent']}s")
        print(f"   Completion: {section_progress['completion_percentage']}%")
    else:
        print(f"❌ Failed to update progress: {response.status_code}")
        print(f"   Error: {response.text}")
    
    # 7. Update session
    print(f"\n7️⃣ Updating session...")
    update_data = {
        "status": "active",
        "current_phase": "interaction",
        "total_time_spent": 180,
        "interactions_count": 5
    }
    
    response = requests.put(
        f"{BASE_URL}/api/interaction-sessions/{session_id}",
        json=update_data,
        headers={"Content-Type": "application/json"}
    )
    
    if response.status_code == 200:
        updated_session = response.json()
        print(f"✅ Session updated")
        print(f"   Phase: {updated_session['current_phase']}")
        print(f"   Total time: {updated_session['total_time_spent']}s")
        print(f"   Interactions: {updated_session['interactions_count']}")
    else:
        print(f"❌ Failed to update session: {response.status_code}")
        print(f"   Error: {response.text}")
    
    print(f"\n🎉 Interaction Session API test completed!")
    print(f"   Session ID: {session_id}")
    print(f"   You can view the session at: {BASE_URL}/api/interaction-sessions/{session_id}")

if __name__ == "__main__":
    test_interaction_session_api()
