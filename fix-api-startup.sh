#!/bin/bash

echo "�� API Startup Sorunu Düzeltme..."
echo ""

echo "1. API Container'ı Yeniden Başlatma:"
docker compose restart api
echo ""

echo "2. API Başlama Bekleme (15 saniye):"
sleep 15
echo ""

echo "3. API Startup Logs Kontrolü:"
docker compose logs --tail=20 api
echo ""

echo "4. API Debug Endpoint Testi:"
curl -s http://yodea.hexense.ai/api/debug
echo ""
echo ""

echo "5. Frame Configs Global Testi:"
curl -s http://yodea.hexense.ai/api/frame-configs/global
echo ""
echo ""

echo "✅ API startup düzeltmesi tamamlandı!"

