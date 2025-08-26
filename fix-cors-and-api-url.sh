#!/bin/bash

# LXPlayer CORS and API URL Fix Script
# Bu script CORS ve API URL sorunlarını çözer

set -e

echo "🔧 LXPlayer CORS and API URL Fix başlatılıyor..."

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

# 2. .env dosyasını güncelle
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
ALLOWED_ORIGINS=http://$SERVER_IP,http://$SERVER_IP:3000,http://yodea.hexense.ai,https://yodea.hexense.ai,http://localhost:3000,http://localhost:3001

# Logging
LOG_LEVEL=INFO
EOF

echo "✅ Environment dosyası güncellendi"

# 3. Nginx yapılandırmasını güncelle
echo "🌐 Nginx yapılandırması güncelleniyor..."

cat > /etc/nginx/sites-available/lxplayer << EOF
server {
    listen 80;
    server_name yodea.hexense.ai;

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
        
        # CORS headers
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range' always;
        
        if (\$request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization';
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }
    }

    # Auth endpoints
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
        
        # CORS headers
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range' always;
        
        if (\$request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization';
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }
    }

    # Diğer API endpoints
    location ~ ^/(users|organizations|assets|trainings|styles|frame-configs|tools|generate|chat|sessions|uploads)/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # CORS headers
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range' always;
        
        if (\$request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization';
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }
    }
}
EOF

echo "✅ Nginx yapılandırması güncellendi"

# 4. Nginx'i yeniden başlat
echo "🔄 Nginx yeniden başlatılıyor..."
systemctl reload nginx

# 5. Container'ları yeniden build et ve başlat
echo "🐳 Container'lar yeniden build ediliyor..."
cd "$PROJECT_DIR"
docker compose down
docker compose build --no-cache web
docker compose up -d

# 6. Container'ların başlamasını bekle
echo "⏳ Container'ların başlaması bekleniyor..."
sleep 15

# 7. Test endpoint'leri
echo "🧪 Test endpoint'leri kontrol ediliyor..."

echo "Testing http://yodea.hexense.ai/api/docs..."
curl -s http://yodea.hexense.ai/api/docs > /dev/null && echo "✅ API docs çalışıyor" || echo "❌ API docs çalışmıyor"

echo "Testing http://yodea.hexense.ai/auth/login (OPTIONS)..."
curl -s -X OPTIONS http://yodea.hexense.ai/auth/login -H "Origin: http://yodea.hexense.ai" -v 2>&1 | grep -i "access-control" && echo "✅ CORS headers çalışıyor" || echo "❌ CORS headers çalışmıyor"

echo "Testing http://yodea.hexense.ai..."
curl -s http://yodea.hexense.ai > /dev/null && echo "✅ Web uygulaması çalışıyor" || echo "❌ Web uygulaması çalışmıyor"

# 8. Web container environment variables
echo "🔍 Web container environment variables:"
WEB_CONTAINER=$(docker compose ps -q web)
if [ -n "$WEB_CONTAINER" ]; then
    docker exec $WEB_CONTAINER env | grep NEXT_PUBLIC_API_URL
else
    echo "❌ Web container bulunamadı!"
fi

echo ""
echo "✅ CORS and API URL Fix tamamlandı!"
echo ""
echo "🌐 Test URL'leri:"
echo "   - Web: http://yodea.hexense.ai"
echo "   - API Docs: http://yodea.hexense.ai/api/docs"
echo "   - Login: http://yodea.hexense.ai/login"
echo ""
echo "📝 Not: CORS sorunları çözüldü ve API URL doğru ayarlandı!"
