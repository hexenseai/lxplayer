#!/usr/bin/env python3
"""
Avatar System Test Script
Bu script avatar sisteminin çalışıp çalışmadığını test eder.
"""

import requests
import json
import sys
from datetime import datetime

# API base URL
BASE_URL = "http://localhost:8000"

def test_avatar_endpoints():
    """Avatar endpoint'lerini test eder"""
    print("🧪 Avatar System Test Başlatılıyor...")
    print("=" * 50)
    
    # Test data
    test_avatar = {
        "name": "Test Avatar",
        "personality": "Friendly and helpful assistant",
        "elevenlabs_voice_id": "test_voice_123",
        "description": "Test avatar for system testing",
        "is_default": False
    }
    
    # 1. Avatar oluşturma testi
    print("1. Avatar oluşturma testi...")
    try:
        response = requests.post(f"{BASE_URL}/avatars/", json=test_avatar)
        if response.status_code == 200:
            avatar_data = response.json()
            avatar_id = avatar_data["id"]
            print(f"✅ Avatar başarıyla oluşturuldu: {avatar_data['name']} (ID: {avatar_id})")
        else:
            print(f"❌ Avatar oluşturma başarısız: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Avatar oluşturma hatası: {e}")
        return False
    
    # 2. Avatar listesi testi
    print("\n2. Avatar listesi testi...")
    try:
        response = requests.get(f"{BASE_URL}/avatars/")
        if response.status_code == 200:
            avatars = response.json()
            print(f"✅ {len(avatars)} avatar bulundu")
            for avatar in avatars:
                print(f"   - {avatar['name']} ({'Varsayılan' if avatar['is_default'] else 'Özel'})")
        else:
            print(f"❌ Avatar listesi alınamadı: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Avatar listesi hatası: {e}")
        return False
    
    # 3. Avatar detay testi
    print(f"\n3. Avatar detay testi (ID: {avatar_id})...")
    try:
        response = requests.get(f"{BASE_URL}/avatars/{avatar_id}")
        if response.status_code == 200:
            avatar = response.json()
            print(f"✅ Avatar detayı alındı: {avatar['name']}")
            print(f"   - Kişilik: {avatar['personality']}")
            print(f"   - Voice ID: {avatar['elevenlabs_voice_id']}")
        else:
            print(f"❌ Avatar detayı alınamadı: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Avatar detay hatası: {e}")
        return False
    
    # 4. Avatar güncelleme testi
    print(f"\n4. Avatar güncelleme testi...")
    try:
        update_data = {
            "name": "Updated Test Avatar",
            "personality": "Updated friendly and helpful assistant"
        }
        response = requests.put(f"{BASE_URL}/avatars/{avatar_id}", json=update_data)
        if response.status_code == 200:
            updated_avatar = response.json()
            print(f"✅ Avatar güncellendi: {updated_avatar['name']}")
        else:
            print(f"❌ Avatar güncelleme başarısız: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Avatar güncelleme hatası: {e}")
        return False
    
    # 5. Training ile avatar entegrasyonu testi
    print(f"\n5. Training-Avatar entegrasyonu testi...")
    try:
        # Önce bir training oluştur
        training_data = {
            "title": "Test Training with Avatar",
            "description": "Test training that uses an avatar",
            "avatar_id": avatar_id
        }
        response = requests.post(f"{BASE_URL}/trainings/", json=training_data)
        if response.status_code == 200:
            training = response.json()
            training_id = training["id"]
            print(f"✅ Avatar ile training oluşturuldu: {training['title']}")
            
            # Training detayını al ve avatar bilgisini kontrol et
            response = requests.get(f"{BASE_URL}/trainings/{training_id}")
            if response.status_code == 200:
                training_detail = response.json()
                if "avatar" in training_detail and training_detail["avatar"]:
                    print(f"✅ Training'de avatar bilgisi mevcut: {training_detail['avatar']['name']}")
                else:
                    print("⚠️ Training'de avatar bilgisi bulunamadı")
        else:
            print(f"❌ Avatar ile training oluşturulamadı: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Training-Avatar entegrasyon hatası: {e}")
        return False
    
    # 6. Avatar silme testi
    print(f"\n6. Avatar silme testi...")
    try:
        response = requests.delete(f"{BASE_URL}/avatars/{avatar_id}")
        if response.status_code == 200:
            print("✅ Avatar başarıyla silindi")
        else:
            print(f"❌ Avatar silme başarısız: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Avatar silme hatası: {e}")
        return False
    
    print("\n" + "=" * 50)
    print("🎉 Tüm avatar sistemi testleri başarılı!")
    return True

def test_import_export():
    """Import/Export özelliklerini test eder"""
    print("\n📦 Import/Export Test Başlatılıyor...")
    print("=" * 50)
    
    # Test avatarları
    test_avatars = [
        {
            "name": "Import Test Avatar 1",
            "personality": "First imported avatar",
            "elevenlabs_voice_id": "import_voice_1",
            "description": "First test avatar for import"
        },
        {
            "name": "Import Test Avatar 2", 
            "personality": "Second imported avatar",
            "elevenlabs_voice_id": "import_voice_2",
            "description": "Second test avatar for import"
        }
    ]
    
    # 1. Import testi
    print("1. Avatar import testi...")
    try:
        response = requests.post(f"{BASE_URL}/avatars/import", json=test_avatars)
        if response.status_code == 200:
            result = response.json()
            print(f"✅ {result['imported_count']} avatar import edildi")
            if result['errors']:
                print(f"⚠️ {len(result['errors'])} hata oluştu:")
                for error in result['errors']:
                    print(f"   - {error}")
        else:
            print(f"❌ Avatar import başarısız: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Avatar import hatası: {e}")
        return False
    
    # 2. Export testi
    print("\n2. Avatar export testi...")
    try:
        response = requests.get(f"{BASE_URL}/avatars/export/company")
        if response.status_code == 200:
            result = response.json()
            print(f"✅ {result['exported_count']} avatar export edildi")
            print(f"   - Export tarihi: {result['exported_at']}")
        else:
            print(f"❌ Avatar export başarısız: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Avatar export hatası: {e}")
        return False
    
    print("\n🎉 Import/Export testleri başarılı!")
    return True

if __name__ == "__main__":
    print("🚀 LXPlayer Avatar System Test")
    print(f"⏰ Test başlangıç zamanı: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🌐 API URL: {BASE_URL}")
    
    try:
        # Backend'in çalışıp çalışmadığını kontrol et
        response = requests.get(f"{BASE_URL}/")
        if response.status_code != 200:
            print(f"❌ Backend çalışmıyor! Status: {response.status_code}")
            sys.exit(1)
        print("✅ Backend çalışıyor")
        
        # Testleri çalıştır
        success = test_avatar_endpoints()
        if success:
            test_import_export()
        
        print(f"\n⏰ Test bitiş zamanı: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
    except requests.exceptions.ConnectionError:
        print("❌ Backend'e bağlanılamıyor! Backend'in çalıştığından emin olun.")
        print("   Backend'i başlatmak için: cd apps/api && python -m uvicorn app.main:app --reload")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Beklenmeyen hata: {e}")
        sys.exit(1)
