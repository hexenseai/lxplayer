#!/bin/bash

echo "🔄 API Yeniden Başlatma ve Test..."
echo ""

echo "1. API Container'ı Yeniden Başlatma:"
docker compose restart api
echo ""

echo "2. API Başlama Bekleme (10 saniye):"
sleep 10
echo ""

echo "3. API Debug Endpoint Testi:"
curl -s http://yodea.hexense.ai/api/debug
echo ""
echo ""

echo "4. Frame Configs Global Testi:"
curl -s http://yodea.hexense.ai/api/frame-configs/global
echo ""
echo ""

echo "5. API Logs Kontrolü:"
docker compose logs --tail=10 api
echo ""

echo "✅ API restart ve test tamamlandı!"
