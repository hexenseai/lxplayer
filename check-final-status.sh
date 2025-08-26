#!/bin/bash

# LXPlayer Check Final Status Script
# Bu script rebuild sonrası durumu kontrol eder

set -e

echo "🔍 LXPlayer Check Final Status başlatılıyor..."

USERNAME=${SUDO_USER:-$USER}
PROJECT_DIR="/home/$USERNAME/lxplayer"

echo "👤 Kullanıcı: $USERNAME"
echo "📁 Proje Dizini: $PROJECT_DIR"

cd "$PROJECT_DIR"

# 1. Container durumu
echo "🐳 Container durumu:"
docker compose ps

# 2. Web container environment variables
echo ""
echo "🔧 Web container environment variables:"
WEB_CONTAINER=$(docker compose ps -q web)
if [ -n "$WEB_CONTAINER" ]; then
    echo "NEXT_PUBLIC_API_URL:"
    docker exec $WEB_CONTAINER printenv | grep NEXT_PUBLIC_API_URL
else
    echo "❌ Web container bulunamadı!"
fi

# 3. Test endpoint'leri
echo ""
echo "🧪 Test endpoint'leri:"

echo "Testing http://yodea.hexense.ai..."
curl -s http://yodea.hexense.ai > /dev/null && echo "✅ Web uygulaması çalışıyor" || echo "❌ Web uygulaması çalışmıyor"

echo "Testing http://yodea.hexense.ai/api/docs..."
curl -s http://yodea.hexense.ai/api/docs > /dev/null && echo "✅ API docs çalışıyor" || echo "❌ API docs çalışmıyor"

# 4. Login endpoint testi
echo ""
echo "🧪 Login endpoint testi:"
echo "Testing OPTIONS request to yodea.hexense.ai/auth/login..."
curl -s -X OPTIONS http://yodea.hexense.ai/auth/login \
  -H "Origin: http://yodea.hexense.ai" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -w "HTTP Status: %{http_code}\n" \
  -v 2>&1 | grep -E "(Access-Control|HTTP)" | head -3

echo ""
echo "✅ Check Final Status tamamlandı!"
echo ""
echo "🌐 Test URL'leri:"
echo "   - Web: http://yodea.hexense.ai"
echo "   - Login: http://yodea.hexense.ai/login"
echo "   - API Docs: http://yodea.hexense.ai/api/docs"
echo ""
echo "🔄 Şimdi browser'da login'i deneyin!"
