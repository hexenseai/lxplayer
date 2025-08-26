#!/bin/bash

echo "🔄 API'yi Yeniden Başlatıyoruz..."
echo ""

echo "📊 Mevcut Container Durumu:"
docker compose ps api
echo ""

echo "🔄 API Container'ını Yeniden Başlatıyoruz:"
docker compose restart api
echo ""

echo "⏳ API'nin Başlamasını Bekliyoruz..."
sleep 10
echo ""

echo "🧪 API Testi:"
echo "1. API Health Check:"
curl -s http://yodea.hexense.ai/api/
echo ""
echo ""

echo "2. API Debug Endpoint:"
curl -s http://yodea.hexense.ai/api/debug
echo ""
echo ""

echo "3. Frame Configs Test:"
curl -s http://yodea.hexense.ai/api/frame-configs/global
echo ""
echo ""

echo "✅ API yeniden başlatma tamamlandı!"
