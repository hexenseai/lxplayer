#!/bin/bash

# LXPlayer Simple Environment Check Script
# Bu script environment variable'ları kontrol eder ve login sorununu test eder

set -e

echo "🔍 LXPlayer Simple Environment Check başlatılıyor..."

USERNAME=${SUDO_USER:-$USER}
PROJECT_DIR="/home/$USERNAME/lxplayer"

echo "👤 Kullanıcı: $USERNAME"
echo "📁 Proje Dizini: $PROJECT_DIR"

cd "$PROJECT_DIR"

# 1. Ana .env dosyasını kontrol et
echo "📄 Ana .env dosyası:"
cat .env | grep NEXT_PUBLIC_API_URL

# 2. Web container environment variables
echo ""
echo "🔧 Web container environment variables:"
WEB_CONTAINER=$(docker compose ps -q web)
if [ -n "$WEB_CONTAINER" ]; then
    docker exec $WEB_CONTAINER printenv | grep NEXT_PUBLIC_API_URL
else
    echo "❌ Web container bulunamadı!"
fi

# 3. API endpoint testleri
echo ""
echo "🧪 API endpoint testleri:"

echo "Testing localhost:8000/docs..."
curl -s -w "HTTP Status: %{http_code}\n" http://localhost:8000/docs | head -3

echo ""
echo "Testing yodea.hexense.ai/api/docs..."
curl -s -w "HTTP Status: %{http_code}\n" http://yodea.hexense.ai/api/docs | head -3

# 4. Login endpoint testi
echo ""
echo "🧪 Login endpoint testi:"
echo "Testing OPTIONS request to yodea.hexense.ai/auth/login..."
curl -s -X OPTIONS http://yodea.hexense.ai/auth/login \
  -H "Origin: http://yodea.hexense.ai" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -w "HTTP Status: %{http_code}\n" \
  -v 2>&1 | grep -E "(Access-Control|HTTP)" | head -5

# 5. Browser test için bilgi
echo ""
echo "🌐 Browser test için:"
echo "1. http://yodea.hexense.ai adresine gidin"
echo "2. F12 ile Developer Tools açın"
echo "3. Console sekmesine gidin"
echo "4. Şu komutu yazın: console.log('API URL:', process.env.NEXT_PUBLIC_API_URL)"
echo "5. Network sekmesinde login isteğini kontrol edin"

echo ""
echo "✅ Simple Environment Check tamamlandı!"
