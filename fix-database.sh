#!/bin/bash

# LXPlayer Database Fix Script
# Bu script database migration sorunlarını çözer

set -e

echo "🗄️ LXPlayer Database Fix başlatılıyor..."

USERNAME=${SUDO_USER:-$USER}
PROJECT_DIR="/home/$USERNAME/lxplayer"

echo "👤 Kullanıcı: $USERNAME"
echo "📁 Proje Dizini: $PROJECT_DIR"

cd "$PROJECT_DIR"

# 1. Database migration'ları çalıştır
echo "🔄 Database migration'ları çalıştırılıyor..."
docker compose exec api alembic upgrade head

# 2. Migration durumunu kontrol et
echo "📊 Migration durumu:"
docker compose exec api alembic current

# 3. API container'ını yeniden başlat
echo "🔄 API container'ı yeniden başlatılıyor..."
docker compose restart api

# 4. API'nin başlamasını bekle
echo "⏳ API'nin başlaması bekleniyor..."
sleep 10

# 5. API endpoint testleri
echo "🧪 API endpoint testleri:"

echo "Testing localhost:8000/docs..."
curl -s http://localhost:8000/docs > /dev/null && echo "✅ API docs çalışıyor" || echo "❌ API docs çalışmıyor"

echo "Testing localhost:8000/health..."
curl -s http://localhost:8000/health > /dev/null && echo "✅ API health çalışıyor" || echo "❌ API health çalışmıyor"

echo "Testing yodea.hexense.ai/docs..."
curl -s http://yodea.hexense.ai/docs > /dev/null && echo "✅ API docs (domain) çalışıyor" || echo "❌ API docs (domain) çalışmıyor"

echo ""
echo "✅ Database Fix tamamlandı!"
echo ""
echo "🌐 Test URL'leri:"
echo "   - API Docs: http://yodea.hexense.ai/docs"
echo "   - Local API: http://localhost:8000/docs"
