#!/bin/bash

echo "🔍 Internal Server Error Debug Başlıyor..."
echo ""

echo "📋 API Logları (tam):"
docker compose logs api
echo ""

echo "💾 Database Migration Durumu:"
docker compose exec api alembic current
echo ""

echo "🔧 Database Migration Testi:"
docker compose exec api alembic upgrade head
echo ""

echo "👤 Kullanıcı Tablosu Kontrolü:"
docker compose exec api python -c "
from sqlalchemy import create_engine, text
import os

engine = create_engine(os.getenv('DATABASE_URL'))
with engine.connect() as conn:
    try:
        result = conn.execute(text('SELECT COUNT(*) FROM \"user\"'))
        count = result.scalar()
        print(f'✅ User tablosu mevcut: {count} kullanıcı')
    except Exception as e:
        print(f'❌ User tablosu hatası: {e}')
"
echo ""

echo "🔐 Admin Kullanıcısı Kontrolü:"
docker compose exec api python -c "
from sqlalchemy import create_engine, text
import os

engine = create_engine(os.getenv('DATABASE_URL'))
with engine.connect() as conn:
    try:
        result = conn.execute(text('SELECT email FROM \"user\" WHERE email = \\'admin@lxplayer.com\\''))
        user = result.fetchone()
        if user:
            print(f'✅ Admin kullanıcısı mevcut: {user[0]}')
        else:
            print('❌ Admin kullanıcısı bulunamadı')
    except Exception as e:
        print(f'❌ Admin kullanıcısı kontrolü hatası: {e}')
"
echo ""

echo "🔍 Login Endpoint Detaylı Test:"
curl -v -X POST http://yodea.hexense.ai/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lxplayer.com","password":"admin123"}' \
  2>&1 | head -20
echo ""

echo "✅ Debug tamamlandı!"
