#!/bin/bash

# LXPlayer Simple Auto-Start Setup
# Bu script temel otomatik başlatma servislerini kurar

set -e

echo "🚀 LXPlayer Auto-Start Setup başlatılıyor..."

# Kullanıcı kontrolü
if [ "$EUID" -ne 0 ]; then
    echo "❌ Bu script sudo ile çalıştırılmalıdır!"
    exit 1
fi

USERNAME=${SUDO_USER:-$USER}
PROJECT_DIR="/home/$USERNAME/lxplayer"

echo "👤 Kullanıcı: $USERNAME"
echo "📁 Proje Dizini: $PROJECT_DIR"

# 1. Docker servisini etkinleştir
echo "🐳 Docker servisi etkinleştiriliyor..."
systemctl enable docker
systemctl start docker

# 2. Nginx kurulumu
echo "🌐 Nginx kurulumu..."
if ! command -v nginx &> /dev/null; then
    apt update
    apt install -y nginx
fi

# 3. Nginx konfigürasyonu
echo "⚙️ Nginx konfigürasyonu..."
cat > /etc/nginx/sites-available/lxplayer << 'EOF'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /minio/ {
        proxy_pass http://localhost:9001/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Nginx site'ını etkinleştir
ln -sf /etc/nginx/sites-available/lxplayer /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Nginx'i etkinleştir
systemctl enable nginx
systemctl restart nginx

# 4. LXPlayer systemd service
echo "🔧 LXPlayer systemd service oluşturuluyor..."
cat > /etc/systemd/system/lxplayer.service << EOF
[Unit]
Description=LXPlayer Docker Compose Service
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
User=$USERNAME
Group=$USERNAME
WorkingDirectory=$PROJECT_DIR
ExecStart=/usr/local/bin/docker compose up -d
ExecStop=/usr/local/bin/docker compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

# 5. Servisleri etkinleştir
echo "✅ Servisler etkinleştiriliyor..."
systemctl daemon-reload
systemctl enable lxplayer

# 6. Firewall
echo "🔥 Firewall ayarları..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# 7. Başlat
echo "🚀 LXPlayer servisi başlatılıyor..."
systemctl start lxplayer

echo ""
echo "✅ Auto-Start Setup tamamlandı!"
echo ""
echo "🌐 Erişim Adresleri:"
echo "   - Web: http://$(hostname -I | awk '{print $1}')"
echo "   - API: http://$(hostname -I | awk '{print $1}')/api"
echo "   - MinIO: http://$(hostname -I | awk '{print $1}')/minio"
echo ""
echo "🔧 Yönetim Komutları:"
echo "   - Durum: sudo systemctl status lxplayer"
echo "   - Başlat: sudo systemctl start lxplayer"
echo "   - Durdur: sudo systemctl stop lxplayer"
echo "   - Yeniden başlat: sudo systemctl restart lxplayer"
echo ""
echo "🔄 Sistem yeniden başlatıldığında otomatik olarak çalışacak!"
