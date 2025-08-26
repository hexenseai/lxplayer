#!/bin/bash

echo "🔄 Git Pull Olmadan Güncelleme Başlıyor..."
echo ""

echo "📊 Mevcut Durum:"
git status
echo ""

echo "🔄 Stash Yapıyor..."
git stash push -m "Temporary stash before force update"
echo ""

echo "🔄 Hard Reset Yapıyor..."
git fetch origin
git reset --hard origin/main
echo ""

echo "📊 Son Durum:"
git status
echo ""

echo "✅ Force update tamamlandı!"
echo ""
echo "🎯 Sonraki Adımlar:"
echo "1. API container'ını yeniden build edin:"
echo "   docker compose build --no-cache api"
echo "2. API'yi başlatın:"
echo "   docker compose up -d api"
echo "3. Login testi yapın:"
echo "   curl -X POST http://yodea.hexense.ai/auth/login -H 'Content-Type: application/json' -d '{\"email\":\"admin@lxplayer.com\",\"password\":\"admin123\"}'"
