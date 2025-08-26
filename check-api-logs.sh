#!/bin/bash

echo "🔍 API Logları Kontrol Ediliyor..."
echo ""

echo "📊 Container Durumu:"
docker compose ps
echo ""

echo "📋 API Logları (son 30 satır):"
docker compose logs --tail=30 api
echo ""

echo "🔍 Hata Logları (son 50 satır):"
docker compose logs --tail=50 api | grep -E "(ERROR|Exception|Traceback|500|auth|login)" | tail -10
echo ""

echo "💾 Database Bağlantı Testi:"
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

echo "🔧 Environment Variables:"
docker compose exec api env | grep -E "(DATABASE_URL|SECRET_KEY|JWT_SECRET)" | head -3
echo ""

echo "✅ Kontrol tamamlandı!"
