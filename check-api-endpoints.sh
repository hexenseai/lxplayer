#!/bin/bash

echo "🔍 API Endpoint'leri Kontrolü Başlıyor..."
echo ""

echo "📋 API Logları (son 20 satır):"
docker compose logs --tail=20 api
echo ""

echo "🔍 API Health Check:"
curl -s -o /dev/null -w "Status: %{http_code}\n" http://yodea.hexense.ai/api/docs
echo ""

echo "🧪 API Endpoint Testleri:"

echo "1. Ana API Endpoint:"
curl -s -o /dev/null -w "Status: %{http_code}\n" http://yodea.hexense.ai/api/
echo ""

echo "2. Trainings Endpoint:"
curl -s -o /dev/null -w "Status: %{http_code}\n" http://yodea.hexense.ai/api/trainings
echo ""

echo "3. Users Endpoint:"
curl -s -o /dev/null -w "Status: %{http_code}\n" http://yodea.hexense.ai/api/users
echo ""

echo "4. Organizations Endpoint:"
curl -s -o /dev/null -w "Status: %{http_code}\n" http://yodea.hexense.ai/api/organizations
echo ""

echo "5. Assets Endpoint:"
curl -s -o /dev/null -w "Status: %{http_code}\n" http://yodea.hexense.ai/api/assets
echo ""

echo "6. Styles Endpoint:"
curl -s -o /dev/null -w "Status: %{http_code}\n" http://yodea.hexense.ai/api/styles
echo ""

echo "🔍 Nginx Config Kontrolü:"
sudo cat /etc/nginx/sites-available/default | grep -A 10 -B 5 "location /api"
echo ""

echo "🔍 API Router Testi:"
docker compose exec api python -c "
from app.main import app
print('✅ API app başarılı')
print(f'Toplam route sayısı: {len(app.routes)}')
for route in app.routes:
    if hasattr(route, 'path'):
        print(f'- {route.path} ({route.methods})')
"
echo ""

echo "✅ API endpoint'leri kontrolü tamamlandı!"
