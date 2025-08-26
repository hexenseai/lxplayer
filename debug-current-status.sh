#!/bin/bash

# LXPlayer Debug Current Status Script
# Bu script mevcut durumu detaylı olarak analiz eder

set -e

echo "🔍 LXPlayer Debug Current Status başlatılıyor..."

USERNAME=${SUDO_USER:-$USER}
PROJECT_DIR="/home/$USERNAME/lxplayer"

echo "👤 Kullanıcı: $USERNAME"
echo "📁 Proje Dizini: $PROJECT_DIR"

cd "$PROJECT_DIR"

# 1. Docker container'larının durumu
echo "🐳 Docker container'larının durumu:"
docker compose ps

echo ""
echo "📊 Container log'ları:"

# 2. API container log'ları
echo "🔍 API container log'ları (son 20 satır):"
docker compose logs --tail=20 api

echo ""
echo "🌐 Web container log'ları (son 20 satır):"
docker compose logs --tail=20 web

# 3. Environment variables kontrolü
echo ""
echo "🔧 Environment variables kontrolü:"
echo "=== .env dosyası ==="
cat .env | grep -E "(NEXT_PUBLIC_API_URL|ALLOWED_ORIGINS)" || echo "Bu değişkenler bulunamadı"

echo ""
echo "=== Web container environment ==="
WEB_CONTAINER=$(docker compose ps -q web)
if [ -n "$WEB_CONTAINER" ]; then
    docker exec $WEB_CONTAINER env | grep NEXT_PUBLIC_API_URL
else
    echo "❌ Web container bulunamadı!"
fi

echo ""
echo "=== API container environment ==="
API_CONTAINER=$(docker compose ps -q api)
if [ -n "$API_CONTAINER" ]; then
    docker exec $API_CONTAINER env | grep -E "(ALLOWED_ORIGINS|CORS)" || echo "CORS değişkenleri bulunamadı"
else
    echo "❌ API container bulunamadı!"
fi

# 4. Port durumu
echo ""
echo "🔌 Port durumu:"
ss -tlnp | grep -E ':(8000|3000|80|443)' || echo "Port bilgisi alınamadı"

# 5. Nginx durumu ve yapılandırması
echo ""
echo "🌐 Nginx durumu:"
systemctl status nginx --no-pager -l

echo ""
echo "⚙️ Nginx yapılandırması:"
cat /etc/nginx/sites-available/lxplayer

# 6. API endpoint testleri
echo ""
echo "🧪 API endpoint testleri:"

echo "Testing localhost:8000/docs..."
curl -s -w "HTTP Status: %{http_code}\n" http://localhost:8000/docs | head -5

echo ""
echo "Testing localhost:8000/api/docs..."
curl -s -w "HTTP Status: %{http_code}\n" http://localhost:8000/api/docs | head -5

echo ""
echo "Testing yodea.hexense.ai/api/docs..."
curl -s -w "HTTP Status: %{http_code}\n" http://yodea.hexense.ai/api/docs | head -5

echo ""
echo "Testing yodea.hexense.ai/docs..."
curl -s -w "HTTP Status: %{http_code}\n" http://yodea.hexense.ai/docs | head -5

# 7. CORS test
echo ""
echo "🧪 CORS test:"
echo "Testing OPTIONS request to yodea.hexense.ai/auth/login..."
curl -s -X OPTIONS http://yodea.hexense.ai/auth/login \
  -H "Origin: http://yodea.hexense.ai" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v 2>&1 | grep -E "(Access-Control|HTTP)"

# 8. FastAPI router kontrolü
echo ""
echo "🔍 FastAPI router kontrolü:"
API_CONTAINER=$(docker compose ps -q api)
if [ -n "$API_CONTAINER" ]; then
    echo "API container'da router'lar kontrol ediliyor..."
    docker exec $API_CONTAINER find /app -name "*.py" -exec grep -l "router" {} \; | head -5
else
    echo "❌ API container bulunamadı!"
fi

# 9. Web uygulaması build kontrolü
echo ""
echo "🔍 Web uygulaması build kontrolü:"
WEB_CONTAINER=$(docker compose ps -q web)
if [ -n "$WEB_CONTAINER" ]; then
    echo "Web container'da environment variables:"
    docker exec $WEB_CONTAINER printenv | grep NEXT_PUBLIC
else
    echo "❌ Web container bulunamadı!"
fi

echo ""
echo "✅ Debug Current Status tamamlandı!"
echo ""
echo "📋 Özet:"
echo "1. Container'ların durumu yukarıda"
echo "2. Environment variables kontrol edildi"
echo "3. API endpoint'leri test edildi"
echo "4. CORS ayarları kontrol edildi"
echo "5. Nginx yapılandırması kontrol edildi"
