#!/bin/bash

# LXPlayer Fix Hardcoded URLs Script
# Bu script tüm hardcoded localhost:8000 referanslarını düzeltir

set -e

echo "🔧 LXPlayer Fix Hardcoded URLs başlatılıyor..."

# 1. lib/api.ts dosyasını düzelt
echo "📄 lib/api.ts düzeltiliyor..."
sed -i 's/process\.env\.NEXT_PUBLIC_API_URL \?\? '\''http:\/\/localhost:8000'\''/process.env.NEXT_PUBLIC_API_URL ?? '\'''\''/g' apps/web/lib/api.ts

# 2. lib/chatSocket.ts dosyasını düzelt
echo "📄 lib/chatSocket.ts düzeltiliyor..."
sed -i 's/process\.env\.NEXT_PUBLIC_API_URL \|\| '\''http:\/\/localhost:8000'\''/process.env.NEXT_PUBLIC_API_URL || '\'''\''/g' apps/web/lib/chatSocket.ts

# 3. components/InteractivePlayer.tsx dosyasını düzelt
echo "📄 components/InteractivePlayer.tsx düzeltiliyor..."
sed -i 's/process\.env\.NEXT_PUBLIC_API_URL \|\| '\''http:\/\/localhost:8000'\''/process.env.NEXT_PUBLIC_API_URL || '\'''\''/g' apps/web/components/InteractivePlayer.tsx

# 4. components/player/Overlay.tsx dosyasını düzelt
echo "📄 components/player/Overlay.tsx düzeltiliyor..."
sed -i 's/process\.env\.NEXT_PUBLIC_API_URL \|\| '\''http:\/\/localhost:8000'\''/process.env.NEXT_PUBLIC_API_URL || '\'''\''/g' apps/web/components/player/Overlay.tsx

# 5. app/debug/page.tsx dosyasını düzelt
echo "📄 app/debug/page.tsx düzeltiliyor..."
sed -i 's/process\.env\.NEXT_PUBLIC_API_URL \|\| '\''http:\/\/localhost:8000'\''/process.env.NEXT_PUBLIC_API_URL || '\'''\''/g' apps/web/app/debug/page.tsx

# 6. app/(auth)/login/page.tsx dosyasını düzelt
echo "📄 app/(auth)/login/page.tsx düzeltiliyor..."
sed -i 's/process\.env\.NEXT_PUBLIC_API_URL \|\| '\''http:\/\/localhost:8000'\''/process.env.NEXT_PUBLIC_API_URL || '\'''\''/g' apps/web/app/\(auth\)/login/page.tsx

# 7. app/profile/page.tsx dosyasını düzelt
echo "📄 app/profile/page.tsx düzeltiliyor..."
sed -i 's/process\.env\.NEXT_PUBLIC_API_URL \|\| '\''http:\/\/localhost:8000'\''/process.env.NEXT_PUBLIC_API_URL || '\'''\''/g' apps/web/app/profile/page.tsx

# 8. components/admin/HtmlPreviewModal.tsx dosyasını düzelt
echo "📄 components/admin/HtmlPreviewModal.tsx düzeltiliyor..."
sed -i 's/process\.env\.NEXT_PUBLIC_API_URL \|\| '\''http:\/\/localhost:8000'\''/process.env.NEXT_PUBLIC_API_URL || '\'''\''/g' apps/web/components/admin/HtmlPreviewModal.tsx

# 9. components/admin/forms/AssetForm.tsx dosyasını düzelt
echo "📄 components/admin/forms/AssetForm.tsx düzeltiliyor..."
sed -i 's/process\.env\.NEXT_PUBLIC_API_URL \|\| '\''http:\/\/localhost:8000'\''/process.env.NEXT_PUBLIC_API_URL || '\'''\''/g' apps/web/components/admin/forms/AssetForm.tsx

# 10. components/admin/forms/CKEditor.tsx dosyasını düzelt
echo "📄 components/admin/forms/CKEditor.tsx düzeltiliyor..."
sed -i 's/process\.env\.NEXT_PUBLIC_API_URL \|\| '\''http:\/\/localhost:8000'\''/process.env.NEXT_PUBLIC_API_URL || '\'''\''/g' apps/web/components/admin/forms/CKEditor.tsx

# 11. components/admin/forms/UserForm.tsx dosyasını düzelt
echo "📄 components/admin/forms/UserForm.tsx düzeltiliyor..."
sed -i 's/process\.env\.NEXT_PUBLIC_API_URL \|\| '\''http:\/\/localhost:8000'\''/process.env.NEXT_PUBLIC_API_URL || '\'''\''/g' apps/web/components/admin/forms/UserForm.tsx

# 12. components/admin/forms/TrainingSectionForm.tsx dosyasını düzelt
echo "📄 components/admin/forms/TrainingSectionForm.tsx düzeltiliyor..."
sed -i 's/process\.env\.NEXT_PUBLIC_API_URL \|\| '\''http:\/\/localhost:8000'\''/process.env.NEXT_PUBLIC_API_URL || '\'''\''/g' apps/web/components/admin/forms/TrainingSectionForm.tsx

# 13. components/admin/forms/TrainingForm.tsx dosyasını düzelt
echo "📄 components/admin/forms/TrainingForm.tsx düzeltiliyor..."
sed -i 's/process\.env\.NEXT_PUBLIC_API_URL \|\| '\''http:\/\/localhost:8000'\''/process.env.NEXT_PUBLIC_API_URL || '\'''\''/g' apps/web/components/admin/forms/TrainingForm.tsx

# 14. components/admin/forms/TinyMCEEditor.tsx dosyasını düzelt
echo "📄 components/admin/forms/TinyMCEEditor.tsx düzeltiliyor..."
sed -i 's/process\.env\.NEXT_PUBLIC_API_URL \|\| '\''http:\/\/localhost:8000'\''/process.env.NEXT_PUBLIC_API_URL || '\'''\''/g' apps/web/components/admin/forms/TinyMCEEditor.tsx

# 15. components/admin/forms/OrganizationForm.tsx dosyasını düzelt
echo "📄 components/admin/forms/OrganizationForm.tsx düzeltiliyor..."
sed -i 's/process\.env\.NEXT_PUBLIC_API_URL \|\| '\''http:\/\/localhost:8000'\''/process.env.NEXT_PUBLIC_API_URL || '\'''\''/g' apps/web/components/admin/forms/OrganizationForm.tsx

echo ""
echo "✅ Fix Hardcoded URLs tamamlandı!"
echo ""
echo "📝 Değişiklikler:"
echo "- Tüm hardcoded 'http://localhost:8000' referansları kaldırıldı"
echo "- Sadece environment variable'lar kullanılıyor"
echo "- Hata ayıklama artık daha kolay olacak"
echo ""
echo "🔄 Şimdi değişiklikleri commit edip sunucuya gönderin!"
