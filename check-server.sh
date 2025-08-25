#!/bin/bash

# LXPlayer Server Status Check Script
# Bu script sunucudaki mevcut durumu kontrol eder

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
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Kullanım kontrolü
if [ $# -eq 0 ]; then
    echo "Kullanım: $0 <sunucu-ip> [kullanıcı-adı]"
    echo "Örnek: $0 93.177.103.107 hexense"
    exit 1
fi

SERVER_IP=$1
USER=${2:-$USER}

log "LXPlayer Server Status Check başlatılıyor..."
log "Sunucu: $SERVER_IP"
log "Kullanıcı: $USER"

# Sunucuda durum kontrolü
ssh $USER@$SERVER_IP << 'EOF'
    set -e
    
    echo "=== SİSTEM DURUMU ==="
    echo "Hostname: $(hostname)"
    echo "Uptime: $(uptime)"
    echo "Disk Usage:"
    df -h | head -5
    
    echo ""
    echo "=== DOCKER DURUMU ==="
    if command -v docker &> /dev/null; then
        echo "✅ Docker kurulu"
        echo "Docker version: $(docker --version)"
        echo "Docker Compose version: $(docker-compose --version)"
    else
        echo "❌ Docker kurulu değil"
    fi
    
    echo ""
    echo "=== PROJE DİZİNLERİ ==="
    echo "Mevcut dizinler:"
    ls -la /opt/ 2>/dev/null || echo "❌ /opt/ dizini bulunamadı"
    ls -la ~/ 2>/dev/null | grep -E "(lxplayer|lx)" || echo "❌ ~/ dizininde lxplayer bulunamadı"
    
    echo ""
    echo "=== LXPLAYER DİZİNİ KONTROLÜ ==="
    
    # Farklı olası dizinleri kontrol et
    POSSIBLE_DIRS=("/opt/lxplayer" "~/lxplayer" "/home/$USER/lxplayer" "/var/lxplayer")
    
    for dir in "${POSSIBLE_DIRS[@]}"; do
        if [ -d "$dir" ]; then
            echo "✅ Dizin bulundu: $dir"
            echo "   İçerik:"
            ls -la "$dir" | head -10
            
            if [ -f "$dir/docker-compose.yml" ]; then
                echo "   ✅ docker-compose.yml bulundu"
            elif [ -f "$dir/docker-compose.prod.yml" ]; then
                echo "   ⚠️  docker-compose.prod.yml bulundu (docker-compose.yml yok)"
            else
                echo "   ❌ Docker Compose dosyası bulunamadı"
            fi
            
            if [ -d "$dir/.git" ]; then
                echo "   ✅ Git repository bulundu"
                echo "   Branch: $(cd "$dir" && git branch --show-current 2>/dev/null || echo 'unknown')"
                echo "   Son commit: $(cd "$dir" && git log --oneline -1 2>/dev/null || echo 'unknown')"
            else
                echo "   ❌ Git repository bulunamadı"
            fi
            
            break
        fi
    done
    
    echo ""
    echo "=== DOCKER CONTAINER DURUMU ==="
    if command -v docker &> /dev/null; then
        echo "Çalışan container'lar:"
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" || echo "❌ Docker container'ları listelenemedi"
        
        echo ""
        echo "Tüm container'lar:"
        docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" || echo "❌ Docker container'ları listelenemedi"
    fi
    
    echo ""
    echo "=== PORT DURUMU ==="
    echo "Dinlenen portlar:"
    netstat -tulpn 2>/dev/null | grep -E ":(80|3000|8000|9000|9001|5433|6379|6333)" || echo "❌ İlgili portlar bulunamadı"
    
    echo ""
    echo "=== SYSTEMD SERVİSLERİ ==="
    if systemctl list-units --type=service | grep -i lxplayer; then
        echo "LXPlayer systemd servisleri:"
        systemctl status lxplayer --no-pager || echo "❌ LXPlayer servisi bulunamadı"
    else
        echo "❌ LXPlayer systemd servisi bulunamadı"
    fi
EOF

log "✅ Server Status Check tamamlandı!"
