#!/bin/bash

echo "🔧 API Startup Sorunu Çözümü Başlıyor..."
echo ""

echo "📊 Mevcut Durum:"
docker compose ps
echo ""

echo "🔄 API Container'ını Yeniden Başlatıyor..."
docker compose restart api
echo ""

echo "⏳ API'nin başlamasını bekliyor (30 saniye)..."
sleep 30

echo "📋 API Logları (son 10 satır):"
docker compose logs --tail=10 api
echo ""

echo "🔍 API Health Check:"
curl -s -o /dev/null -w "Status: %{http_code}\n" http://yodea.hexense.ai/api/docs
echo ""

echo "🔐 Login Endpoint Test:"
curl -s -X POST http://yodea.hexense.ai/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}' \
  -w "Status: %{http_code}\n" \
  -o /dev/null
echo ""

echo "💾 Database Migration Durumu:"
docker compose exec api alembic current
echo ""

echo "🔧 Environment Variables Kontrolü:"
docker compose exec api env | grep -E "(DATABASE_URL|SECRET_KEY|ALLOWED_ORIGINS)" | head -3
echo ""

echo "✅ Kontrol tamamlandı!"
