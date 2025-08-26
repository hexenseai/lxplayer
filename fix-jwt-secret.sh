#!/bin/bash

echo "🔧 JWT_SECRET Sorunu Çözümü Başlıyor..."
echo ""

echo "📄 .env Dosyası Kontrolü:"
if [ -f .env ]; then
    echo "✅ .env dosyası mevcut"
    grep -E "(JWT_SECRET|SECRET_KEY)" .env || echo "❌ JWT_SECRET .env dosyasında yok"
else
    echo "❌ .env dosyası bulunamadı"
fi
echo ""

echo "🔧 JWT_SECRET Ekleme:"
# JWT_SECRET'ı .env dosyasına ekle
if ! grep -q "JWT_SECRET" .env; then
    echo "JWT_SECRET=your-super-secret-jwt-key-change-in-production" >> .env
    echo "✅ JWT_SECRET .env dosyasına eklendi"
else
    echo "✅ JWT_SECRET zaten mevcut"
fi
echo ""

echo "📄 .env Dosyası (JWT_SECRET satırı):"
grep -E "(JWT_SECRET|SECRET_KEY)" .env
echo ""

echo "🔄 API Container'ını Yeniden Başlatıyor..."
docker compose restart api
echo ""

echo "⏳ API'nin başlamasını bekliyor (15 saniye)..."
sleep 15

echo "🔐 JWT_SECRET Testi:"
docker compose exec api python -c "
import os
jwt_secret = os.getenv('JWT_SECRET')
if jwt_secret:
    print(f'✅ JWT_SECRET mevcut: {jwt_secret[:10]}...')
else:
    print('❌ JWT_SECRET hala eksik!')
"
echo ""

echo "🧪 Login Testi:"
curl -s -X POST http://yodea.hexense.ai/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lxplayer.com","password":"admin123"}' \
  -w "Status: %{http_code}\n" \
  -o /dev/null
echo ""

echo "✅ JWT_SECRET sorunu çözümü tamamlandı!"
