#!/bin/bash

echo "🔧 Eksik Environment Variables Düzeltiliyor..."
echo ""

echo "📄 .env Dosyası Kontrolü:"
if [ -f .env ]; then
    echo "✅ .env dosyası mevcut"
else
    echo "❌ .env dosyası bulunamadı"
    exit 1
fi
echo ""

echo "🔧 Eksik Environment Variables Ekleme:"

# NEXT_PUBLIC_CDN_URL ekle
if ! grep -q "NEXT_PUBLIC_CDN_URL" .env; then
    echo "NEXT_PUBLIC_CDN_URL=http://yodea.hexense.ai:9000/lxplayer" >> .env
    echo "✅ NEXT_PUBLIC_CDN_URL eklendi"
else
    echo "✅ NEXT_PUBLIC_CDN_URL zaten mevcut"
fi

# NEXT_PUBLIC_TINYMCE_API_KEY ekle
if ! grep -q "NEXT_PUBLIC_TINYMCE_API_KEY" .env; then
    echo "NEXT_PUBLIC_TINYMCE_API_KEY=your-tinymce-api-key-here" >> .env
    echo "✅ NEXT_PUBLIC_TINYMCE_API_KEY eklendi"
else
    echo "✅ NEXT_PUBLIC_TINYMCE_API_KEY zaten mevcut"
fi

# JWT_SECRET ekle (eğer yoksa)
if ! grep -q "JWT_SECRET" .env; then
    echo "JWT_SECRET=your-super-secret-jwt-key-change-in-production" >> .env
    echo "✅ JWT_SECRET eklendi"
else
    echo "✅ JWT_SECRET zaten mevcut"
fi
echo ""

echo "📄 .env Dosyası (yeni değişkenler):"
grep -E "(NEXT_PUBLIC_CDN_URL|NEXT_PUBLIC_TINYMCE_API_KEY|JWT_SECRET)" .env
echo ""

echo "🔄 Docker Container'larını Yeniden Başlatıyor..."
docker compose down
docker compose up -d
echo ""

echo "⏳ Container'ların başlamasını bekliyor (30 saniye)..."
sleep 30

echo "🔍 Environment Variables Testi:"
docker compose exec api env | grep -E "(JWT_SECRET|NEXT_PUBLIC)" | head -3
echo ""

docker compose exec web env | grep -E "(NEXT_PUBLIC_CDN_URL|NEXT_PUBLIC_TINYMCE_API_KEY)" | head -2
echo ""

echo "🧪 Login Testi:"
curl -s -X POST http://yodea.hexense.ai/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lxplayer.com","password":"admin123"}' \
  -w "Status: %{http_code}\n" \
  -o /dev/null
echo ""

echo "✅ Environment variables düzeltme tamamlandı!"
