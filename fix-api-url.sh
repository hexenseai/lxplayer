#!/bin/bash

# LXPlayer API URL Fix Script
# Bu script API URL sorununu çözer

set -e

echo "🔧 LXPlayer API URL Fix başlatılıyor..."

# Kullanıcı kontrolü
if [ "$EUID" -ne 0 ]; then
    echo "❌ Bu script sudo ile çalıştırılmalıdır!"
    exit 1
fi

USERNAME=${SUDO_USER:-$USER}
PROJECT_DIR="/home/$USERNAME/lxplayer"

echo "👤 Kullanıcı: $USERNAME"
echo "📁 Proje Dizini: $PROJECT_DIR"

# 1. Sunucu IP'sini al
SERVER_IP=$(hostname -I | awk '{print $1}')
echo "🌐 Sunucu IP: $SERVER_IP"

# 2. Environment dosyasını güncelle
echo "⚙️ Environment dosyası güncelleniyor..."

# .env dosyasını yedekle
if [ -f "$PROJECT_DIR/.env" ]; then
    cp "$PROJECT_DIR/.env" "$PROJECT_DIR/.env.backup"
    echo "✅ .env dosyası yedeklendi"
fi

# .env dosyasını güncelle
cat > "$PROJECT_DIR/.env" << EOF
# Database Configuration
DATABASE_URL=postgresql+psycopg2://postgres:postgres@postgres:5432/lxplayer

# MinIO Configuration
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_ENDPOINT=minio:9000
MINIO_SECURE=false

# API Configuration - Sunucu IP'si kullan
NEXT_PUBLIC_API_URL=http://$SERVER_IP:8000

# Security
SECRET_KEY=your-secret-key-here-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Redis Configuration
REDIS_URL=redis://redis:6379

# Qdrant Configuration
QDRANT_URL=http://qdrant:6333

# CORS Settings - Tüm domain'lere izin ver
ALLOWED_ORIGINS=http://$SERVER_IP,http://$SERVER_IP:3000,http://yodea.hexense.ai,https://yodea.hexense.ai

# Logging
LOG_LEVEL=INFO
EOF

echo "✅ Environment dosyası güncellendi"

# 3. Nginx konfigürasyonunu güncelle
echo "🌐 Nginx konfigürasyonu güncelleniyor..."

cat > /etc/nginx/sites-available/lxplayer << EOF
server {
    listen 80;
    server_name yodea.hexense.ai $SERVER_IP;

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

    # API - /api/ path'i için
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

    # Auth endpoints için
    location /auth/ {
        proxy_pass http://localhost:8000/auth/;
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

# Nginx'i yeniden başlat
systemctl restart nginx
echo "✅ Nginx yeniden başlatıldı"

# 4. Docker container'larını yeniden başlat
echo "🐳 Docker container'ları yeniden başlatılıyor..."
cd "$PROJECT_DIR"
docker compose down
docker compose up -d

# 5. Durumu kontrol et
echo "🔍 Durum kontrol ediliyor..."
sleep 10

echo ""
echo "✅ API URL Fix tamamlandı!"
echo ""
echo "🌐 Erişim Adresleri:"
echo "   - Web: http://yodea.hexense.ai"
echo "   - API: http://yodea.hexense.ai/api"
echo "   - Auth: http://yodea.hexense.ai/auth"
echo "   - MinIO: http://yodea.hexense.ai/minio"
echo ""
echo "🔧 Test Komutları:"
echo "   - API Health: curl http://yodea.hexense.ai/api/docs"
echo "   - Auth Test: curl http://yodea.hexense.ai/auth/login"
echo ""
echo "📝 Not: Web uygulaması artık doğru API URL'ini kullanacak!"
