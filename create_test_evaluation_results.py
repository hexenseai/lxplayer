#!/usr/bin/env python3
"""
Test için gerçek değerlendirme sonuçları oluştur
"""

import requests
import json
import sys
from datetime import datetime

# API base URL
BASE_URL = "http://localhost:8000"

def get_auth_token():
    """SuperAdmin token al"""
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": "admin@lxplayer.com",
            "password": "admin123"
        })
        
        if response.status_code == 200:
            data = response.json()
            return data.get("access_token")
        else:
            print(f"❌ Login failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"❌ Login error: {e}")
        return None

def create_test_evaluation_results(session_id: str, token: str):
    """Test için değerlendirme sonuçları oluştur"""
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Test değerlendirme sonuçları
    test_results = [
        {
            "criteria_name": "İletişim Becerileri",
            "score": 85,
            "comment": "Kullanıcı net ve anlaşılır şekilde konuştu",
            "status": "success"
        },
        {
            "criteria_name": "Konuya Hakimiyet",
            "score": 78,
            "comment": "Konu hakkında iyi bilgi sahibi",
            "status": "success"
        },
        {
            "criteria_name": "Problem Çözme",
            "score": 92,
            "comment": "Sorunları etkili şekilde çözdü",
            "status": "success"
        },
        {
            "criteria_name": "Takım Çalışması",
            "score": 65,
            "comment": "İşbirliği konusunda gelişim gerekli",
            "status": "partial"
        },
        {
            "criteria_name": "Teknik Bilgi",
            "score": 88,
            "comment": "Teknik konularda güçlü",
            "status": "success"
        },
        {
            "criteria_name": "Zaman Yönetimi",
            "score": 72,
            "comment": "Zamanını iyi kullandı",
            "status": "success"
        }
    ]
    
    print(f"🔍 Creating test evaluation results for session: {session_id}")
    
    for i, result in enumerate(test_results):
        try:
            # Evaluation result oluştur
            response = requests.post(f"{BASE_URL}/evaluation-results", json={
                "session_id": session_id,
                "criteria_name": result["criteria_name"],
                "evaluation_score": result["score"],
                "evaluation_result": result["comment"],
                "explanation": f"Test değerlendirmesi: {result['status']}",
                "llm_model": "test_model",
                "metadata_json": json.dumps({
                    "source": "test_script",
                    "timestamp": datetime.utcnow().isoformat(),
                    "status": result["status"]
                })
            }, headers=headers)
            
            if response.status_code == 200:
                print(f"✅ Created result {i+1}: {result['criteria_name']} - {result['score']}")
            else:
                print(f"❌ Failed to create result {i+1}: {response.status_code} - {response.text}")
                
        except Exception as e:
            print(f"❌ Error creating result {i+1}: {e}")
    
    # Test değerlendirme raporu oluştur
    try:
        report_response = requests.post(f"{BASE_URL}/evaluation-reports", json={
            "session_id": session_id,
            "report_title": "Test Değerlendirme Raporu",
            "overall_score": 80,
            "summary": "Genel olarak başarılı bir performans sergilediniz.",
            "detailed_analysis": "İletişim becerileri ve problem çözme konularında güçlü performans gösterdiniz. Takım çalışması konusunda gelişim fırsatları var.",
            "recommendations": "Takım çalışması becerilerinizi geliştirmek için daha fazla grup projesine katılın.",
            "strengths": "İletişim, problem çözme ve teknik bilgi alanlarında güçlüsünüz.",
            "weaknesses": "Takım çalışması konusunda gelişim gerekli.",
            "status": "completed"
        }, headers=headers)
        
        if report_response.status_code == 200:
            print("✅ Created test evaluation report")
        else:
            print(f"❌ Failed to create report: {report_response.status_code} - {report_response.text}")
            
    except Exception as e:
        print(f"❌ Error creating report: {e}")

def main():
    if len(sys.argv) != 2:
        print("Usage: python create_test_evaluation_results.py <session_id>")
        print("Example: python create_test_evaluation_results.py b4de3086-8873-4076-bf26-22359dc3d214")
        sys.exit(1)
    
    session_id = sys.argv[1]
    
    print("🔍 Test Değerlendirme Sonuçları Oluşturucu")
    print("=" * 50)
    
    # Token al
    print("1️⃣ Token alınıyor...")
    token = get_auth_token()
    if not token:
        print("❌ Token alınamadı, test durduruluyor")
        sys.exit(1)
    
    print("✅ Token alındı")
    
    # Test değerlendirme sonuçları oluştur
    print("2️⃣ Test değerlendirme sonuçları oluşturuluyor...")
    create_test_evaluation_results(session_id, token)
    
    print("3️⃣ Test tamamlandı!")
    print(f"Session ID: {session_id}")
    print("Artık eğitim sonu sayfasında değerlendirme sonuçlarını görebilirsiniz.")

if __name__ == "__main__":
    main()
