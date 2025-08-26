#!/bin/bash

echo "🔧 Next.js Yapısı ve API Sorunlarını Düzeltiyoruz..."
echo ""

echo "📁 Doğru Next.js Dosya Yapısını Kontrol Ediyoruz:"
docker compose exec web ls -la /app/
echo ""

echo "📁 Web App Dizini:"
docker compose exec web ls -la /app/apps/web/app/ 2>/dev/null || echo "❌ Web app dizini bulunamadı"
echo ""

echo "📁 Studio Sayfası Kontrolü:"
docker compose exec web ls -la /app/apps/web/app/studio/ 2>/dev/null || echo "❌ Studio dizini bulunamadı"
echo ""

echo "🔍 API Error Detayı:"
echo "API'den HTML dönüyor, JSON yerine. Bu genellikle Nginx config sorunu."
echo ""

echo "🔍 Nginx Config Dosyasını Buluyoruz:"
sudo find /etc/nginx -name "*.conf" -type f | head -5
echo ""

echo "🔍 Nginx Sites Kontrolü:"
sudo ls -la /etc/nginx/sites-available/ 2>/dev/null || echo "❌ sites-available dizini yok"
sudo ls -la /etc/nginx/conf.d/ 2>/dev/null || echo "❌ conf.d dizini yok"
echo ""

echo "🔍 Nginx Ana Config:"
sudo cat /etc/nginx/nginx.conf | grep -A 5 -B 5 "include"
echo ""

echo "🧪 API Test (Detaylı):"
echo "1. API'ye direkt istek:"
curl -v http://yodea.hexense.ai/api/trainings 2>&1 | head -20
echo ""

echo "2. API'ye localhost üzerinden:"
curl -v http://localhost:8000/trainings 2>&1 | head -20
echo ""

echo "🔍 Docker Compose Network Kontrolü:"
docker compose exec web curl -s http://api:8000/trainings | head -5
echo ""

echo "✅ Kontrol tamamlandı!"
