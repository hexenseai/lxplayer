#!/bin/bash

echo "🔧 API URL Cache Sorununu Düzeltiyoruz..."
echo ""

echo "📋 Mevcut .env Kontrolü:"
cat .env | grep NEXT_PUBLIC_API_URL
echo ""

echo "🔄 Web Container'ı Durduruyoruz:"
docker compose stop web
echo ""

echo "🗑️ Web Image'ını Siliyoruz:"
docker rmi lxplayer-web:prod
echo ""

echo "🔨 Web Container'ı Yeniden Build Ediyoruz:"
docker compose build --no-cache web
echo ""

echo "🚀 Web Container'ı Başlatıyoruz:"
docker compose up -d web
echo ""

echo "⏳ Container'ın Başlamasını Bekliyoruz..."
sleep 15
echo ""

echo "🧪 API Testi:"
echo "1. API Debug Endpoint:"
curl -s http://yodea.hexense.ai/api/debug | head -3
echo ""

echo "2. API Trainings:"
curl -s http://yodea.hexense.ai/api/trainings | head -3
echo ""

echo "3. API Users:"
curl -s http://yodea.hexense.ai/api/users | head -3
echo ""

echo "✅ API URL cache düzeltmesi tamamlandı!"
