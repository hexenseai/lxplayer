#!/bin/bash

# LXPlayer Admin Setup Fix Script
# Bu script admin setup sorununu çözer

set -e

echo "🔧 LXPlayer Admin Setup Fix başlatılıyor..."

# Kullanıcı kontrolü
if [ "$EUID" -ne 0 ]; then
    echo "❌ Bu script sudo ile çalıştırılmalıdır!"
    exit 1
fi

USERNAME=${SUDO_USER:-$USER}
PROJECT_DIR="/home/$USERNAME/lxplayer"

echo "👤 Kullanıcı: $USERNAME"
echo "📁 Proje Dizini: $PROJECT_DIR"

# 1. Güncellenmiş admin setup script oluştur
echo "🐍 Güncellenmiş admin setup script oluşturuluyor..."

cat > /usr/local/bin/lxplayer-admin-setup << 'EOF'
#!/usr/bin/env python3

import requests
import time
import sys
from datetime import datetime

def log(message):
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {message}")

def wait_for_api():
    """API'nin hazır olmasını bekle"""
    log("API bekleniyor...")
    for i in range(30):
        try:
            # Önce localhost'ta test et
            response = requests.get("http://localhost:8000/docs", timeout=5)
            if response.status_code == 200:
                log("✅ API hazır! (localhost)")
                return "localhost"
        except:
            pass
        
        try:
            # Sonra domain'de test et
            response = requests.get("http://yodea.hexense.ai/api/docs", timeout=5)
            if response.status_code == 200:
                log("✅ API hazır! (domain)")
                return "domain"
        except:
            pass
        
        time.sleep(10)
    log("❌ API hazır olmadı!")
    return None

def create_admin(api_base):
    """Admin kullanıcısını oluştur"""
    try:
        # Önce admin var mı kontrol et
        response = requests.get(f"{api_base}/api/users/", timeout=10)
        log(f"Users endpoint response: {response.status_code}")
        
        if response.status_code == 200:
            users = response.json()
            for user in users:
                if user.get('email') == 'admin@lxplayer.com':
                    log("✅ Admin kullanıcısı zaten mevcut")
                    return True
        
        # Admin yoksa oluştur
        admin_data = {
            "email": "admin@lxplayer.com",
            "password": "admin123",
            "full_name": "System Administrator",
            "role": "admin",
            "is_active": True
        }
        
        log(f"Admin oluşturuluyor: {api_base}/api/auth/register")
        response = requests.post(f"{api_base}/api/auth/register", 
                               json=admin_data, timeout=10)
        
        log(f"Register response: {response.status_code}")
        log(f"Response text: {response.text}")
        
        if response.status_code == 200:
            log("✅ Admin kullanıcısı oluşturuldu!")
            return True
        else:
            log(f"❌ Admin oluşturulamadı: {response.status_code}")
            return False
    except Exception as e:
        log(f"❌ Hata: {e}")
        return False

def create_company(api_base):
    """Default firmayı oluştur"""
    try:
        # Önce firma var mı kontrol et
        response = requests.get(f"{api_base}/api/organizations/", timeout=10)
        log(f"Organizations endpoint response: {response.status_code}")
        
        if response.status_code == 200:
            companies = response.json()
            for company in companies:
                if company.get('name') == 'Default Company':
                    log("✅ Default firma zaten mevcut")
                    return True
        
        # Firma yoksa oluştur
        company_data = {
            "name": "Default Company",
            "description": "Sistem tarafından oluşturulan varsayılan firma",
            "is_active": True
        }
        
        log(f"Firma oluşturuluyor: {api_base}/api/organizations/")
        response = requests.post(f"{api_base}/api/organizations/", 
                               json=company_data, timeout=10)
        
        log(f"Organization response: {response.status_code}")
        log(f"Response text: {response.text}")
        
        if response.status_code == 200:
            log("✅ Default firma oluşturuldu!")
            return True
        else:
            log(f"❌ Firma oluşturulamadı: {response.status_code}")
            return False
    except Exception as e:
        log(f"❌ Hata: {e}")
        return False

def main():
    log("Admin setup başlatılıyor...")
    
    api_base = wait_for_api()
    if not api_base:
        sys.exit(1)
    
    if api_base == "localhost":
        api_url = "http://localhost:8000"
    else:
        api_url = "http://yodea.hexense.ai"
    
    log(f"API URL: {api_url}")
    
    if not create_admin(api_url):
        log("❌ Admin oluşturulamadı!")
        sys.exit(1)
    
    if not create_company(api_url):
        log("❌ Firma oluşturulamadı!")
        sys.exit(1)
    
    log("✅ Admin setup tamamlandı!")
    log("")
    log("📋 Giriş Bilgileri:")
    log("   Email: admin@lxplayer.com")
    log("   Şifre: admin123")
    log("")
    log("🌐 Giriş Yapmak İçin:")
    log("   - Web: http://yodea.hexense.ai")

if __name__ == "__main__":
    main()
EOF

chmod +x /usr/local/bin/lxplayer-admin-setup

# 2. API endpoint'lerini test et
echo "🔍 API endpoint'leri test ediliyor..."

echo "Testing localhost:8000/docs..."
curl -s http://localhost:8000/docs > /dev/null && echo "✅ localhost:8000/docs çalışıyor" || echo "❌ localhost:8000/docs çalışmıyor"

echo "Testing yodea.hexense.ai/api/docs..."
curl -s http://yodea.hexense.ai/api/docs > /dev/null && echo "✅ yodea.hexense.ai/api/docs çalışıyor" || echo "❌ yodea.hexense.ai/api/docs çalışmıyor"

echo "Testing localhost:8000/api/users/..."
curl -s http://localhost:8000/api/users/ > /dev/null && echo "✅ localhost:8000/api/users/ çalışıyor" || echo "❌ localhost:8000/api/users/ çalışmıyor"

# 3. Admin setup'ı çalıştır
echo "🚀 Admin setup çalıştırılıyor..."
/usr/local/bin/lxplayer-admin-setup

echo ""
echo "✅ Admin Setup Fix tamamlandı!"
echo ""
echo "🔧 Test Komutları:"
echo "   - API Docs: curl http://yodea.hexense.ai/api/docs"
echo "   - Users: curl http://yodea.hexense.ai/api/users/"
echo "   - Admin Setup: sudo lxplayer-admin-setup"
