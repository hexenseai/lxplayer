#!/bin/bash

# LXPlayer Admin Setup Script
# Bu script admin kullanıcı ve default firma kayıtlarını oluşturur

set -e

# Renk kodları
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Kullanıcı kontrolü
if [ "$EUID" -ne 0 ]; then
    error "Bu script sudo ile çalıştırılmalıdır!"
fi

log "LXPlayer Admin Setup başlatılıyor..."

# Kullanıcı adını al
USERNAME=${SUDO_USER:-$USER}
PROJECT_DIR="/home/$USERNAME/lxplayer"

log "Kullanıcı: $USERNAME"
log "Proje Dizini: $PROJECT_DIR"

# 1. Docker container'larının çalıştığını kontrol et
log "Docker container'ları kontrol ediliyor..."
if ! docker ps | grep -q "lxplayer-postgres-1"; then
    error "PostgreSQL container'ı çalışmıyor! Önce 'docker compose up -d' çalıştırın."
fi

if ! docker ps | grep -q "lxplayer-api-1"; then
    error "API container'ı çalışmıyor! Önce 'docker compose up -d' çalıştırın."
fi

# 2. Admin setup script oluştur
log "Admin setup script oluşturuluyor..."

cat > /usr/local/bin/lxplayer-admin-setup << 'EOF'
#!/usr/bin/env python3

import os
import sys
import requests
import time
import json
from datetime import datetime

# API URL
API_BASE_URL = "http://localhost:8000"

def log(message):
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {message}")

def wait_for_api():
    """API'nin hazır olmasını bekle"""
    log("API'nin hazır olması bekleniyor...")
    max_attempts = 30
    for attempt in range(max_attempts):
        try:
            response = requests.get(f"{API_BASE_URL}/docs", timeout=5)
            if response.status_code == 200:
                log("✅ API hazır!")
                return True
        except requests.exceptions.RequestException:
            pass
        
        log(f"API bekleniyor... ({attempt + 1}/{max_attempts})")
        time.sleep(10)
    
    log("❌ API hazır olmadı!")
    return False

def check_admin_exists():
    """Admin kullanıcısının var olup olmadığını kontrol et"""
    try:
        response = requests.get(f"{API_BASE_URL}/api/users/", timeout=10)
        if response.status_code == 200:
            users = response.json()
            for user in users:
                if user.get('email') == 'admin@lxplayer.com':
                    log("✅ Admin kullanıcısı zaten mevcut")
                    return True
        return False
    except Exception as e:
        log(f"⚠️ Admin kontrolü sırasında hata: {e}")
        return False

def create_admin_user():
    """Admin kullanıcısını oluştur"""
    log("Admin kullanıcısı oluşturuluyor...")
    
    admin_data = {
        "email": "admin@lxplayer.com",
        "password": "admin123",
        "full_name": "System Administrator",
        "role": "admin",
        "is_active": True
    }
    
    try:
        response = requests.post(f"{API_BASE_URL}/api/auth/register", 
                               json=admin_data, timeout=10)
        
        if response.status_code == 200:
            log("✅ Admin kullanıcısı oluşturuldu!")
            return True
        else:
            log(f"❌ Admin kullanıcısı oluşturulamadı: {response.status_code}")
            log(f"Response: {response.text}")
            return False
    except Exception as e:
        log(f"❌ Admin kullanıcısı oluşturulurken hata: {e}")
        return False

def check_company_exists():
    """Default firmanın var olup olmadığını kontrol et"""
    try:
        response = requests.get(f"{API_BASE_URL}/api/organizations/", timeout=10)
        if response.status_code == 200:
            companies = response.json()
            for company in companies:
                if company.get('name') == 'Default Company':
                    log("✅ Default firma zaten mevcut")
                    return True
        return False
    except Exception as e:
        log(f"⚠️ Firma kontrolü sırasında hata: {e}")
        return False

def create_default_company():
    """Default firmayı oluştur"""
    log("Default firma oluşturuluyor...")
    
    company_data = {
        "name": "Default Company",
        "description": "Sistem tarafından oluşturulan varsayılan firma",
        "is_active": True
    }
    
    try:
        response = requests.post(f"{API_BASE_URL}/api/organizations/", 
                               json=company_data, timeout=10)
        
        if response.status_code == 200:
            log("✅ Default firma oluşturuldu!")
            return True
        else:
            log(f"❌ Default firma oluşturulamadı: {response.status_code}")
            log(f"Response: {response.text}")
            return False
    except Exception as e:
        log(f"❌ Default firma oluşturulurken hata: {e}")
        return False

def main():
    log("LXPlayer Admin Setup başlatılıyor...")
    
    # API'nin hazır olmasını bekle
    if not wait_for_api():
        sys.exit(1)
    
    # Admin kullanıcısını kontrol et ve oluştur
    if not check_admin_exists():
        if not create_admin_user():
            log("❌ Admin kullanıcısı oluşturulamadı!")
            sys.exit(1)
    else:
        log("ℹ️ Admin kullanıcısı zaten mevcut")
    
    # Default firmayı kontrol et ve oluştur
    if not check_company_exists():
        if not create_default_company():
            log("❌ Default firma oluşturulamadı!")
            sys.exit(1)
    else:
        log("ℹ️ Default firma zaten mevcut")
    
    log("✅ Admin setup tamamlandı!")
    log("")
    log("📋 Oluşturulan Kayıtlar:")
    log("   - Admin Kullanıcı: admin@lxplayer.com / admin123")
    log("   - Default Firma: Default Company")
    log("")
    log("🌐 Giriş Yapmak İçin:")
    log("   - Web: http://localhost:3000")
    log("   - API: http://localhost:8000/docs")

if __name__ == "__main__":
    main()
EOF

chmod +x /usr/local/bin/lxplayer-admin-setup

# 3. Cron job oluştur (her gün kontrol et)
log "Cron job oluşturuluyor..."
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/lxplayer-admin-setup") | crontab -

# 4. İlk çalıştırma
log "Admin setup ilk kez çalıştırılıyor..."
/usr/local/bin/lxplayer-admin-setup

# 5. Monitoring script güncelle
log "Monitoring script güncelleniyor..."

cat > /usr/local/bin/lxplayer-monitor << 'EOF'
#!/bin/bash

echo "=== LXPlayer System Status ==="
echo "Docker Status: $(systemctl is-active docker)"
echo "Nginx Status: $(systemctl is-active nginx)"
echo "LXPlayer Status: $(systemctl is-active lxplayer)"
echo ""
echo "=== Container Status ==="
cd /home/hexense/lxplayer && docker compose ps
echo ""
echo "=== Port Status ==="
netstat -tulpn | grep -E ":(80|3000|8000|9000|9001)"
echo ""
echo "=== API Health Check ==="
if curl -s http://localhost:8000/docs > /dev/null; then
    echo "✅ API çalışıyor"
else
    echo "❌ API çalışmıyor"
fi
echo ""
echo "=== Admin Setup Status ==="
/usr/local/bin/lxplayer-admin-setup
echo ""
echo "=== Recent Logs ==="
tail -10 /var/log/lxplayer-health.log 2>/dev/null || echo "Log dosyası bulunamadı"
EOF

chmod +x /usr/local/bin/lxplayer-monitor

log "✅ Admin Setup tamamlandı!"
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
echo "   - Durum kontrolü: sudo lxplayer-monitor"
echo "   - Servis durumu: sudo systemctl status lxplayer"
echo ""
echo "🔄 Admin setup her gün otomatik olarak kontrol edilecek!"
