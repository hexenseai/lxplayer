#!/bin/bash

echo "🔍 API Loglarını Kontrol Ediyoruz..."
echo ""

echo "📋 API Container Logları (son 50 satır):"
docker compose logs --tail=50 api
echo ""

echo "🔍 Frame Configs Endpoint Testi:"
curl -v http://yodea.hexense.ai/api/frame-configs/global 2>&1 | head -30
echo ""

echo "✅ API log kontrolü tamamlandı!"
