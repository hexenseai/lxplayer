#!/bin/bash

# LXPlayer Web Environment Fix Script
# Bu script web uygulamasının environment variable'larını düzeltir

set -e

echo "🔧 LXPlayer Web Environment Fix başlatılıyor..."

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

# 2. Mevcut .env dosyasını yedekle
if [ -f "$PROJECT_DIR/.env" ]; then
    cp "$PROJECT_DIR/.env" "$PROJECT_DIR/.env.backup.$(date +%Y%m%d_%H%M%S)"
    echo "✅ .env dosyası yedeklendi"
fi

# 3. .env dosyasını güncelle
echo "⚙️ Environment dosyası güncelleniyor..."

cat > "$PROJECT_DIR/.env" << EOF
# Database Configuration
DATABASE_URL=postgresql+psycopg2://postgres:postgres@postgres:5432/lxplayer

# MinIO Configuration
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_ENDPOINT=minio:9000
MINIO_SECURE=false

# API Configuration - DOMAIN kullan
NEXT_PUBLIC_API_URL=http://yodea.hexense.ai

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

# 4. Docker container'larını durdur
echo "🐳 Docker container'ları durduruluyor..."
cd "$PROJECT_DIR"
docker compose down

# 5. Web container'ını yeniden build et (--no-cache ile)
echo "🔨 Web container'ı yeniden build ediliyor..."
docker compose build --no-cache web

# 6. Tüm container'ları başlat
echo "🚀 Container'lar başlatılıyor..."
docker compose up -d

echo "✅ Docker container'ları yeniden başlatıldı"

# 7. Web container'ının environment variable'larını kontrol et
echo "🔍 Web container environment variable'ları kontrol ediliyor..."

sleep 15

WEB_CONTAINER=$(docker compose ps -q web)
if [ -n "$WEB_CONTAINER" ]; then
    echo "📋 Web container environment variables:"
    docker exec $WEB_CONTAINER env | grep NEXT_PUBLIC_API_URL
else
    echo "❌ Web container bulunamadı!"
fi

# 8. Test endpoint'leri
echo "🧪 Test endpoint'leri kontrol ediliyor..."

echo "Testing http://yodea.hexense.ai/api/docs..."
curl -s http://yodea.hexense.ai/api/docs > /dev/null && echo "✅ API docs çalışıyor" || echo "❌ API docs çalışmıyor"

echo "Testing http://yodea.hexense.ai..."
curl -s http://yodea.hexense.ai > /dev/null && echo "✅ Web uygulaması çalışıyor" || echo "❌ Web uygulaması çalışmıyor"

echo ""
echo "✅ Web Environment Fix tamamlandı!"
echo ""
echo "🌐 Test URL'leri:"
echo "   - Web: http://yodea.hexense.ai"
echo "   - API Docs: http://yodea.hexense.ai/api/docs"
echo "   - Login: http://yodea.hexense.ai/login"
echo ""
echo "📝 Not: Web uygulaması artık doğru API URL'ini kullanacak!"
echo "🔄 Web container'ı yeniden build edildi, environment variable'lar güncellendi!"
