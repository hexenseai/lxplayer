#!/bin/bash

echo "🚀 Hızlı Docker Güncelleme Başlıyor..."

# Sadece web container'ını durdur
echo "📦 Web container'ı durduruluyor..."
docker compose stop web

# Web image'ını kaldır (cache'i temizlemek için)
echo "🗑️ Web image'ı kaldırılıyor..."
docker rmi lxplayer-web:prod 2>/dev/null || true

# Sadece web service'ini build et (--no-cache ile)
echo "🔨 Web container'ı yeniden build ediliyor..."
docker compose build --no-cache web

# Sadece web service'ini başlat
echo "▶️ Web container'ı başlatılıyor..."
docker compose up -d web

echo "✅ Hızlı güncelleme tamamlandı!"
echo "🌐 Web uygulaması: http://yodea.hexense.ai"
echo "📊 Durum kontrolü için: docker compose ps"
