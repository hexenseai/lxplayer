#!/bin/bash

# LXPlayer Simple Admin Setup
# Bu script admin kullanıcı ve default firma kayıtlarını oluşturur

set -e

echo "🚀 LXPlayer Admin Setup başlatılıyor..."

# Kullanıcı kontrolü
if [ "$EUID" -ne 0 ]; then
    echo "❌ Bu script sudo ile çalıştırılmalıdır!"
    exit 1
fi

USERNAME=${SUDO_USER:-$USER}
PROJECT_DIR="/home/$USERNAME/lxplayer"

echo "👤 Kullanıcı: $USERNAME"
echo "📁 Proje Dizini: $PROJECT_DIR"

# 1. Container'ların çalıştığını kontrol et
echo "🐳 Container'lar kontrol ediliyor..."
if ! docker ps | grep -q "lxplayer-postgres-1"; then
    echo "❌ PostgreSQL container'ı çalışmıyor!"
    echo "💡 Önce 'docker compose up -d' çalıştırın"
    exit 1
fi

if ! docker ps | grep -q "lxplayer-api-1"; then
    echo "❌ API container'ı çalışmıyor!"
    echo "💡 Önce 'docker compose up -d' çalıştırın"
    exit 1
fi

# 2. Python script oluştur
echo "🐍 Admin setup script oluşturuluyor..."

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
            response = requests.get("http://localhost:8000/docs", timeout=5)
            if response.status_code == 200:
                log("✅ API hazır!")
                return True
        except:
            pass
        time.sleep(10)
    log("❌ API hazır olmadı!")
    return False

def create_admin():
    """Admin kullanıcısını oluştur"""
    try:
        # Önce admin var mı kontrol et
        response = requests.get("http://localhost:8000/api/users/", timeout=10)
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
        
        response = requests.post("http://localhost:8000/api/auth/register", 
                               json=admin_data, timeout=10)
        
        if response.status_code == 200:
            log("✅ Admin kullanıcısı oluşturuldu!")
            return True
        else:
            log(f"❌ Admin oluşturulamadı: {response.status_code}")
            return False
    except Exception as e:
        log(f"❌ Hata: {e}")
        return False

def create_company():
    """Default firmayı oluştur"""
    try:
        # Önce firma var mı kontrol et
        response = requests.get("http://localhost:8000/api/organizations/", timeout=10)
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
        
        response = requests.post("http://localhost:8000/api/organizations/", 
                               json=company_data, timeout=10)
        
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
    
    if not wait_for_api():
        sys.exit(1)
    
    if not create_admin():
        log("❌ Admin oluşturulamadı!")
        sys.exit(1)
    
    if not create_company():
        log("❌ Firma oluşturulamadı!")
        sys.exit(1)
    
    log("✅ Admin setup tamamlandı!")
    log("")
    log("📋 Giriş Bilgileri:")
    log("   Email: admin@lxplayer.com")
    log("   Şifre: admin123")
    log("")
    log("🌐 Giriş Yapmak İçin:")
    log("   - Web: http://localhost:3000")
    log("   - API: http://localhost:8000/docs")

if __name__ == "__main__":
    main()
EOF

chmod +x /usr/local/bin/lxplayer-admin-setup

# 3. İlk çalıştırma
echo "🚀 Admin setup çalıştırılıyor..."
/usr/local/bin/lxplayer-admin-setup

# 4. Cron job (her gün kontrol et)
echo "⏰ Cron job oluşturuluyor..."
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/lxplayer-admin-setup") | crontab -

echo ""
echo "✅ Admin Setup tamamlandı!"
echo ""
echo "📋 Oluşturulan Kayıtlar:"
echo "   - Admin Kullanıcı: admin@lxplayer.com / admin123"
echo "   - Default Firma: Default Company"
echo ""
echo "🌐 Giriş Yapmak İçin:"
echo "   - Web: http://$(hostname -I | awk '{print $1}')"
echo "   - API: http://$(hostname -I | awk '{print $1}')/api"
echo ""
echo "🔧 Yönetim Komutları:"
echo "   - Admin setup: sudo lxplayer-admin-setup"
echo "   - Servis durumu: sudo systemctl status lxplayer"
echo ""
echo "🔄 Admin setup her gün otomatik kontrol edilecek!"
