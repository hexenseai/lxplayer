#!/bin/bash

echo "🔍 Login Hatası Araştırması Başlıyor..."
echo ""

echo "📊 Container Durumu:"
docker compose ps
echo ""

echo "📋 API Container Logları (son 20 satır):"
docker compose logs --tail=20 api
echo ""

echo "🌐 Web Container Logları (son 10 satır):"
docker compose logs --tail=10 web
echo ""

echo "🔧 API Endpoint Test:"
curl -s -o /dev/null -w "Status: %{http_code}\n" http://yodea.hexense.ai/api/docs
echo ""

echo "🔐 Login Endpoint Test:"
curl -s -X POST http://yodea.hexense.ai/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}' \
  -w "Status: %{http_code}\n" \
  -o /dev/null
echo ""

echo "📝 Environment Variables (API):"
docker compose exec api env | grep -E "(DATABASE|SECRET|ALLOWED)" | head -5
echo ""

echo "💾 Database Connection Test:"
docker compose exec api python -c "
import os
from sqlalchemy import create_engine
try:
    engine = create_engine(os.getenv('DATABASE_URL'))
    with engine.connect() as conn:
        result = conn.execute('SELECT 1')
        print('✅ Database bağlantısı başarılı')
except Exception as e:
    print(f'❌ Database hatası: {e}')
"
echo ""

echo "🔍 Detaylı API Logları (son 50 satır):"
docker compose logs --tail=50 api | grep -E "(ERROR|Exception|Traceback|500|400)" | tail -10
