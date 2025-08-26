#!/bin/bash

echo "🔍 API Tam Başlama Kontrolü..."
echo ""

echo "📋 API Logları (son 20 satır):"
docker compose logs --tail=20 api
echo ""

echo "🔍 API Health Check (localhost):"
curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:8000/docs
echo ""

echo "🔍 API Health Check (public):"
curl -s -o /dev/null -w "Status: %{http_code}\n" http://yodea.hexense.ai/api/docs
echo ""

echo "🔐 Login Testi (localhost):"
curl -s -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lxplayer.com","password":"admin123"}' \
  -w "Status: %{http_code}\n" \
  -o /dev/null
echo ""

echo "🔐 Login Testi (public):"
curl -s -X POST http://yodea.hexense.ai/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lxplayer.com","password":"admin123"}' \
  -w "Status: %{http_code}\n" \
  -o /dev/null
echo ""

echo "🔍 Detaylı Login Response:"
curl -s -X POST http://yodea.hexense.ai/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lxplayer.com","password":"admin123"}'
echo ""
echo ""

echo "✅ API kontrolü tamamlandı!"
