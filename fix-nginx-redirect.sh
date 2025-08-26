#!/bin/bash

echo "🔧 Nginx Redirect Sorununu Düzeltiyoruz..."
echo ""

echo "🔍 Nginx Config Dosyalarını Buluyoruz:"
sudo find /etc/nginx -name "*.conf" -type f
echo ""

echo "🔍 Nginx Sites Kontrolü:"
sudo ls -la /etc/nginx/sites-available/ 2>/dev/null || echo "❌ sites-available dizini yok"
sudo ls -la /etc/nginx/conf.d/ 2>/dev/null || echo "❌ conf.d dizini yok"
echo ""

echo "🔍 Nginx Ana Config:"
sudo cat /etc/nginx/nginx.conf | grep -A 10 -B 5 "include"
echo ""

echo "🔍 Nginx Config Dosyalarını Kontrol Ediyoruz:"
for config in $(sudo find /etc/nginx -name "*.conf" -type f); do
  echo "📄 $config:"
  sudo grep -n "location" "$config" | head -5
  echo ""
done

echo "🧪 Redirect Testi:"
echo "1. Ana sayfa:"
curl -I http://yodea.hexense.ai/ 2>&1 | grep -E "(HTTP|Location)"
echo ""

echo "2. Studio sayfası:"
curl -I http://yodea.hexense.ai/studio 2>&1 | grep -E "(HTTP|Location)"
echo ""

echo "🔍 Nginx Error Logları:"
sudo tail -10 /var/log/nginx/error.log 2>/dev/null || echo "❌ Error log bulunamadı"
echo ""

echo "🔍 Nginx Access Logları:"
sudo tail -10 /var/log/nginx/access.log 2>/dev/null || echo "❌ Access log bulunamadı"
echo ""

echo "✅ Kontrol tamamlandı!"
