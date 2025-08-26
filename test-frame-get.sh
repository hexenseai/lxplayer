#!/bin/bash

echo "🔍 Frame Configs GET Method Testi..."
echo ""

echo "1. Frame Configs Global (GET):"
curl -v http://yodea.hexense.ai/api/frame-configs/global
echo ""
echo ""

echo "2. Frame Configs Global (GET) - JSON Response:"
curl -s http://yodea.hexense.ai/api/frame-configs/global
echo ""
echo ""

echo "3. Frame Configs Global (GET) - Headers:"
curl -I http://yodea.hexense.ai/api/frame-configs/global
echo ""
echo ""

echo "4. Browser Console Testi:"
echo "Browser console'da şunu çalıştırın:"
echo "fetch('http://yodea.hexense.ai/api/frame-configs/global', {method: 'GET'}).then(r => r.json()).then(console.log).catch(console.error)"
echo ""

echo "5. API Debug Endpoint:"
curl -s http://yodea.hexense.ai/api/debug
echo ""
echo ""

echo "✅ Frame configs GET testi tamamlandı!"
