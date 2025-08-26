#!/bin/bash

echo "🔍 Frame Configs Detaylı Debug..."
echo ""

echo "🧪 Tüm Frame Configs Endpoint'leri Testi:"
echo ""

echo "1. Global Frame Configs (GET):"
curl -v http://yodea.hexense.ai/api/frame-configs/global 2>&1 | head -20
echo ""
echo ""

echo "2. Frame Configs Ana Endpoint (GET):"
curl -v http://yodea.hexense.ai/api/frame-configs 2>&1 | head -20
echo ""
echo ""

echo "3. Oluşturulan Config ID ile Test:"
curl -v http://yodea.hexense.ai/api/frame-configs/global/2aa3d6e3-8a35-4756-a0cc-579547f84ef3 2>&1 | head -20
echo ""
echo ""

echo "4. API Router Listesi (Frame Configs):"
docker compose exec api python -c "
from app.main import app
print('Frame configs ile ilgili routerlar:')
for route in app.routes:
    if hasattr(route, 'path') and 'frame' in route.path.lower():
        print(f'- {route.path} ({route.methods})')
        if hasattr(route, 'endpoint'):
            print(f'  Endpoint: {route.endpoint}')
"
echo ""

echo "5. Database Kontrolü:"
docker compose exec api python -c "
from app.db import get_session
from app.models import GlobalFrameConfig
with next(get_session()) as session:
    configs = session.query(GlobalFrameConfig).all()
    print(f'Toplam global frame config sayısı: {len(configs)}')
    for config in configs:
        print(f'- ID: {config.id}, Name: {config.name}, Active: {config.is_active}')
"
echo ""

echo "✅ Frame configs debug tamamlandı!"
