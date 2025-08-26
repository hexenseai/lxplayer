#!/bin/bash

echo "🧪 Studio Sayfası ve API Düzeltmelerini Test Ediyoruz..."
echo ""

echo "📊 Container Durumları:"
docker compose ps
echo ""

echo "🔄 Web Container'ı Yeniden Başlatıyoruz:"
docker compose restart web
echo ""

echo "⏳ Web Container'ın Başlamasını Bekliyoruz..."
sleep 10
echo ""

echo "🧪 Studio Sayfası Testi:"
echo "1. Studio Ana Sayfa:"
curl -s -o /dev/null -w "Status: %{http_code}\n" http://yodea.hexense.ai/studio
echo ""

echo "2. Studio Trainings:"
curl -s -o /dev/null -w "Status: %{http_code}\n" http://yodea.hexense.ai/studio/trainings
echo ""

echo "3. Studio Assets:"
curl -s -o /dev/null -w "Status: %{http_code}\n" http://yodea.hexense.ai/studio/assets
echo ""

echo "🔍 API CORS Testi:"
echo "1. API Debug Endpoint:"
curl -s http://yodea.hexense.ai/api/debug | head -5
echo ""

echo "2. API Trainings (CORS test):"
curl -s -H "Origin: http://yodea.hexense.ai" -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: X-Requested-With" \
  -X OPTIONS http://yodea.hexense.ai/api/trainings
echo ""

echo "🌐 Web Container Logları (son 10 satır):"
docker compose logs --tail=10 web
echo ""

echo "🔍 API Container Logları (son 10 satır):"
docker compose logs --tail=10 api
echo ""

echo "✅ Test tamamlandı!"
