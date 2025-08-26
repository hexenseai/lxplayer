#!/bin/bash

# LXPlayer Check API Logs Script
# Bu script API log'larını kontrol eder

set -e

echo "🔍 LXPlayer Check API Logs başlatılıyor..."

USERNAME=${SUDO_USER:-$USER}
PROJECT_DIR="/home/$USERNAME/lxplayer"

echo "👤 Kullanıcı: $USERNAME"
echo "📁 Proje Dizini: $PROJECT_DIR"

cd "$PROJECT_DIR"

# 1. API container log'ları
echo "📊 API container log'ları (son 50 satır):"
docker compose logs --tail=50 api

# 2. API endpoint testleri
echo ""
echo "🧪 API endpoint testleri:"

echo "Testing localhost:8000/docs..."
curl -s -w "HTTP Status: %{http_code}\n" http://localhost:8000/docs | head -5

echo ""
echo "Testing localhost:8000/openapi.json..."
curl -s -w "HTTP Status: %{http_code}\n" http://localhost:8000/openapi.json | head -5

echo ""
echo "Testing yodea.hexense.ai/api/docs..."
curl -s -w "HTTP Status: %{http_code}\n" http://yodea.hexense.ai/api/docs | head -5

echo ""
echo "✅ Check API Logs tamamlandı!"
echo ""
echo "📝 Not: API docs sorunu login işlemini etkilemez."
echo "🌐 Login test için: http://yodea.hexense.ai/login"
