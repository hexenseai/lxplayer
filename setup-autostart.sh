#!/bin/bash

# LXPlayer Auto-Start Setup Script
# Bu script Ubuntu açılışında otomatik başlatma için gerekli servisleri kurar

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

log "LXPlayer Auto-Start Setup başlatılıyor..."

# Kullanıcı adını al
USERNAME=${SUDO_USER:-$USER}
PROJECT_DIR="/home/$USERNAME/lxplayer"

log "Kullanıcı: $USERNAME"
log "Proje Dizini: $PROJECT_DIR"

# 1. Docker servisini etkinleştir
log "Docker servisi etkinleştiriliyor..."
systemctl enable docker
systemctl start docker

# 2. Nginx kurulumu ve yapılandırması
log "Nginx kurulumu ve yapılandırması..."
if ! command -v nginx &> /dev/null; then
    apt update
    apt install -y nginx
fi

# Nginx konfigürasyonu oluştur
cat > /etc/nginx/sites-available/lxplayer << EOF
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

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

# Nginx site'ını etkinleştir
ln -sf /etc/nginx/sites-available/lxplayer /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Nginx konfigürasyonunu test et
nginx -t

# Nginx'i etkinleştir ve başlat
systemctl enable nginx
systemctl restart nginx

# 3. LXPlayer systemd service oluştur
log "LXPlayer systemd service oluşturuluyor..."

cat > /etc/systemd/system/lxplayer.service << EOF
[Unit]
Description=LXPlayer Docker Compose Service
Requires=docker.service
After=docker.service network.target
Wants=network.target

[Service]
Type=oneshot
RemainAfterExit=yes
User=$USERNAME
Group=$USERNAME
WorkingDirectory=$PROJECT_DIR
Environment=PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
ExecStart=/usr/local/bin/docker compose up -d
ExecStop=/usr/local/bin/docker compose down
ExecReload=/usr/local/bin/docker compose down && /usr/local/bin/docker compose up -d
TimeoutStartSec=0
Restart=on-failure
RestartSec=30

[Install]
WantedBy=multi-user.target
EOF

# 4. Health check script oluştur
log "Health check script oluşturuluyor..."

cat > /usr/local/bin/lxplayer-health-check << 'EOF'
#!/bin/bash

PROJECT_DIR="/home/hexense/lxplayer"
LOG_FILE="/var/log/lxplayer-health.log"

# Log fonksiyonu
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Docker servisini kontrol et
if ! systemctl is-active --quiet docker; then
    log "ERROR: Docker servisi çalışmıyor, başlatılıyor..."
    systemctl start docker
    sleep 10
fi

# LXPlayer servisini kontrol et
if ! systemctl is-active --quiet lxplayer; then
    log "ERROR: LXPlayer servisi çalışmıyor, başlatılıyor..."
    systemctl start lxplayer
    sleep 30
fi

# Container'ları kontrol et
cd "$PROJECT_DIR"
if ! docker compose ps | grep -q "Up"; then
    log "ERROR: Container'lar çalışmıyor, yeniden başlatılıyor..."
    docker compose down
    docker compose up -d
    sleep 30
fi

# Port kontrolü
if ! netstat -tulpn | grep -q ":3000"; then
    log "WARNING: Port 3000 (Web) dinlenmiyor"
fi

if ! netstat -tulpn | grep -q ":8000"; then
    log "WARNING: Port 8000 (API) dinlenmiyor"
fi

log "Health check tamamlandı"
EOF

chmod +x /usr/local/bin/lxplayer-health-check

# 5. Cron job oluştur (her 5 dakikada health check)
log "Cron job oluşturuluyor..."
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/lxplayer-health-check") | crontab -

# 6. Log rotation oluştur
log "Log rotation yapılandırması..."
cat > /etc/logrotate.d/lxplayer << EOF
/var/log/lxplayer-health.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 root root
}
EOF

# 7. Firewall ayarları
log "Firewall ayarları yapılandırılıyor..."
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable

# 8. Systemd servislerini etkinleştir
log "Systemd servisleri etkinleştiriliyor..."
systemctl daemon-reload
systemctl enable lxplayer

# 9. Başlangıçta çalıştır
log "LXPlayer servisi başlatılıyor..."
systemctl start lxplayer

# 10. Durumu kontrol et
log "Servis durumu kontrol ediliyor..."
sleep 10

if systemctl is-active --quiet lxplayer; then
    log "✅ LXPlayer servisi başarıyla başlatıldı"
else
    warn "⚠️ LXPlayer servisi başlatılamadı, logları kontrol edin"
    systemctl status lxplayer --no-pager
fi

# 11. Monitoring script oluştur
log "Monitoring script oluşturuluyor..."

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
echo "=== Recent Logs ==="
tail -10 /var/log/lxplayer-health.log
EOF

chmod +x /usr/local/bin/lxplayer-monitor

log "✅ Auto-Start Setup tamamlandı!"
echo ""
echo "📋 Kurulan Servisler:"
echo "   - Docker (otomatik başlatma)"
echo "   - Nginx (reverse proxy)"
echo "   - LXPlayer (systemd service)"
echo "   - Health Check (cron job)"
echo "   - Log Rotation"
echo "   - Firewall"
echo ""
echo "🌐 Erişim Adresleri:"
echo "   - Web: http://$(hostname -I | awk '{print $1}')"
echo "   - API: http://$(hostname -I | awk '{print $1}')/api"
echo "   - MinIO: http://$(hostname -I | awk '{print $1}')/minio"
echo ""
echo "🔧 Yönetim Komutları:"
echo "   - Durum kontrolü: sudo lxplayer-monitor"
echo "   - Servis başlatma: sudo systemctl start lxplayer"
echo "   - Servis durdurma: sudo systemctl stop lxplayer"
echo "   - Servis yeniden başlatma: sudo systemctl restart lxplayer"
echo "   - Log görüntüleme: sudo journalctl -u lxplayer -f"
echo ""
echo "🔄 Sistem yeniden başlatıldığında tüm servisler otomatik olarak başlayacak!"
