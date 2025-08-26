#!/bin/bash

echo "🔐 Gerçek Login Testi Başlıyor..."
echo ""

echo "📋 Mevcut Kullanıcıları Listele:"
docker compose exec api python -c "
from app.db import get_db
from app.models import User
from sqlalchemy.orm import Session

db = next(get_db())
users = db.query(User).all()
print(f'Toplam {len(users)} kullanıcı bulundu:')
for user in users:
    print(f'- {user.email} (ID: {user.id})')
"
echo ""

echo "🔐 Admin Kullanıcısı Oluştur:"
docker compose exec api python -c "
from app.db import get_db
from app.models import User
from sqlalchemy.orm import Session
import uuid

db = next(get_db())

# Admin kullanıcısı var mı kontrol et
admin = db.query(User).filter(User.email == 'admin@example.com').first()
if admin:
    print('✅ Admin kullanıcısı zaten mevcut')
else:
    # Admin kullanıcısı oluştur
    admin_user = User(
        id=str(uuid.uuid4()),
        email='admin@example.com',
        full_name='Admin User',
        role='admin'
    )
    admin_user.set_password('admin123')
    db.add(admin_user)
    db.commit()
    print('✅ Admin kullanıcısı oluşturuldu: admin@example.com / admin123')
"
echo ""

echo "🧪 Login Testi:"
curl -s -X POST http://yodea.hexense.ai/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}' \
  -w "Status: %{http_code}\n" | head -1
echo ""

echo "🔍 Login Response Detayı:"
curl -s -X POST http://yodea.hexense.ai/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'
echo ""
echo ""

echo "✅ Test tamamlandı!"
