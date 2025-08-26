#!/bin/bash

# LXPlayer Force Rebuild Web Script
# Bu script web container'ını tamamen yeniden build eder

set -e

echo "🔨 LXPlayer Force Rebuild Web başlatılıyor..."

USERNAME=${SUDO_USER:-$USER}
PROJECT_DIR="/home/$USERNAME/lxplayer"

echo "👤 Kullanıcı: $USERNAME"
echo "📁 Proje Dizini: $PROJECT_DIR"

cd "$PROJECT_DIR"

# 1. Tüm container'ları durdur
echo "🛑 Container'lar durduruluyor..."
docker compose down

# 2. Web image'ını sil
echo "🗑️ Web image'ı siliniyor..."
docker rmi lxplayer-web:prod || echo "Image zaten silinmiş"

# 3. Docker build cache'ini temizle
echo "🧹 Docker build cache temizleniyor..."
docker builder prune -f

# 4. Web container'ını yeniden build et
echo "🔨 Web container'ı yeniden build ediliyor..."
docker compose build --no-cache --pull web

# 5. Container'ları başlat
echo "🚀 Container'lar başlatılıyor..."
docker compose up -d

# 6. Container'ların başlamasını bekle
echo "⏳ Container'ların başlaması bekleniyor..."
sleep 20

# 7. Web container environment variables kontrolü
echo "🔍 Web container environment variables:"
WEB_CONTAINER=$(docker compose ps -q web)
if [ -n "$WEB_CONTAINER" ]; then
    echo "NEXT_PUBLIC_API_URL:"
    docker exec $WEB_CONTAINER printenv | grep NEXT_PUBLIC_API_URL
else
    echo "❌ Web container bulunamadı!"
fi

# 8. Test endpoint'leri
echo "🧪 Test endpoint'leri:"

echo "Testing http://yodea.hexense.ai..."
curl -s http://yodea.hexense.ai > /dev/null && echo "✅ Web uygulaması çalışıyor" || echo "❌ Web uygulaması çalışmıyor"

echo "Testing http://yodea.hexense.ai/api/docs..."
curl -s http://yodea.hexense.ai/api/docs > /dev/null && echo "✅ API docs çalışıyor" || echo "❌ API docs çalışmıyor"

# 9. Browser test için bilgi
echo ""
echo "✅ Force Rebuild Web tamamlandı!"
echo ""
echo "🌐 Test URL'leri:"
echo "   - Web: http://yodea.hexense.ai"
echo "   - Login: http://yodea.hexense.ai/login"
echo "   - API Docs: http://yodea.hexense.ai/api/docs"
echo ""
echo "📝 Not: Web container'ı tamamen yeniden build edildi!"
echo "🔄 Şimdi browser'da login'i tekrar deneyin!"
