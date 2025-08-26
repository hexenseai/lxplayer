#!/bin/bash

echo "🔍 JWT_SECRET Kontrolü Başlıyor..."
echo ""

echo "🔧 Environment Variables:"
docker compose exec api env | grep -E "(JWT_SECRET|SECRET_KEY)" | head -5
echo ""

echo "🔐 JWT_SECRET Testi:"
docker compose exec api python -c "
import os
jwt_secret = os.getenv('JWT_SECRET')
if jwt_secret:
    print(f'✅ JWT_SECRET mevcut: {jwt_secret[:10]}...')
else:
    print('❌ JWT_SECRET eksik!')
"
echo ""

echo "🔐 Password Hash Testi:"
docker compose exec api python -c "
from app.auth import hash_password, verify_password

# Test password hash
test_password = 'admin123'
hashed = hash_password(test_password)
print(f'✅ Password hash başarılı: {hashed[:20]}...')

# Test password verification
is_valid = verify_password(test_password, hashed)
print(f'✅ Password verification: {is_valid}')
"
echo ""

echo "🔐 Admin Password Testi:"
docker compose exec api python -c "
from app.db import get_session
from app.models import User
from app.auth import verify_password

db_gen = get_session()
db = next(db_gen)

admin = db.exec(select(User).where(User.email == 'admin@lxplayer.com')).first()
if admin and admin.password:
    print(f'✅ Admin password hash: {admin.password[:20]}...')
    is_valid = verify_password('admin123', admin.password)
    print(f'✅ Admin password verification: {is_valid}')
else:
    print('❌ Admin password bulunamadı')
"
echo ""

echo "✅ JWT_SECRET kontrolü tamamlandı!"
