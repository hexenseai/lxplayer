#!/bin/bash

echo "🌐 Frontend API Çağrısı Testi..."
echo ""

echo "1. Browser'da API URL Kontrolü:"
echo "Debug sayfasını açın: http://yodea.hexense.ai/debug"
echo "NEXT_PUBLIC_API_URL değerini kontrol edin"
echo ""

echo "2. Direkt API Çağrısı Testi (Browser'da):"
echo "Browser console'da şunu çalıştırın:"
echo "fetch('http://yodea.hexense.ai/api/frame-configs/global').then(r => r.json()).then(console.log)"
echo ""

echo "3. CORS Testi:"
curl -H "Origin: http://yodea.hexense.ai" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     http://yodea.hexense.ai/api/frame-configs/global
echo ""
echo ""

echo "4. API Response Headers Kontrolü:"
curl -I http://yodea.hexense.ai/api/frame-configs/global
echo ""
echo ""

echo "5. Nginx Log Kontrolü:"
echo "Son API çağrılarını kontrol edin:"
docker compose logs --tail=20 nginx | grep -E "(frame-configs|404|error)"
echo ""
echo ""

echo "✅ Frontend API testi tamamlandı!"
