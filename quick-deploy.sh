#!/bin/bash

# LXPlayer Quick Deployment Script
# Bu script proje dosyalarını sunucuya kopyalar ve başlatır

set -e

# Renk kodları
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

# Kullanım kontrolü
if [ $# -eq 0 ]; then
    echo "Kullanım: $0 <sunucu-ip> [kullanıcı-adı]"
    echo "Örnek: $0 192.168.1.100 ubuntu"
    exit 1
fi

SERVER_IP=$1
USER=${2:-$USER}
PROJECT_DIR="/opt/lxplayer"

log "LXPlayer Quick Deployment başlatılıyor..."
log "Sunucu: $SERVER_IP"
log "Kullanıcı: $USER"

# Proje dosyalarını kopyalama
log "Proje dosyaları sunucuya kopyalanıyor..."
rsync -avz --exclude='node_modules' --exclude='.git' --exclude='.next' --exclude='__pycache__' \
    --exclude='*.pyc' --exclude='.env' --exclude='.DS_Store' \
    ./ $USER@$SERVER_IP:$PROJECT_DIR/

# Environment dosyasını kopyalama (eğer varsa)
if [ -f ".env" ]; then
    log "Environment dosyası kopyalanıyor..."
    scp .env $USER@$SERVER_IP:$PROJECT_DIR/
else
    warn "Local .env dosyası bulunamadı. Sunucudaki varsayılan dosya kullanılacak."
fi

# Sunucuda servisi başlatma
log "Sunucuda servis başlatılıyor..."
ssh $USER@$SERVER_IP << EOF
    cd $PROJECT_DIR
    sudo systemctl start lxplayer
    sudo systemctl status lxplayer --no-pager
EOF

log "✅ Deployment tamamlandı!"
echo ""
echo "🌐 Uygulama şu adreslerde erişilebilir:"
echo "   - Web: http://$SERVER_IP"
echo "   - API: http://$SERVER_IP/api"
echo "   - MinIO Console: http://$SERVER_IP/minio"
echo ""
echo "📊 Servis durumu kontrol etmek için:"
echo "   ssh $USER@$SERVER_IP 'sudo systemctl status lxplayer'"
echo ""
echo "📝 Logları görüntülemek için:"
echo "   ssh $USER@$SERVER_IP 'sudo journalctl -u lxplayer -f'"
