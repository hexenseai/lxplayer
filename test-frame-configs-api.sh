#!/bin/bash

echo "🧪 Frame Configs API Testi..."
echo ""

echo "1. Global Frame Configs (GET) - Verbose:"
curl -v http://yodea.hexense.ai/api/frame-configs/global 2>&1
echo ""
echo ""

echo "2. Global Frame Configs (GET) - JSON Response:"
curl -s http://yodea.hexense.ai/api/frame-configs/global | jq . 2>/dev/null || curl -s http://yodea.hexense.ai/api/frame-configs/global
echo ""
echo ""

echo "3. API Debug Endpoint:"
curl -s http://yodea.hexense.ai/api/debug
echo ""
echo ""

echo "4. API Health Check:"
curl -s http://yodea.hexense.ai/api/
echo ""
echo ""

echo "✅ Frame configs API testi tamamlandı!"
