#!/bin/bash

# LXPlayer Check Web API URL Script
# Bu script web uygulamasının hangi API URL'ini kullandığını kontrol eder

set -e

echo "🔍 LXPlayer Check Web API URL başlatılıyor..."

USERNAME=${SUDO_USER:-$USER}
PROJECT_DIR="/home/$USERNAME/lxplayer"

echo "👤 Kullanıcı: $USERNAME"
echo "📁 Proje Dizini: $PROJECT_DIR"

cd "$PROJECT_DIR"

# 1. Web container'ının environment variables
echo "🔧 Web container environment variables:"
WEB_CONTAINER=$(docker compose ps -q web)
if [ -n "$WEB_CONTAINER" ]; then
    echo "NEXT_PUBLIC_API_URL:"
    docker exec $WEB_CONTAINER printenv | grep NEXT_PUBLIC_API_URL
else
    echo "❌ Web container bulunamadı!"
    exit 1
fi

# 2. Web uygulamasının build edilmiş dosyalarını kontrol et
echo ""
echo "🔍 Web uygulamasının build edilmiş dosyalarını kontrol ediliyor..."

# JavaScript dosyalarında API URL'ini ara
echo "📄 JavaScript dosyalarında API URL arama:"
docker exec $WEB_CONTAINER find /app/.next -name "*.js" -exec grep -l "localhost:8000" {} \; | head -5

# 3. Web uygulamasının source code'unu kontrol et
echo ""
echo "📄 Source code'da API URL kontrolü:"
docker exec $WEB_CONTAINER find /app -name "*.ts" -o -name "*.tsx" -o -name "*.js" | xargs grep -l "localhost:8000" | head -5

# 4. Web uygulamasının package.json'ını kontrol et
echo ""
echo "📦 Package.json kontrolü:"
docker exec $WEB_CONTAINER cat /app/package.json | grep -E "(scripts|dependencies)" | head -10

# 5. Web uygulamasının build log'larını kontrol et
echo ""
echo "📊 Build log'ları kontrolü:"
docker compose logs --tail=50 web | grep -E "(NEXT_PUBLIC|API_URL|build)" | tail -10

# 6. Browser'da test için bilgi
echo ""
echo "🌐 Browser test için:"
echo "1. http://yodea.hexense.ai adresine gidin"
echo "2. F12 ile Developer Tools açın"
echo "3. Console sekmesine gidin"
echo "4. Şu komutu yazın: console.log('API URL:', process.env.NEXT_PUBLIC_API_URL)"
echo "5. Network sekmesinde login isteğini kontrol edin"

# 7. Alternatif test
echo ""
echo "🧪 Alternatif test:"
echo "Web uygulamasının test sayfasını kontrol edin:"
echo "http://yodea.hexense.ai/test-env"

echo ""
echo "✅ Check Web API URL tamamlandı!"
