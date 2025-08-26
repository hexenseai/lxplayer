#!/bin/bash

echo "🗄️ Frame Configs Database Kontrolü..."
echo ""

echo "1. Global Frame Configs Tablosu Kontrolü:"
docker compose exec api python -c "
from app.db import get_session
from app.models import GlobalFrameConfig
from sqlmodel import select

with next(get_session()) as session:
    try:
        # Tablo var mı kontrol et
        result = session.exec(select(GlobalFrameConfig)).all()
        print(f'✅ GlobalFrameConfig tablosu mevcut')
        print(f'📊 Toplam kayıt sayısı: {len(result)}')
        
        if result:
            print('📋 Mevcut kayıtlar:')
            for config in result:
                print(f'- ID: {config.id}, Name: {config.name}, Active: {config.is_active}')
        else:
            print('⚠️ Hiç kayıt yok!')
            
    except Exception as e:
        print(f'❌ Database hatası: {e}')
"
echo ""

echo "2. Frame Configs Endpoint Direkt Testi:"
docker compose exec api python -c "
from app.routers.frame_configs import list_global_frame_configs
from app.db import get_session

try:
    with next(get_session()) as session:
        result = list_global_frame_configs(session)
        print(f'✅ Endpoint fonksiyonu çalışıyor')
        print(f'📊 Dönen kayıt sayısı: {len(result)}')
        
        if result:
            print('📋 Dönen kayıtlar:')
            for config in result:
                print(f'- ID: {config.id}, Name: {config.name}, Active: {config.is_active}')
        else:
            print('⚠️ Hiç kayıt dönmüyor!')
            
except Exception as e:
    print(f'❌ Endpoint fonksiyonu hatası: {e}')
"
echo ""

echo "3. HTTP Endpoint Testi:"
curl -s http://localhost:8000/frame-configs/global | jq .
echo ""

echo "✅ Frame configs database kontrolü tamamlandı!"
