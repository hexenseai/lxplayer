#!/bin/bash

echo "🔧 API URL Düzeltmesi..."
echo ""

echo "📋 Mevcut .env Dosyası:"
cat .env | grep NEXT_PUBLIC_API_URL
echo ""

echo "🔧 API URL'yi Düzeltiyoruz..."
# Mevcut API URL'yi al ve /api ekle
CURRENT_API_URL=$(grep NEXT_PUBLIC_API_URL .env | cut -d'=' -f2)
echo "Mevcut API URL: $CURRENT_API_URL"

# Eğer zaten /api ile bitmiyorsa ekle
if [[ "$CURRENT_API_URL" != */api ]]; then
    NEW_API_URL="${CURRENT_API_URL}/api"
    echo "Yeni API URL: $NEW_API_URL"
    
    # .env dosyasını güncelle
    sed -i "s|NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=$NEW_API_URL|" .env
    echo "✅ .env dosyası güncellendi"
else
    echo "✅ API URL zaten doğru: $CURRENT_API_URL"
fi

echo ""
echo "📋 Güncellenmiş .env Dosyası:"
cat .env | grep NEXT_PUBLIC_API_URL
echo ""

echo "🔄 Web Container'ı Yeniden Başlatıyoruz..."
docker compose restart web
echo ""

echo "⏳ Container'ın Başlamasını Bekliyoruz..."
sleep 10
echo ""

echo "🧪 API Testi:"
curl -s http://yodea.hexense.ai/api/trainings | head -5
echo ""

echo "✅ API URL düzeltmesi tamamlandı!"
