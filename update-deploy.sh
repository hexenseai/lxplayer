#!/bin/bash

# LXPlayer Git Update & Deploy Script
# Bu script Git pull ile projeyi günceller ve yeniden deploy eder

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

# Kullanım kontrolü
if [ $# -eq 0 ]; then
    echo "Kullanım: $0 <sunucu-ip> [kullanıcı-adı] [branch] [deploy-dir]"
    echo "Örnek: $0 192.168.1.100 ubuntu main /opt/lxplayer"
    exit 1
fi

SERVER_IP=$1
USER=${2:-$USER}
BRANCH=${3:-main}
DEPLOY_DIR=${4:-/opt/lxplayer}

log "LXPlayer Git Update & Deploy başlatılıyor..."
log "Sunucu: $SERVER_IP"
log "Kullanıcı: $USER"
log "Branch: $BRANCH"
log "Deploy Directory: $DEPLOY_DIR"

# SSH bağlantısını test etme
log "SSH bağlantısı test ediliyor..."
if ! ssh -o ConnectTimeout=10 -o BatchMode=yes $USER@$SERVER_IP "echo 'SSH connection successful'" > /dev/null 2>&1; then
    error "SSH bağlantısı başarısız! SSH key'inizin sunucuda olduğundan emin olun."
fi

# Sunucuda güncelleme işlemi
log "Sunucuda Git güncellemesi yapılıyor..."
ssh $USER@$SERVER_IP << EOF
    set -e
    
    # Proje dizinine git
    cd $DEPLOY_DIR
    
    # Git durumunu kontrol et
    if [ ! -d ".git" ]; then
        echo "❌ Git repository bulunamadı! Lütfen önce projeyi clone edin."
        exit 1
    fi
    
    # Mevcut değişiklikleri stash et (eğer varsa)
    if ! git diff-index --quiet HEAD --; then
        echo "⚠️  Yerel değişiklikler bulundu, stash ediliyor..."
        git stash push -m "Auto stash before update $(date)"
    fi
    
    # Remote'dan güncellemeleri çek
    echo "📥 Remote'dan güncellemeler çekiliyor..."
    git fetch origin
    
    # Branch'i kontrol et ve güncelle
    current_branch=\$(git branch --show-current)
    if [ "\$current_branch" != "$BRANCH" ]; then
        echo "🔄 Branch değiştiriliyor: \$current_branch -> $BRANCH"
        git checkout $BRANCH
    fi
    
    # Remote ile senkronize et
    echo "🔄 Remote ile senkronize ediliyor..."
    git reset --hard origin/$BRANCH
    git clean -fd
    
    # Son commit bilgisini göster
    echo "📋 Son commit:"
    git log --oneline -1
    
    # Environment dosyası kontrolü
    if [ ! -f ".env" ]; then
        if [ -f "env.production.template" ]; then
            echo "⚠️  Environment dosyası oluşturuluyor..."
            cp env.production.template .env
            echo "⚠️  Lütfen .env dosyasını production ayarlarınızla güncelleyin!"
        fi
    fi
    
    # Docker Compose dosyası kontrolü
    if [ ! -f "docker-compose.yml" ]; then
        if [ -f "docker-compose.prod.yml" ]; then
            echo "📄 Docker Compose dosyası kopyalanıyor..."
            cp docker-compose.prod.yml docker-compose.yml
        fi
    fi
    
    # Mevcut servisleri durdur
    echo "🛑 Mevcut servisler durduruluyor..."
    docker-compose down || true
    
    # Docker image'larını yeniden build et
    echo "🔨 Docker image'ları build ediliyor..."
    docker-compose build --no-cache
    
    # Servisleri başlat
    echo "🚀 Servisler başlatılıyor..."
    docker-compose up -d
    
    # Health check
    echo "🏥 Health check yapılıyor..."
    sleep 10
    
    # Servis durumunu kontrol et
    if docker-compose ps | grep -q "Up"; then
        echo "✅ Güncelleme başarılı!"
        echo ""
        echo "📊 Servis durumu:"
        docker-compose ps
    else
        echo "❌ Güncelleme başarısız! Logları kontrol edin."
        docker-compose logs --tail=50
        exit 1
    fi
EOF

# Systemd service güncelleme (eğer varsa)
if ssh $USER@$SERVER_IP "[ -f '/etc/systemd/system/lxplayer.service' ]"; then
    log "Systemd service güncelleniyor..."
    ssh $USER@$SERVER_IP "sudo systemctl daemon-reload && sudo systemctl restart lxplayer"
fi

log "✅ Git Update & Deploy tamamlandı!"
echo ""
echo "🌐 Uygulama şu adreslerde erişilebilir:"
echo "   - Web: http://$SERVER_IP"
echo "   - API: http://$SERVER_IP/api"
echo "   - MinIO Console: http://$SERVER_IP/minio"
echo ""
echo "📊 Servis durumu kontrol etmek için:"
echo "   ssh $USER@$SERVER_IP 'cd $DEPLOY_DIR && docker-compose ps'"
echo ""
echo "📝 Logları görüntülemek için:"
echo "   ssh $USER@$SERVER_IP 'cd $DEPLOY_DIR && docker-compose logs -f'"
echo ""
echo "🔄 Hızlı güncelleme için:"
echo "   ./update-deploy.sh $SERVER_IP $USER $BRANCH $DEPLOY_DIR"
