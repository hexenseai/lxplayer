#!/bin/bash

# LXPlayer Check Next.js Environment Script
# Bu script Next.js'in hangi environment dosyalarını okuduğunu kontrol eder

set -e

echo "🔍 LXPlayer Check Next.js Environment başlatılıyor..."

USERNAME=${SUDO_USER:-$USER}
PROJECT_DIR="/home/$USERNAME/lxplayer"

echo "👤 Kullanıcı: $USERNAME"
echo "📁 Proje Dizini: $PROJECT_DIR"

cd "$PROJECT_DIR"

# 1. Web container'ındaki tüm environment dosyalarını kontrol et
echo "🔧 Web container'ındaki environment dosyaları:"
WEB_CONTAINER=$(docker compose ps -q web)
if [ -n "$WEB_CONTAINER" ]; then
    echo "=== /app dizinindeki .env dosyaları ==="
    docker exec $WEB_CONTAINER find /app -name ".env*" -type f 2>/dev/null || echo "Hiç .env dosyası bulunamadı"
    
    echo ""
    echo "=== /app/.env dosyası (varsa) ==="
    docker exec $WEB_CONTAINER cat /app/.env 2>/dev/null || echo "Dosya yok"
    
    echo ""
    echo "=== /app/.env.local dosyası (varsa) ==="
    docker exec $WEB_CONTAINER cat /app/.env.local 2>/dev/null || echo "Dosya yok"
    
    echo ""
    echo "=== /app/.env.production dosyası (varsa) ==="
    docker exec $WEB_CONTAINER cat /app/.env.production 2>/dev/null || echo "Dosya yok"
    
    echo ""
    echo "=== /app/.env.development dosyası (varsa) ==="
    docker exec $WEB_CONTAINER cat /app/.env.development 2>/dev/null || echo "Dosya yok"
else
    echo "❌ Web container bulunamadı!"
    exit 1
fi

# 2. Next.js config dosyasını kontrol et
echo ""
echo "⚙️ Next.js config dosyası:"
docker exec $WEB_CONTAINER cat /app/next.config.mjs 2>/dev/null || echo "next.config.mjs bulunamadı"

# 3. Package.json'da environment ayarlarını kontrol et
echo ""
echo "📦 Package.json environment ayarları:"
docker exec $WEB_CONTAINER cat /app/package.json | grep -A 5 -B 5 -i "env\|environment" || echo "Environment ayarları bulunamadı"

# 4. Docker Compose'da web servisinin environment ayarlarını kontrol et
echo ""
echo "🐳 Docker Compose web servis environment ayarları:"
grep -A 10 "web:" docker-compose.yml | grep -E "(env_file|environment)" -A 5 -B 2

# 5. Ana .env dosyasını kontrol et
echo ""
echo "📄 Ana .env dosyası:"
cat .env | grep -E "(NEXT_PUBLIC|API_URL)" || echo "Bu değişkenler bulunamadı"

# 6. Web container'ının tüm environment variables'larını kontrol et
echo ""
echo "🔍 Web container'ının tüm environment variables'ları:"
docker exec $WEB_CONTAINER printenv | grep -E "(NEXT_PUBLIC|NODE_ENV)" | sort

# 7. Next.js build log'larını kontrol et
echo ""
echo "📊 Next.js build log'ları (son 20 satır):"
docker compose logs --tail=20 web | grep -E "(NEXT_PUBLIC|API_URL|build|env)" || echo "Build log'larında bu bilgiler bulunamadı"

echo ""
echo "✅ Check Next.js Environment tamamlandı!"
echo ""
echo "📋 Özet:"
echo "1. Tüm .env dosyaları kontrol edildi"
echo "2. Next.js config kontrol edildi"
echo "3. Docker Compose environment ayarları kontrol edildi"
echo "4. Web container environment variables kontrol edildi"
echo "5. Build log'ları kontrol edildi"
