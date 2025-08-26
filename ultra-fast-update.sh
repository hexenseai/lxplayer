#!/bin/bash

echo "⚡ Ultra Hızlı Güncelleme Başlıyor..."

# Sadece web container'ını restart et (build yapmadan)
echo "🔄 Web container'ı restart ediliyor..."
docker compose restart web

echo "✅ Ultra hızlı güncelleme tamamlandı!"
echo "🌐 Web uygulaması: http://yodea.hexense.ai"
echo "📊 Durum kontrolü için: docker compose ps"
echo ""
echo "⚠️ Not: Bu yöntem sadece environment variable değişiklikleri için uygundur."
echo "   Kod değişiklikleri için 'quick-update.sh' kullanın."
