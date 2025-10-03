#!/usr/bin/env python3
"""
ElevenLabs agent'ında kullanılacak kriterleri backend'e ekle
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
            "email": "superadmin@lxplayer.com",
            "password": "superadmin123"
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

def create_elevenlabs_criteria(training_id: str, token: str):
    """ElevenLabs agent'ında kullanılacak kriterleri oluştur"""
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # ElevenLabs agent'ında kullanılacak kriterler
    elevenlabs_criteria = [
        {
            "training_id": training_id,
            "title": "Şirket ve Sistem Tanıtımı",
            "description": "Kullanıcının şirket ve sistem hakkında bilgi verme becerisi",
            "weight": 20,
            "is_active": True,
            "order_index": 1,
            "llm_evaluation_prompt": "Kullanıcının şirket ve sistem tanıtımını değerlendir. Net ve anlaşılır şekilde açıkladı mı? Müşteri ihtiyaçlarına uygun bilgi verdi mi?"
        },
        {
            "training_id": training_id,
            "title": "İhtiyaç Analizi",
            "description": "Müşteri ihtiyaçlarını analiz etme ve belirleme becerisi",
            "weight": 25,
            "is_active": True,
            "order_index": 2,
            "llm_evaluation_prompt": "Kullanıcının ihtiyaç analizi becerilerini değerlendir. Doğru sorular sordu mu? Müşteri ihtiyaçlarını doğru tespit etti mi?"
        },
        {
            "training_id": training_id,
            "title": "İtiraz Karşılama",
            "description": "Müşteri itirazlarını etkili şekilde karşılama becerisi",
            "weight": 20,
            "is_active": True,
            "order_index": 3,
            "llm_evaluation_prompt": "Kullanıcının itiraz karşılama becerilerini değerlendir. İtirazlara yapıcı cevaplar verdi mi? Müşteriyi ikna edebildi mi?"
        },
        {
            "training_id": training_id,
            "title": "Soru Cevap",
            "description": "Müşteri sorularına doğru ve zamanında cevap verme becerisi",
            "weight": 15,
            "is_active": True,
            "order_index": 4,
            "llm_evaluation_prompt": "Kullanıcının soru cevap becerilerini değerlendir. Sorulara doğru cevaplar verdi mi? Eksik bilgileri açıkladı mı?"
        },
        {
            "training_id": training_id,
            "title": "Satış Kapatma",
            "description": "Satış sürecini başarıyla kapatma becerisi",
            "weight": 10,
            "is_active": True,
            "order_index": 5,
            "llm_evaluation_prompt": "Kullanıcının satış kapatma becerilerini değerlendir. Satışı zamanında kapattı mı? Müşteriyi karar vermeye yönlendirdi mi?"
        },
        {
            "training_id": training_id,
            "title": "İkna Kabiliyeti",
            "description": "Müşteriyi ikna etme ve etkileme becerisi",
            "weight": 15,
            "is_active": True,
            "order_index": 6,
            "llm_evaluation_prompt": "Kullanıcının ikna kabiliyetini değerlendir. Müşteriyi etkili şekilde ikna etti mi? Güven verici bir yaklaşım sergiledi mi?"
        },
        {
            "training_id": training_id,
            "title": "Buz Kırma",
            "description": "Müşteri ile iletişimi başlatma ve buz kırma becerisi",
            "weight": 10,
            "is_active": True,
            "order_index": 7,
            "llm_evaluation_prompt": "Kullanıcının buz kırma becerilerini değerlendir. Müşteri ile iyi bir başlangıç yaptı mı? Samimi bir atmosfer oluşturdu mu?"
        }
    ]
    
    print(f"🔍 Creating ElevenLabs criteria for training: {training_id}")
    
    created_criteria = []
    for i, criteria_data in enumerate(elevenlabs_criteria):
        try:
            response = requests.post(f"{BASE_URL}/evaluation-criteria", json=criteria_data, headers=headers)
            
            if response.status_code == 200:
                criteria = response.json()
                created_criteria.append(criteria)
                print(f"✅ Created criteria {i+1}: {criteria['title']}")
            else:
                print(f"❌ Failed to create criteria {i+1}: {response.status_code} - {response.text}")
                
        except Exception as e:
            print(f"❌ Error creating criteria {i+1}: {e}")
    
    print(f"\n✅ Created {len(created_criteria)} evaluation criteria")
    return created_criteria

def main():
    if len(sys.argv) != 2:
        print("Usage: python setup_elevenlabs_criteria.py <training_id>")
        print("Example: python setup_elevenlabs_criteria.py 460d92b0-d8df-490c-83dc-94913e89c6fd")
        sys.exit(1)
    
    training_id = sys.argv[1]
    
    print("🔍 ElevenLabs Evaluation Criteria Setup")
    print("=" * 50)
    
    # Token al
    print("1️⃣ Token alınıyor...")
    token = get_auth_token()
    if not token:
        print("❌ Token alınamadı, test durduruluyor")
        sys.exit(1)
    
    print("✅ Token alındı")
    
    # ElevenLabs kriterleri oluştur
    print("2️⃣ ElevenLabs kriterleri oluşturuluyor...")
    criteria = create_elevenlabs_criteria(training_id, token)
    
    print("3️⃣ Setup tamamlandı!")
    print(f"Training ID: {training_id}")
    print(f"Created Criteria: {len(criteria)}")
    print("\nArtık ElevenLabs agent'ı bu kriterlere göre değerlendirme yapacak.")

if __name__ == "__main__":
    main()
