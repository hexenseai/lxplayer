#!/bin/bash

echo "🔍 404 Hataları Kontrolü Başlıyor..."
echo ""

echo "📊 Container Durumları:"
docker compose ps
echo ""

echo "🌐 Web Container Logları (son 20 satır):"
docker compose logs --tail=20 web
echo ""

echo "🔍 Web Container Environment Variables:"
docker compose exec web env | grep -E "(NEXT_PUBLIC_API_URL|NODE_ENV)" | head -3
echo ""

echo "🧪 Sayfa Testleri:"

echo "1. Ana Sayfa:"
curl -s -o /dev/null -w "Status: %{http_code}\n" http://yodea.hexense.ai/
echo ""

echo "2. Admin Sayfası:"
curl -s -o /dev/null -w "Status: %{http_code}\n" http://yodea.hexense.ai/admin
echo ""

echo "3. Library Sayfası:"
curl -s -o /dev/null -w "Status: %{http_code}\n" http://yodea.hexense.ai/library
echo ""

echo "4. Studio Sayfası:"
curl -s -o /dev/null -w "Status: %{http_code}\n" http://yodea.hexense.ai/studio
echo ""

echo "5. Profile Sayfası:"
curl -s -o /dev/null -w "Status: %{http_code}\n" http://yodea.hexense.ai/profile
echo ""

echo "6. Debug Sayfası:"
curl -s -o /dev/null -w "Status: %{http_code}\n" http://yodea.hexense.ai/debug
echo ""

echo "🔍 Nginx Logları (son 10 satır):"
sudo tail -10 /var/log/nginx/access.log
echo ""

echo "🔍 Nginx Error Logları (son 10 satır):"
sudo tail -10 /var/log/nginx/error.log
echo ""

echo "✅ 404 hataları kontrolü tamamlandı!"
