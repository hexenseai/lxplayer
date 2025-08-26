#!/bin/bash

echo "🔍 Next.js Routing Kontrolü Başlıyor..."
echo ""

echo "📊 Web Container Durumu:"
docker compose ps web
echo ""

echo "🌐 Web Container Logları (son 30 satır):"
docker compose logs --tail=30 web
echo ""

echo "📁 Next.js Dosya Yapısı:"
docker compose exec web ls -la /app/app/
echo ""

echo "📁 Studio Sayfası Kontrolü:"
docker compose exec web ls -la /app/app/studio/ 2>/dev/null || echo "❌ Studio dizini bulunamadı"
echo ""

echo "🧪 Sayfa Testleri:"

echo "1. Ana Sayfa:"
curl -s -o /dev/null -w "Status: %{http_code}\n" http://yodea.hexense.ai/
echo ""

echo "2. Studio Sayfası:"
curl -s -o /dev/null -w "Status: %{http_code}\n" http://yodea.hexense.ai/studio
echo ""

echo "3. Admin Sayfası:"
curl -s -o /dev/null -w "Status: %{http_code}\n" http://yodea.hexense.ai/admin
echo ""

echo "4. Library Sayfası:"
curl -s -o /dev/null -w "Status: %{http_code}\n" http://yodea.hexense.ai/library
echo ""

echo "5. Profile Sayfası:"
curl -s -o /dev/null -w "Status: %{http_code}\n" http://yodea.hexense.ai/profile
echo ""

echo "🔍 Nginx Config Kontrolü:"
sudo cat /etc/nginx/sites-available/default | grep -A 5 -B 5 "location /"
echo ""

echo "🔍 Web Container Environment:"
docker compose exec web env | grep -E "(NODE_ENV|NEXT_PUBLIC)" | head -5
echo ""

echo "✅ Next.js routing kontrolü tamamlandı!"
