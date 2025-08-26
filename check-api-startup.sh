#!/bin/bash

echo "🔍 API Startup Durumunu Kontrol Ediyoruz..."
echo ""

echo "📊 API Container Durumu:"
docker compose ps api
echo ""

echo "📋 API Logları (son 20 satır):"
docker compose logs --tail=20 api
echo ""

echo "🧪 API Health Check:"
curl -s http://yodea.hexense.ai/api/
echo ""
echo ""

echo "🔍 API Startup Complete Kontrolü:"
docker compose logs api | grep -i "startup\|complete\|ready" | tail -5
echo ""

echo "✅ API startup kontrolü tamamlandı!"
