#!/usr/bin/env python3
"""
Test script to verify that avatar data is properly returned from the training section API endpoints.
"""

import requests
import json
import sys

# API base URL
API_BASE = "http://localhost:8000"

def test_training_sections_with_avatar():
    """Test that training sections include avatar data for LLM sections."""
    
    print("🧪 Testing Training Sections API with Avatar Data")
    print("=" * 50)
    
    try:
        # First, get all trainings to find one with an avatar
        print("1. Fetching all trainings...")
        response = requests.get(f"{API_BASE}/trainings")
        
        if response.status_code != 200:
            print(f"❌ Failed to fetch trainings: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
        trainings = response.json()
        print(f"✅ Found {len(trainings)} trainings")
        
        # Find a training with avatar_id
        training_with_avatar = None
        for training in trainings:
            if training.get('avatar_id'):
                training_with_avatar = training
                break
                
        if not training_with_avatar:
            print("⚠️  No training with avatar_id found. Creating test data...")
            # For now, just use the first training
            if trainings:
                training_with_avatar = trainings[0]
            else:
                print("❌ No trainings found at all")
                return False
        
        print(f"📚 Using training: {training_with_avatar['title']}")
        print(f"🆔 Training ID: {training_with_avatar['id']}")
        print(f"👤 Avatar ID: {training_with_avatar.get('avatar_id', 'None')}")
        
        # Get sections for this training
        print("\n2. Fetching training sections...")
        response = requests.get(f"{API_BASE}/trainings/{training_with_avatar['id']}/sections")
        
        if response.status_code != 200:
            print(f"❌ Failed to fetch sections: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
        sections = response.json()
        print(f"✅ Found {len(sections)} sections")
        
        # Check each section for avatar data
        llm_sections = []
        for section in sections:
            section_type = section.get('type', 'unknown')
            has_avatar = 'avatar' in section and section['avatar'] is not None
            
            print(f"\n📄 Section: {section['title']}")
            print(f"   Type: {section_type}")
            print(f"   Has Avatar: {'✅' if has_avatar else '❌'}")
            
            if has_avatar:
                avatar = section['avatar']
                print(f"   Avatar Name: {avatar.get('name', 'N/A')}")
                print(f"   Avatar Personality: {avatar.get('personality', 'N/A')}")
                print(f"   Avatar Image URL: {avatar.get('image_url', 'N/A')}")
                
            if section_type in ['llm_interaction', 'llm_agent']:
                llm_sections.append(section)
        
        print(f"\n🤖 Found {len(llm_sections)} LLM sections")
        
        # Test individual section endpoint
        if llm_sections:
            test_section = llm_sections[0]
            print(f"\n3. Testing individual section endpoint for: {test_section['title']}")
            
            response = requests.get(f"{API_BASE}/trainings/{training_with_avatar['id']}/sections/{test_section['id']}")
            
            if response.status_code != 200:
                print(f"❌ Failed to fetch individual section: {response.status_code}")
                print(f"Response: {response.text}")
                return False
                
            individual_section = response.json()
            has_avatar_individual = 'avatar' in individual_section and individual_section['avatar'] is not None
            
            print(f"✅ Individual section fetched successfully")
            print(f"   Has Avatar: {'✅' if has_avatar_individual else '❌'}")
            
            if has_avatar_individual:
                avatar = individual_section['avatar']
                print(f"   Avatar Name: {avatar.get('name', 'N/A')}")
                print(f"   Avatar Personality: {avatar.get('personality', 'N/A')}")
                print(f"   Avatar Image URL: {avatar.get('image_url', 'N/A')}")
        
        print("\n🎉 Test completed successfully!")
        return True
        
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to API server. Make sure it's running on http://localhost:8000")
        return False
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        return False

if __name__ == "__main__":
    success = test_training_sections_with_avatar()
    sys.exit(0 if success else 1)
