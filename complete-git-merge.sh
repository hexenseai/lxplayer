#!/bin/bash

echo "🔧 Git Merge Tamamlama Başlıyor..."
echo ""

echo "📊 Mevcut Durum:"
git status
echo ""

echo "🗑️ Silinen Dosyaları Kaldırıyor..."
git rm debug-login-error.sh
git rm test-api-endpoints.sh
git rm test-correct-login.sh
echo ""

echo "📋 Commit Edilecek Dosyalar:"
git status --porcelain
echo ""

echo "🔄 Commit Yapıyor..."
git commit -m "Complete merge: remove debug scripts and fix API import error"
echo ""

echo "📊 Son Durum:"
git status
echo ""

echo "✅ Git merge tamamlandı!"
echo ""
echo "🎯 Sonraki Adımlar:"
echo "1. API container'ını yeniden build edin:"
echo "   docker compose build --no-cache api"
echo "2. API'yi başlatın:"
echo "   docker compose up -d api"
echo "3. Login testi yapın:"
echo "   curl -X POST http://yodea.hexense.ai/auth/login -H 'Content-Type: application/json' -d '{\"email\":\"admin@lxplayer.com\",\"password\":\"admin123\"}'"
