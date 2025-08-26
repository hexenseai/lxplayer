#!/bin/bash

# LXPlayer API Status Check Script
# Bu script API servisinin durumunu kontrol eder

set -e

echo "🔍 LXPlayer API Status Check başlatılıyor..."

USERNAME=${SUDO_USER:-$USER}
PROJECT_DIR="/home/$USERNAME/lxplayer"

echo "👤 Kullanıcı: $USERNAME"
echo "📁 Proje Dizini: $PROJECT_DIR"

# 1. Docker container'larının durumu
echo "🐳 Docker container'larının durumu:"
cd "$PROJECT_DIR"
docker compose ps

echo ""
echo "📊 Container log'ları:"

# 2. API container log'ları
echo "🔍 API container log'ları (son 10 satır):"
docker compose logs --tail=10 api

echo ""
echo "🌐 Web container log'ları (son 10 satır):"
docker compose logs --tail=10 web

# 3. Port durumu
echo ""
echo "🔌 Port durumu:"
netstat -tlnp | grep -E ':(8000|3000|80|443)'

# 4. Nginx durumu
echo ""
echo "🌐 Nginx durumu:"
systemctl status nginx --no-pager -l

# 5. Nginx yapılandırması
echo ""
echo "⚙️ Nginx yapılandırması:"
cat /etc/nginx/sites-available/lxplayer

# 6. API endpoint testleri
echo ""
echo "🧪 API endpoint testleri:"

echo "Testing localhost:8000/docs..."
curl -s http://localhost:8000/docs > /dev/null && echo "✅ API docs (localhost) çalışıyor" || echo "❌ API docs (localhost) çalışmıyor"

echo "Testing localhost:8000/api/docs..."
curl -s http://localhost:8000/api/docs > /dev/null && echo "✅ API docs (/api) çalışıyor" || echo "❌ API docs (/api) çalışmıyor"

echo "Testing yodea.hexense.ai/api/docs..."
curl -s http://yodea.hexense.ai/api/docs > /dev/null && echo "✅ API docs (domain) çalışıyor" || echo "❌ API docs (domain) çalışmıyor"

echo "Testing yodea.hexense.ai/docs..."
curl -s http://yodea.hexense.ai/docs > /dev/null && echo "✅ API docs (domain /docs) çalışıyor" || echo "❌ API docs (domain /docs) çalışmıyor"

# 7. Environment variables
echo ""
echo "🔧 Environment variables:"
echo "NEXT_PUBLIC_API_URL: $(grep NEXT_PUBLIC_API_URL .env || echo 'Not found')"

echo ""
echo "✅ API Status Check tamamlandı!"
