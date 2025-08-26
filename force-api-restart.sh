#!/bin/bash

echo "🔄 API Container Tamamen Yeniden Oluşturma..."
echo ""

echo "1. API Container'ını Durdurma:"
docker compose stop api
echo ""

echo "2. API Container'ını Silme:"
docker compose rm -f api
echo ""

echo "3. API Container'ını Yeniden Oluşturma:"
docker compose up -d api
echo ""

echo "4. API Başlama Bekleme (45 saniye):"
sleep 45
echo ""

echo "5. API Startup Logs Kontrolü:"
docker compose logs --tail=50 api
echo ""

echo "6. API Debug Endpoint Testi:"
curl -s http://yodea.hexense.ai/api/debug
echo ""
echo ""

echo "7. Frame Configs Global Testi:"
curl -s http://yodea.hexense.ai/api/frame-configs/global
echo ""

echo "✅ API container yeniden oluşturma tamamlandı!"
