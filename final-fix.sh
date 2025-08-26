#!/bin/bash

# LXPlayer Final Fix Script
# Bu script web container'ını yeniden build ederek environment variable sorununu çözer

set -e

echo "🔧 LXPlayer Final Fix başlatılıyor..."

USERNAME=${SUDO_USER:-$USER}
PROJECT_DIR="/home/$USERNAME/lxplayer"

echo "👤 Kullanıcı: $USERNAME"
echo "📁 Proje Dizini: $PROJECT_DIR"

cd "$PROJECT_DIR"

# 1. Environment variable'ları kontrol et
echo "🔍 Environment variable'ları kontrol ediliyor..."
echo "Ana .env dosyası:"
cat .env | grep NEXT_PUBLIC_API_URL

# 2. Web container'ını durdur
echo "🛑 Web container durduruluyor..."
docker compose stop web

# 3. Web image'ını sil
echo "🗑️ Web image'ı siliniyor..."
docker rmi lxplayer-web:prod || echo "Image zaten silinmiş"

# 4. Docker build cache'ini temizle
echo "🧹 Docker build cache temizleniyor..."
docker builder prune -f

# 5. Web container'ını yeniden build et
echo "🔨 Web container'ı yeniden build ediliyor..."
docker compose build --no-cache web

# 6. Web container'ını başlat
echo "🚀 Web container başlatılıyor..."
docker compose up -d web

# 7. Container'ın başlamasını bekle
echo "⏳ Web container'ın başlaması bekleniyor..."
sleep 20

# 8. Environment variables kontrolü
echo "🔍 Environment variables kontrolü:"
WEB_CONTAINER=$(docker compose ps -q web)
if [ -n "$WEB_CONTAINER" ]; then
    echo "NEXT_PUBLIC_API_URL:"
    docker exec $WEB_CONTAINER printenv | grep NEXT_PUBLIC_API_URL
else
    echo "❌ Web container bulunamadı!"
fi

# 9. Test endpoint'leri
echo "🧪 Test endpoint'leri:"

echo "Testing http://yodea.hexense.ai..."
curl -s http://yodea.hexense.ai > /dev/null && echo "✅ Web uygulaması çalışıyor" || echo "❌ Web uygulaması çalışmıyor"

echo "Testing http://yodea.hexense.ai/api/docs..."
curl -s http://yodea.hexense.ai/api/docs > /dev/null && echo "✅ API docs çalışıyor" || echo "❌ API docs çalışmıyor"

# 10. Final test
echo ""
echo "✅ Final Fix tamamlandı!"
echo ""
echo "🌐 Test URL'leri:"
echo "   - Web: http://yodea.hexense.ai"
echo "   - Login: http://yodea.hexense.ai/login"
echo "   - API Docs: http://yodea.hexense.ai/api/docs"
echo ""
echo "🔄 Şimdi browser'da login'i tekrar deneyin!"
echo "📝 Not: Web container'ı tamamen yeniden build edildi, environment variable'lar güncellendi!"
