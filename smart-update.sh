#!/bin/bash

echo "🧠 Akıllı Docker Güncelleme Başlıyor..."

# Son commit'te hangi dosyaların değiştiğini kontrol et
echo "🔍 Değişiklikler analiz ediliyor..."

# Web uygulaması dosyalarında değişiklik var mı?
WEB_CHANGES=$(git diff --name-only HEAD~1 HEAD | grep -E "^(apps/web/|components/|lib/)" | wc -l)

# Environment dosyalarında değişiklik var mı?
ENV_CHANGES=$(git diff --name-only HEAD~1 HEAD | grep -E "\.(env|yml|yaml)$" | wc -l)

echo "📊 Değişiklik analizi:"
echo "   - Web dosyaları: $WEB_CHANGES değişiklik"
echo "   - Environment dosyaları: $ENV_CHANGES değişiklik"

if [ $WEB_CHANGES -gt 0 ]; then
    echo "🔨 Web kod değişiklikleri tespit edildi - Full rebuild gerekiyor..."
    
    # Web container'ını durdur
    docker compose stop web
    
    # Web image'ını kaldır
    docker rmi lxplayer-web:prod 2>/dev/null || true
    
    # Web service'ini build et
    docker compose build --no-cache web
    
    # Web service'ini başlat
    docker compose up -d web
    
    echo "✅ Full rebuild tamamlandı!"
    
elif [ $ENV_CHANGES -gt 0 ]; then
    echo "⚙️ Environment değişiklikleri tespit edildi - Restart yeterli..."
    
    # Sadece restart
    docker compose restart web
    
    echo "✅ Restart tamamlandı!"
    
else
    echo "📝 Sadece dokümantasyon değişiklikleri - Güncelleme gerekmiyor."
    echo "✅ Hiçbir işlem yapılmadı."
fi

echo ""
echo "🌐 Web uygulaması: http://yodea.hexense.ai"
echo "📊 Durum kontrolü için: docker compose ps"
