#!/bin/bash

echo "🔄 API Container Tamamen Yeniden Oluşturma (Bağlantı Kopsa Da Devam Eder)..."
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
docker compose logs --tail=50 api > api_restart_logs.txt 2>&1
echo "Logs saved to api_restart_logs.txt"
echo ""

echo "6. API Debug Endpoint Testi:"
curl -s http://yodea.hexense.ai/api/debug > api_debug_response.txt 2>&1
echo "Debug response saved to api_debug_response.txt"
echo ""

echo "7. Frame Configs Global Testi:"
curl -s http://yodea.hexense.ai/api/frame-configs/global > frame_configs_response.txt 2>&1
echo "Frame configs response saved to frame_configs_response.txt"
echo ""

echo "8. Sonuçları Göster:"
echo "=== API Logs ==="
cat api_restart_logs.txt
echo ""
echo "=== Debug Response ==="
cat api_debug_response.txt
echo ""
echo "=== Frame Configs Response ==="
cat frame_configs_response.txt
echo ""

echo "✅ API container yeniden oluşturma tamamlandı!"
echo "Logs saved to: api_restart_logs.txt, api_debug_response.txt, frame_configs_response.txt"
