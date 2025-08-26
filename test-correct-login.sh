#!/bin/bash

echo "🔐 Doğru Login Bilgileri ile Test Başlıyor..."
echo ""

echo "🧪 Login Testi (admin@lxplayer.com):"
curl -s -X POST http://yodea.hexense.ai/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lxplayer.com","password":"admin123"}' \
  -w "Status: %{http_code}\n" | head -1
echo ""

echo "🔍 Login Response Detayı:"
curl -s -X POST http://yodea.hexense.ai/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lxplayer.com","password":"admin123"}'
echo ""
echo ""

echo "🌐 Web Uygulaması Test:"
echo "Şimdi http://yodea.hexense.ai/login adresine gidin ve şu bilgilerle giriş yapın:"
echo "Email: admin@lxplayer.com"
echo "Password: admin123"
echo ""

echo "🔧 Browser Console Kontrolü:"
echo "1. Browser'da F12 tuşuna basın"
echo "2. Console sekmesine gidin"
echo "3. Login yaparken hata mesajı var mı kontrol edin"
echo ""

echo "✅ Test tamamlandı!"
