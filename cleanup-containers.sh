#!/bin/bash

# LXPlayer Container Cleanup Script
# Bu script mevcut container'ları temizler ve yeniden başlatır

set -e

echo "🧹 LXPlayer Container Cleanup başlatılıyor..."

USERNAME=${SUDO_USER:-$USER}
PROJECT_DIR="/home/$USERNAME/lxplayer"

echo "👤 Kullanıcı: $USERNAME"
echo "📁 Proje Dizini: $PROJECT_DIR"

cd "$PROJECT_DIR"

# 1. Tüm container'ları durdur ve sil
echo "🛑 Mevcut container'lar durduruluyor..."
docker compose down --remove-orphans

# 2. Eski container'ları temizle
echo "🗑️ Eski container'lar temizleniyor..."
docker container prune -f

# 3. Eski network'ları temizle
echo "🌐 Eski network'lar temizleniyor..."
docker network prune -f

# 4. Container'ları yeniden başlat
echo "🚀 Container'lar yeniden başlatılıyor..."
docker compose up -d

# 5. Container durumunu kontrol et
echo "📊 Container durumu:"
sleep 10
docker compose ps

# 6. API endpoint testleri
echo "🧪 API endpoint testleri:"

echo "Testing localhost:8000/docs..."
curl -s http://localhost:8000/docs > /dev/null && echo "✅ API docs çalışıyor" || echo "❌ API docs çalışmıyor"

echo "Testing yodea.hexense.ai/docs..."
curl -s http://yodea.hexense.ai/docs > /dev/null && echo "✅ API docs (domain) çalışıyor" || echo "❌ API docs (domain) çalışmıyor"

echo ""
echo "✅ Container Cleanup tamamlandı!"
echo ""
echo "🌐 Test URL'leri:"
echo "   - Web: http://yodea.hexense.ai"
echo "   - API Docs: http://yodea.hexense.ai/docs"
echo "   - Login: http://yodea.hexense.ai/login"
