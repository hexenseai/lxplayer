#!/bin/bash

echo "🧪 API Startup Testi Başlıyor..."
echo ""

echo "📋 API Logları (son 30 satır):"
docker compose logs --tail=30 api
echo ""

echo "🔍 API Health Check (localhost):"
curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:8000/
echo ""

echo "🔍 API Docs Check (localhost):"
curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:8000/docs
echo ""

echo "🔐 Login Testi (localhost):"
curl -s -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lxplayer.com","password":"admin123"}' \
  -w "Status: %{http_code}\n" \
  -o /dev/null
echo ""

echo "🔍 Login Response (localhost):"
curl -s -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lxplayer.com","password":"admin123"}'
echo ""
echo ""

echo "🌐 Public Domain Testi:"
curl -s -X POST http://yodea.hexense.ai/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lxplayer.com","password":"admin123"}' \
  -w "Status: %{http_code}\n" \
  -o /dev/null
echo ""

echo "🔍 Public Login Response:"
curl -s -X POST http://yodea.hexense.ai/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lxplayer.com","password":"admin123"}'
echo ""
echo ""

echo "✅ API startup testi tamamlandı!"
