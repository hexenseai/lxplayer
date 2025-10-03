#!/usr/bin/env python3
"""
ElevenLabs Webhook Monitor Script
Bu script sunucudaki webhook aktivitelerini izler ve logları takip eder.
"""

import requests
import json
import time
import sys
from datetime import datetime, timedelta
import argparse

# API base URL - production'da değiştirin
API_BASE_URL = "http://localhost:8000"  # Development
# API_BASE_URL = "https://your-production-domain.com"  # Production

def get_auth_token():
    """API token al - bu kısmı kendi authentication sisteminize göre ayarlayın"""
    # Örnek: JWT token veya API key
    return "your-auth-token-here"

def check_webhook_endpoint():
    """Webhook endpoint'inin çalışıp çalışmadığını kontrol et"""
    try:
        response = requests.get(f"{API_BASE_URL}/elevenlabs-webhook/test")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Webhook endpoint çalışıyor: {data['message']}")
            print(f"🔐 Secret configured: {data.get('secret_configured', False)}")
            return True
        else:
            print(f"❌ Webhook endpoint hatası: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Webhook endpoint'e erişim hatası: {e}")
        return False

def monitor_webhook_activity():
    """Son webhook aktivitelerini izle"""
    try:
        headers = {"Authorization": f"Bearer {get_auth_token()}"}
        response = requests.get(f"{API_BASE_URL}/elevenlabs-webhook/monitor", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            print(f"\n📊 WEBHOOK ACTIVITY REPORT")
            print(f"🕐 Monitoring Period: {data['monitoring_period']}")
            print(f"📈 Total Evaluations: {data['total_evaluations']}")
            print(f"👥 Unique Sessions: {data['unique_sessions']}")
            print(f"🔐 Secret Configured: {data['webhook_secret_configured']}")
            print(f"⏰ Report Time: {data['timestamp']}")
            
            if data['sessions']:
                print(f"\n📋 SESSION DETAILS:")
                for session in data['sessions'][:5]:  # İlk 5 session
                    print(f"  🆔 Session: {session['session_id']}")
                    print(f"  👤 User: {session['user_id']}")
                    print(f"  🎯 Training: {session['training_id']}")
                    print(f"  📊 Evaluations: {session['evaluations_count']}")
                    print(f"  ⏰ Last: {session['last_evaluation']}")
                    print(f"  🏆 Total Score: {session['total_score']}")
                    print("  " + "-" * 50)
            else:
                print("📭 No recent webhook activity found")
                
        else:
            print(f"❌ Monitoring endpoint hatası: {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Monitoring hatası: {e}")

def send_test_webhook():
    """Test webhook gönder"""
    test_data = {
        "type": "post_call_transcription",
        "data": {
            "conversation_id": "test-conversation-123",
            "agent_id": "test-agent-456",
            "analysis": {
                "call_successful": "success",
                "transcript_summary": "Test conversation completed successfully",
                "evaluation_criteria_results": {
                    "communication_skills": {
                        "status": "success",
                        "score": 85,
                        "comment": "Good communication demonstrated"
                    }
                }
            }
        },
        "metadata": {
            "session_id": "test-session-789",
            "timestamp": datetime.utcnow().isoformat()
        }
    }
    
    try:
        print("🚀 Test webhook gönderiliyor...")
        response = requests.post(
            f"{API_BASE_URL}/elevenlabs-webhook/debug",
            json=test_data,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Test webhook başarılı!")
            print(f"📊 Response: {json.dumps(result, indent=2)}")
        else:
            print(f"❌ Test webhook hatası: {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Test webhook hatası: {e}")

def watch_logs():
    """Logları izle (sürekli)"""
    print("👀 Webhook logları izleniyor... (Ctrl+C ile çıkış)")
    print("📝 Yeni webhook'lar aşağıda görünecek:")
    print("=" * 60)
    
    try:
        while True:
            # Bu kısım gerçek log monitoring sistemi ile değiştirilebilir
            # Şu an sadece monitoring endpoint'ini periyodik olarak kontrol ediyor
            monitor_webhook_activity()
            time.sleep(30)  # 30 saniyede bir kontrol et
            
    except KeyboardInterrupt:
        print("\n👋 Log monitoring durduruldu")

def main():
    parser = argparse.ArgumentParser(description="ElevenLabs Webhook Monitor")
    parser.add_argument("command", choices=["test", "monitor", "send-test", "watch"], 
                       help="Komut: test, monitor, send-test, watch")
    parser.add_argument("--url", default=API_BASE_URL, 
                       help="API base URL (default: http://localhost:8000)")
    
    args = parser.parse_args()
    
    # API URL'i güncelle
    global API_BASE_URL
    API_BASE_URL = args.url
    
    print(f"🌐 API URL: {API_BASE_URL}")
    
    if args.command == "test":
        check_webhook_endpoint()
    elif args.command == "monitor":
        monitor_webhook_activity()
    elif args.command == "send-test":
        send_test_webhook()
    elif args.command == "watch":
        watch_logs()

if __name__ == "__main__":
    main()
