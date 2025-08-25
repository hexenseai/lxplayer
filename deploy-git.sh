#!/bin/bash

# LXPlayer Git-based Deployment Script
# Bu script Git repository'den projeyi çeker ve kurar

set -e

# Renk kodları
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
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

# Kullanım kontrolü
if [ $# -eq 0 ]; then
    echo "Kullanım: $0 <git-repo-url> [branch] [deploy-dir]"
    echo "Örnek: $0 https://github.com/username/lxplayer.git main /opt/lxplayer"
    exit 1
fi

GIT_REPO=$1
BRANCH=${2:-main}
DEPLOY_DIR=${3:-/opt/lxplayer}

log "Git-based deployment başlatılıyor..."
log "Repository: $GIT_REPO"
log "Branch: $BRANCH"
log "Deploy Directory: $DEPLOY_DIR"

# Proje dizini oluşturma
log "Proje dizini hazırlanıyor..."
sudo mkdir -p $DEPLOY_DIR
sudo chown $USER:$USER $DEPLOY_DIR

# Git repository'yi klonlama veya güncelleme
if [ -d "$DEPLOY_DIR/.git" ]; then
    log "Mevcut repository güncelleniyor..."
    cd $DEPLOY_DIR
    git fetch origin
    git reset --hard origin/$BRANCH
    git clean -fd
else
    log "Repository klonlanıyor..."
    git clone -b $BRANCH $GIT_REPO $DEPLOY_DIR
fi

# Environment dosyası kontrolü
if [ ! -f "$DEPLOY_DIR/.env" ]; then
    log "Environment dosyası oluşturuluyor..."
    if [ -f "$DEPLOY_DIR/env.production.template" ]; then
        cp $DEPLOY_DIR/env.production.template $DEPLOY_DIR/.env
        warn "Environment dosyası oluşturuldu. Lütfen production ayarlarınızla güncelleyin!"
    else
        error "Environment template dosyası bulunamadı!"
    fi
fi

# Docker Compose dosyası kontrolü
if [ ! -f "$DEPLOY_DIR/docker-compose.yml" ]; then
    if [ -f "$DEPLOY_DIR/docker-compose.prod.yml" ]; then
        log "Docker Compose dosyası kopyalanıyor..."
        cp $DEPLOY_DIR/docker-compose.prod.yml $DEPLOY_DIR/docker-compose.yml
    else
        error "Docker Compose dosyası bulunamadı!"
    fi
fi

# Docker image'larını build etme
log "Docker image'ları build ediliyor..."
cd $DEPLOY_DIR
docker-compose build --no-cache

# Servisleri başlatma
log "Servisler başlatılıyor..."
docker-compose up -d

# Health check
log "Health check yapılıyor..."
sleep 10

# Servis durumunu kontrol etme
if docker-compose ps | grep -q "Up"; then
    log "✅ Deployment başarılı!"
    echo ""
    echo "🌐 Uygulama şu adreslerde erişilebilir:"
    echo "   - Web: http://$(hostname -I | awk '{print $1}')"
    echo "   - API: http://$(hostname -I | awk '{print $1}')/api"
    echo "   - MinIO Console: http://$(hostname -I | awk '{print $1}')/minio"
    echo ""
    echo "📊 Servis durumu:"
    docker-compose ps
else
    error "❌ Deployment başarısız! Logları kontrol edin."
    docker-compose logs
fi

# Systemd service güncelleme (eğer varsa)
if [ -f "/etc/systemd/system/lxplayer.service" ]; then
    log "Systemd service güncelleniyor..."
    sudo systemctl daemon-reload
    sudo systemctl restart lxplayer
fi
