#!/bin/bash

echo "🔍 API Startup Complete Kontrolü..."
echo ""

echo "1. API Container Status:"
docker compose ps api
echo ""

echo "2. API Startup Logs (Son 100 satır):"
docker compose logs --tail=100 api
echo ""

echo "3. API Health Check:"
curl -s http://yodea.hexense.ai/api/ | head -5
echo ""

echo "4. API Docs Check:"
curl -s http://yodea.hexense.ai/api/docs | head -5
echo ""

echo "5. API Debug Endpoint Check:"
curl -s http://yodea.hexense.ai/api/debug
echo ""

echo "6. Frame Configs Global Direct Test:"
curl -s http://yodea.hexense.ai/api/frame-configs/global
echo ""

echo "7. API Container Resource Usage:"
docker stats --no-stream api
echo ""

echo "✅ API startup complete kontrolü tamamlandı!"
