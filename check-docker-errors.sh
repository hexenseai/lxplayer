#!/bin/bash

echo "🔍 Docker Hataları Kontrol Ediliyor..."
echo ""

echo "📊 Container Durumları:"
docker compose ps
echo ""

echo "📋 API Logları (son 50 satır):"
docker compose logs --tail=50 api
echo ""

echo "🔍 API Hata Logları (son 100 satır):"
docker compose logs --tail=100 api | grep -E "(ERROR|Exception|Traceback|500|auth|login|startup)" | tail -20
echo ""

echo "🌐 Web Logları (son 20 satır):"
docker compose logs --tail=20 web
echo ""

echo "🔍 Web Hata Logları:"
docker compose logs --tail=50 web | grep -E "(ERROR|Exception|Traceback|500)" | tail -10
echo ""

echo "💾 Database Logları (son 10 satır):"
docker compose logs --tail=10 postgres
echo ""

echo "✅ Docker hata kontrolü tamamlandı!"
