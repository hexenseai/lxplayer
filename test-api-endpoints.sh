#!/bin/bash

echo "🧪 API Endpoint Testleri Başlıyor..."
echo ""

echo "🔍 1. API Docs Test (localhost):"
curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:8000/docs
echo ""

echo "🔍 2. API Docs Test (public domain):"
curl -s -o /dev/null -w "Status: %{http_code}\n" http://yodea.hexense.ai/api/docs
echo ""

echo "🔍 3. API Health Test (localhost):"
curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:8000/
echo ""

echo "🔍 4. API Health Test (public domain):"
curl -s -o /dev/null -w "Status: %{http_code}\n" http://yodea.hexense.ai/api/
echo ""

echo "🔐 5. Login Endpoint Test (localhost):"
curl -s -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}' \
  -w "Status: %{http_code}\n" \
  -o /dev/null
echo ""

echo "🔐 6. Login Endpoint Test (public domain):"
curl -s -X POST http://yodea.hexense.ai/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}' \
  -w "Status: %{http_code}\n" \
  -o /dev/null
echo ""

echo "🌐 7. Nginx Status:"
sudo systemctl status nginx --no-pager -l
echo ""

echo "🔧 8. Nginx Config Test:"
sudo nginx -t
echo ""

echo "📊 9. Port Durumları:"
sudo ss -tlnp | grep -E "(80|443|8000)"
echo ""

echo "🔍 10. CORS Test (OPTIONS request):"
curl -s -X OPTIONS http://yodea.hexense.ai/auth/login \
  -H "Origin: http://yodea.hexense.ai" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -w "Status: %{http_code}\n" \
  -o /dev/null
echo ""

echo "✅ Test tamamlandı!"
