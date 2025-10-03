#!/usr/bin/env python3
"""
ElevenLabs Agent konfigürasyonunu kontrol et
"""

import requests
import json
import os
from datetime import datetime

# ElevenLabs API
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1"

# Agent ID (kodda kullanılan)
AGENT_ID = "agent_2901k5a3e15feg6sjmw44apewq20"

def check_agent_configuration():
    """ElevenLabs agent konfigürasyonunu kontrol et"""
    
    if not ELEVENLABS_API_KEY:
        print("❌ ELEVENLABS_API_KEY environment variable not set")
        return False
    
    headers = {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json"
    }
    
    try:
        # Agent bilgilerini al
        print(f"🔍 Checking ElevenLabs Agent: {AGENT_ID}")
        
        response = requests.get(
            f"{ELEVENLABS_BASE_URL}/convai/agents/{AGENT_ID}",
            headers=headers
        )
        
        if response.status_code == 200:
            agent_data = response.json()
            print("✅ Agent found!")
            print(f"📋 Agent Name: {agent_data.get('name', 'N/A')}")
            print(f"📋 Agent Description: {agent_data.get('description', 'N/A')}")
            
            # Webhook URL'i kontrol et
            webhook_url = agent_data.get('webhook_url')
            if webhook_url:
                print(f"✅ Webhook URL: {webhook_url}")
            else:
                print("❌ No webhook URL configured")
            
            # Evaluation criteria kontrol et
            evaluation_criteria = agent_data.get('evaluation_criteria', [])
            if evaluation_criteria:
                print(f"✅ Evaluation Criteria ({len(evaluation_criteria)}):")
                for criteria in evaluation_criteria:
                    print(f"  - {criteria.get('name', 'N/A')}: {criteria.get('description', 'N/A')}")
            else:
                print("❌ No evaluation criteria configured")
            
            return True
            
        else:
            print(f"❌ Failed to get agent: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error checking agent: {e}")
        return False

def check_webhook_endpoint():
    """Webhook endpoint'inin çalışıp çalışmadığını kontrol et"""
    
    try:
        print("\n🔍 Checking webhook endpoint...")
        
        # Test webhook endpoint
        response = requests.get("http://localhost:8000/elevenlabs-webhook/test")
        
        if response.status_code == 200:
            print("✅ Webhook endpoint is working")
            return True
        else:
            print(f"❌ Webhook endpoint failed: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error checking webhook: {e}")
        return False

def main():
    print("🔍 ElevenLabs Agent Configuration Check")
    print("=" * 50)
    
    # Agent konfigürasyonunu kontrol et
    agent_ok = check_agent_configuration()
    
    # Webhook endpoint'ini kontrol et
    webhook_ok = check_webhook_endpoint()
    
    print("\n📋 Summary:")
    print(f"Agent Configuration: {'✅ OK' if agent_ok else '❌ FAILED'}")
    print(f"Webhook Endpoint: {'✅ OK' if webhook_ok else '❌ FAILED'}")
    
    if agent_ok and webhook_ok:
        print("\n🎉 ElevenLabs integration is properly configured!")
    else:
        print("\n⚠️ ElevenLabs integration needs configuration:")
        if not agent_ok:
            print("- Check agent configuration in ElevenLabs dashboard")
            print("- Ensure evaluation criteria are defined")
            print("- Verify webhook URL is set")
        if not webhook_ok:
            print("- Check webhook endpoint is accessible")
            print("- Verify server is running")

if __name__ == "__main__":
    main()
