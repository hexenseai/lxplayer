#!/bin/bash

echo "🔍 Login Endpoint Debug Başlıyor..."
echo ""

echo "📋 API Logları (son 50 satır):"
docker compose logs --tail=50 api
echo ""

echo "🔍 Login Endpoint Detaylı Test:"
curl -v -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lxplayer.com","password":"admin123"}' \
  2>&1 | head -30
echo ""

echo "🔧 Auth Router Testi:"
docker compose exec api python -c "
try:
    from app.routers.auth import login
    print('✅ Auth router import başarılı')
except ImportError as e:
    print(f'❌ Auth router import hatası: {e}')
except Exception as e:
    print(f'❌ Auth router genel hata: {e}')
"
echo ""

echo "👤 User Model Testi:"
docker compose exec api python -c "
try:
    from app.models import User
    print('✅ User model import başarılı')
except ImportError as e:
    print(f'❌ User model import hatası: {e}')
except Exception as e:
    print(f'❌ User model genel hata: {e}')
"
echo ""

echo "💾 Database Session Testi:"
docker compose exec api python -c "
try:
    from app.db import get_session
    from sqlalchemy.orm import Session
    
    db_gen = get_session()
    db = next(db_gen)
    print('✅ Database session başarılı')
    
    # User tablosunu kontrol et
    from app.models import User
    users = db.query(User).all()
    print(f'✅ User tablosu erişilebilir: {len(users)} kullanıcı')
    
    # Admin kullanıcısını kontrol et
    admin = db.query(User).filter(User.email == 'admin@lxplayer.com').first()
    if admin:
        print(f'✅ Admin kullanıcısı mevcut: {admin.email}')
    else:
        print('❌ Admin kullanıcısı bulunamadı')
        
except Exception as e:
    print(f'❌ Database session hatası: {e}')
"
echo ""

echo "✅ Login endpoint debug tamamlandı!"
