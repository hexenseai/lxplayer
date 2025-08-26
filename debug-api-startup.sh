#!/bin/bash

echo "🔍 API Startup Debug Başlıyor..."
echo ""

echo "📋 API Logları (tam):"
docker compose logs api
echo ""

echo "🔧 API Container'ına Bağlanma Testi:"
docker compose exec api echo "Container erişilebilir"
echo ""

echo "🐍 Python Test:"
docker compose exec api python -c "print('Python çalışıyor')"
echo ""

echo "📦 FastAPI Import Testi:"
docker compose exec api python -c "
try:
    import fastapi
    print(f'✅ FastAPI import başarılı: {fastapi.__version__}')
except ImportError as e:
    print(f'❌ FastAPI import hatası: {e}')
"
echo ""

echo "🔧 App Import Testi:"
docker compose exec api python -c "
try:
    from app.main import app
    print('✅ App import başarılı')
except ImportError as e:
    print(f'❌ App import hatası: {e}')
except Exception as e:
    print(f'❌ App import genel hata: {e}')
"
echo ""

echo "💾 Database Import Testi:"
docker compose exec api python -c "
try:
    from app.db import get_session
    print('✅ Database import başarılı')
except ImportError as e:
    print(f'❌ Database import hatası: {e}')
"
echo ""

echo "🔐 Auth Import Testi:"
docker compose exec api python -c "
try:
    from app.auth import verify_password
    print('✅ Auth import başarılı')
except ImportError as e:
    print(f'❌ Auth import hatası: {e}')
"
echo ""

echo "✅ Debug tamamlandı!"
