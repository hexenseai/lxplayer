#!/bin/bash

echo "🔍 API Startup Debug Başlıyor..."
echo ""

echo "📊 Container Durumları:"
docker compose ps
echo ""

echo "📋 API Container Logları (tam):"
docker compose logs api
echo ""

echo "🔧 API Container'ına Bağlanma Testi:"
docker compose exec api echo "Container erişilebilir"
echo ""

echo "🐍 Python Test:"
docker compose exec api python -c "print('Python çalışıyor')"
echo ""

echo "📦 FastAPI Test:"
docker compose exec api python -c "
try:
    import fastapi
    print(f'FastAPI version: {fastapi.__version__}')
except ImportError as e:
    print(f'FastAPI import hatası: {e}')
"
echo ""

echo "💾 Database Test:"
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
docker compose exec api env | grep -E "(DATABASE_URL|SECRET_KEY|ALLOWED_ORIGINS|NEXT_PUBLIC)" | head -5
echo ""

echo "📁 API Dosyaları Kontrolü:"
docker compose exec api ls -la /app/
echo ""

echo "🚀 API Process Kontrolü:"
docker compose exec api ps aux | grep python
echo ""

echo "🌐 Port Kontrolü:"
docker compose exec api netstat -tlnp | grep 8000
echo ""

echo "✅ Debug tamamlandı!"
