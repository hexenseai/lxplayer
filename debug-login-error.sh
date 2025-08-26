#!/bin/bash

echo "🔍 Login Internal Server Error Debug Başlıyor..."
echo ""

echo "📋 API Logları (son 20 satır):"
docker compose logs --tail=20 api
echo ""

echo "🔍 Detaylı API Logları (son 50 satır):"
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

echo "👤 Kullanıcı Kontrolü:"
docker compose exec api python -c "
from app.db import get_db
from app.models import User
from sqlalchemy.orm import Session

try:
    db = next(get_db())
    users = db.query(User).all()
    print(f'Toplam {len(users)} kullanıcı bulundu:')
    for user in users:
        print(f'- {user.email} (ID: {user.id})')
        
    # Admin kullanıcısını kontrol et
    admin = db.query(User).filter(User.email == 'admin@lxplayer.com').first()
    if admin:
        print(f'✅ Admin kullanıcısı mevcut: {admin.email}')
        print(f'   - ID: {admin.id}')
        print(f'   - Role: {admin.role}')
        print(f'   - Password hash: {admin.password_hash[:20]}...')
    else:
        print('❌ Admin kullanıcısı bulunamadı')
        
except Exception as e:
    print(f'❌ Kullanıcı kontrolü hatası: {e}')
"
echo ""

echo "🔐 Password Hash Testi:"
docker compose exec api python -c "
from app.db import get_db
from app.models import User
from werkzeug.security import check_password_hash

try:
    db = next(get_db())
    admin = db.query(User).filter(User.email == 'admin@lxplayer.com').first()
    if admin:
        is_valid = check_password_hash(admin.password_hash, 'admin123')
        print(f'Password kontrolü: {"✅ Geçerli" if is_valid else "❌ Geçersiz"}')
    else:
        print('❌ Admin kullanıcısı bulunamadı')
except Exception as e:
    print(f'❌ Password test hatası: {e}')
"
echo ""

echo "🔧 Environment Variables:"
docker compose exec api env | grep -E "(DATABASE_URL|SECRET_KEY|ALLOWED_ORIGINS)" | head -3
echo ""

echo "✅ Debug tamamlandı!"
