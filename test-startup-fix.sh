#!/bin/bash

echo "🧪 Startup Düzeltmesi Testi..."
echo ""

echo "1. API Container'ı Yeniden Başlatma:"
docker compose restart api
echo ""

echo "2. API Başlama Bekleme (20 saniye):"
sleep 20
echo ""

echo "3. API Startup Logs Kontrolü:"
docker compose logs --tail=30 api | grep -E "(Starting|Application|startup|complete|Database)"
echo ""

echo "4. API Debug Endpoint Testi:"
curl -s http://yodea.hexense.ai/api/debug | python3 -m json.tool
echo ""

echo "5. Frame Configs Global Testi:"
curl -s http://yodea.hexense.ai/api/frame-configs/global
echo ""

echo "✅ Startup düzeltmesi testi tamamlandı!"
