#!/bin/bash

echo "🔧 Migration Sorunu Çözümü Başlıyor..."
echo ""

echo "📊 Mevcut Migration Durumu:"
docker compose exec api alembic current
echo ""

echo "🔄 Migration'ları Temizliyor..."
docker compose exec api alembic stamp head
echo ""

echo "📋 Migration History:"
docker compose exec api alembic history
echo ""

echo "🔄 API Container'ını Yeniden Başlatıyor..."
docker compose restart api
echo ""

echo "⏳ API'nin başlamasını bekliyor (30 saniye)..."
sleep 30

echo "📋 API Logları (son 10 satır):"
docker compose logs --tail=10 api
echo ""

echo "🧪 Login Testi:"
curl -s -X POST http://yodea.hexense.ai/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lxplayer.com","password":"admin123"}' \
  -w "Status: %{http_code}\n" \
  -o /dev/null
echo ""

echo "✅ Migration sorunu çözümü tamamlandı!"
