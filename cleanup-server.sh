#!/bin/bash

echo "🧹 Sunucu Temizliği..."
echo ""

echo "1. Eski Script Dosyalarını Silme:"
rm -f add-default-frame-configs.sh
rm -f check-api-endpoints.sh
rm -f check-api-startup-complete.sh
rm -f check-frame-configs.sh
rm -f check-frame-db.sh
rm -f check-frame-import.sh
rm -f check-jwt-secret.sh
rm -f check-nextjs-routes.sh
rm -f debug-api-startup.sh
rm -f debug-frame-configs.sh
rm -f debug-internal-error.sh
rm -f debug-login-endpoint.sh
rm -f fix-api-startup.sh
rm -f fix-api-url-cache.sh
rm -f fix-migration-issue.sh
rm -f fix-missing-env-vars.sh
rm -f fix-nginx-redirect.sh
rm -f restart-api-test.sh
rm -f test-api-startup.sh
rm -f test-frame-configs-api.sh
rm -f test-frame-get.sh
rm -f test-frame-router.sh
rm -f test-frontend-api.sh
rm -f test-startup-fix.sh
rm -f test-studio-fix.sh
echo "✅ Eski script dosyaları silindi"
echo ""

echo "2. Git Status Kontrolü:"
git status
echo ""

echo "3. Git Pull:"
git pull
echo ""

echo "4. API Yeniden Başlatma:"
docker compose restart api
echo ""

echo "5. API Başlama Bekleme (20 saniye):"
sleep 20
echo ""

echo "6. API Logs Kontrolü:"
docker compose logs --tail=20 api
echo ""

echo "7. Frame Configs Testi:"
curl -s http://yodea.hexense.ai/api/frame-configs/global
echo ""

echo "✅ Sunucu temizliği tamamlandı!"
