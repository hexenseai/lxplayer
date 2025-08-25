#!/bin/bash

# LXPlayer Ubuntu Deployment Script
# Bu script Ubuntu sunucuya LXPlayer'ı hızlıca kurar

set -e

echo "🚀 LXPlayer Ubuntu Deployment Script başlatılıyor..."

# Renk kodları
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Log fonksiyonu
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

# Sistem güncellemesi
log "Sistem güncelleniyor..."
sudo apt update && sudo apt upgrade -y

# Gerekli paketlerin kurulumu
log "Gerekli paketler kuruluyor..."
sudo apt install -y \
    curl \
    wget \
    git \
    unzip \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release

# Docker kurulumu
log "Docker kuruluyor..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt update
    sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    sudo usermod -aG docker $USER
    log "Docker kuruldu. Yeni grup izinlerinin etkili olması için sistemi yeniden başlatmanız gerekebilir."
else
    log "Docker zaten kurulu."
fi

# Docker Compose kurulumu
log "Docker Compose kuruluyor..."
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
else
    log "Docker Compose zaten kurulu."
fi

# Proje dizini oluşturma
PROJECT_DIR="/opt/lxplayer"
log "Proje dizini oluşturuluyor: $PROJECT_DIR"
sudo mkdir -p $PROJECT_DIR
sudo chown $USER:$USER $PROJECT_DIR

# Environment dosyası oluşturma
log "Environment dosyası oluşturuluyor..."
cat > $PROJECT_DIR/.env << EOF
# Database Configuration
DATABASE_URL=postgresql+psycopg2://postgres:postgres@postgres:5432/lxplayer

# MinIO Configuration
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_ENDPOINT=minio:9000
MINIO_SECURE=false

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000

# Security (Production'da değiştirin!)
SECRET_KEY=your-secret-key-here-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Redis Configuration
REDIS_URL=redis://redis:6379

# Qdrant Configuration
QDRANT_URL=http://qdrant:6333
EOF

log "Environment dosyası oluşturuldu: $PROJECT_DIR/.env"
warn "Production ortamında SECRET_KEY ve diğer güvenlik ayarlarını değiştirmeyi unutmayın!"

# Docker Compose dosyasını kopyalama
log "Docker Compose dosyası kopyalanıyor..."
cp docker-compose.prod.yml $PROJECT_DIR/docker-compose.yml

# Nginx kurulumu (opsiyonel - reverse proxy için)
log "Nginx kuruluyor (reverse proxy için)..."
sudo apt install -y nginx

# Nginx konfigürasyonu
log "Nginx konfigürasyonu oluşturuluyor..."
sudo tee /etc/nginx/sites-available/lxplayer << EOF
server {
    listen 80;
    server_name _;

    # Web uygulaması
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # API
    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # MinIO Console
    location /minio/ {
        proxy_pass http://localhost:9001/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Nginx site'ını etkinleştirme
sudo ln -sf /etc/nginx/sites-available/lxplayer /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl restart nginx

# Systemd service dosyası oluşturma
log "Systemd service dosyası oluşturuluyor..."
sudo tee /etc/systemd/system/lxplayer.service << EOF
[Unit]
Description=LXPlayer Docker Compose
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$PROJECT_DIR
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

# Service'i etkinleştirme
sudo systemctl enable lxplayer.service

# Firewall ayarları
log "Firewall ayarları yapılandırılıyor..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

log "✅ Kurulum tamamlandı!"
echo ""
echo "📋 Sonraki adımlar:"
echo "1. Proje dosyalarını $PROJECT_DIR dizinine kopyalayın"
echo "2. $PROJECT_DIR/.env dosyasını production ayarlarıyla güncelleyin"
echo "3. Servisi başlatın: sudo systemctl start lxplayer"
echo "4. Durumu kontrol edin: sudo systemctl status lxplayer"
echo "5. Logları görüntüleyin: sudo journalctl -u lxplayer -f"
echo ""
echo "🌐 Uygulama şu adreslerde erişilebilir olacak:"
echo "   - Web: http://sunucu-ip-adresi"
echo "   - API: http://sunucu-ip-adresi/api"
echo "   - MinIO Console: http://sunucu-ip-adresi/minio"
echo ""
echo "🔧 Manuel başlatma için:"
echo "   cd $PROJECT_DIR && docker-compose up -d"
