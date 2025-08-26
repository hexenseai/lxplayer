#!/usr/bin/env python3
"""
SCORM Package Test Script
Bu script SCORM paket oluşturma fonksiyonunu test eder
"""

import requests
import json
import os

def test_scorm_package_download():
    """SCORM paket indirme fonksiyonunu test eder"""
    
    # API URL'ini ayarla
    api_url = os.getenv('API_URL', 'http://localhost:8000')
    
    try:
        # Önce eğitimleri listele
        print("Eğitimler listeleniyor...")
        response = requests.get(f"{api_url}/trainings")
        response.raise_for_status()
        trainings = response.json()
        
        if not trainings:
            print("❌ Hiç eğitim bulunamadı!")
            return
        
        print(f"✅ {len(trainings)} eğitim bulundu")
        
        # İlk eğitimi seç
        training = trainings[0]
        training_id = training['id']
        training_title = training['title']
        
        print(f"📚 Test edilecek eğitim: {training_title} (ID: {training_id})")
        
        # SCORM paketini indir
        print("📦 SCORM paketi indiriliyor...")
        scorm_response = requests.get(f"{api_url}/trainings/{training_id}/scorm-package")
        scorm_response.raise_for_status()
        
        # Dosyayı kaydet
        filename = f"scorm-{training_title.replace(' ', '-').lower()}.zip"
        with open(filename, 'wb') as f:
            f.write(scorm_response.content)
        
        file_size = len(scorm_response.content)
        print(f"✅ SCORM paketi başarıyla indirildi: {filename} ({file_size:,} bytes)")
        
        # ZIP dosyasını kontrol et
        import zipfile
        with zipfile.ZipFile(filename, 'r') as zip_file:
            file_list = zip_file.namelist()
            print(f"📋 ZIP dosyası içeriği ({len(file_list)} dosya):")
            for file_name in file_list:
                file_info = zip_file.getinfo(file_name)
                print(f"  - {file_name} ({file_info.file_size:,} bytes)")
        
        print(f"🎉 Test başarılı! SCORM paketi hazır: {filename}")
        
    except requests.exceptions.RequestException as e:
        print(f"❌ API hatası: {e}")
    except Exception as e:
        print(f"❌ Beklenmeyen hata: {e}")

if __name__ == "__main__":
    print("🚀 SCORM Package Test Script başlatılıyor...")
    test_scorm_package_download()
