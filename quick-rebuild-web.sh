#!/bin/bash

# LXPlayer Quick Rebuild Web Script
# Bu script sadece web container'ını yeniden build eder

set -e

echo "🔨 LXPlayer Quick Rebuild Web başlatılıyor..."

USERNAME=${SUDO_USER:-$USER}
PROJECT_DIR="/home/$USERNAME/lxplayer"

echo "👤 Kullanıcı: $USERNAME"
echo "📁 Proje Dizini: $PROJECT_DIR"

cd "$PROJECT_DIR"

# 1. Sadece web container'ını durdur
echo "🛑 Web container durduruluyor..."
docker compose stop web

# 2. Web image'ını sil
echo "🗑️ Web image'ı siliniyor..."
docker rmi lxplayer-web:prod || echo "Image zaten silinmiş"

# 3. Web container'ını yeniden build et
echo "🔨 Web container'ı yeniden build ediliyor..."
docker compose build --no-cache web

# 4. Web container'ını başlat
echo "🚀 Web container başlatılıyor..."
docker compose up -d web

# 5. Container'ın başlamasını bekle
echo "⏳ Web container'ın başlaması bekleniyor..."
sleep 15

# 6. Environment variables kontrolü
echo "🔍 Environment variables kontrolü:"
WEB_CONTAINER=$(docker compose ps -q web)
if [ -n "$WEB_CONTAINER" ]; then
    echo "NEXT_PUBLIC_API_URL:"
    docker exec $WEB_CONTAINER printenv | grep NEXT_PUBLIC_API_URL
else
    echo "❌ Web container bulunamadı!"
fi

# 7. Test endpoint'leri
echo "🧪 Test endpoint'leri:"

echo "Testing http://yodea.hexense.ai..."
curl -s http://yodea.hexense.ai > /dev/null && echo "✅ Web uygulaması çalışıyor" || echo "❌ Web uygulaması çalışmıyor"

echo ""
echo "✅ Quick Rebuild Web tamamlandı!"
echo ""
echo "🌐 Test URL'leri:"
echo "   - Web: http://yodea.hexense.ai"
echo "   - Login: http://yodea.hexense.ai/login"
echo ""
echo "🔄 Şimdi browser'da login'i tekrar deneyin!"
