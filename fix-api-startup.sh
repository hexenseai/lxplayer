#!/bin/bash

echo "🔧 API Startup Sorunu Çözümü Başlıyor..."
echo ""

echo "📊 Mevcut Durum:"
docker compose ps api
echo ""

echo "🔄 API Container'ını Yeniden Başlatıyor..."
docker compose restart api
echo ""

echo "⏳ API'nin başlamasını bekliyor (30 saniye)..."
sleep 30

echo "📋 API Logları (son 20 satır):"
docker compose logs --tail=20 api
echo ""

echo "🔍 API Health Check:"
curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:8000/docs
echo ""

echo "🔐 Login Endpoint Testi:"
curl -s -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lxplayer.com","password":"admin123"}' \
  -w "Status: %{http_code}\n" \
  -o /dev/null
echo ""

echo "🌐 Public Domain Testi:"
curl -s -X POST http://yodea.hexense.ai/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lxplayer.com","password":"admin123"}' \
  -w "Status: %{http_code}\n" \
  -o /dev/null
echo ""

echo "✅ API startup kontrolü tamamlandı!"
