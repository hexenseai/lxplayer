#!/bin/bash

echo "🧪 Frame Configs Router Testi..."
echo ""

echo "1. Frame Configs Router Import Testi:"
docker compose exec api python -c "
try:
    from app.routers import frame_configs
    print('✅ Frame configs router import başarılı')
    print(f'Router prefix: {frame_configs.router.prefix}')
    print(f'Router tags: {frame_configs.router.tags}')
except Exception as e:
    print(f'❌ Frame configs router import hatası: {e}')
"
echo ""

echo "2. Frame Configs Router Routes Testi:"
docker compose exec api python -c "
from app.routers import frame_configs
print('Frame configs router routes:')
for route in frame_configs.router.routes:
    if hasattr(route, 'path'):
        print(f'- {route.path} ({route.methods})')
"
echo ""

echo "3. Frame Configs Router Main App'e Dahil Edilme Testi:"
docker compose exec api python -c "
from app.main import app
print('Frame configs ile ilgili routes:')
for route in app.routes:
    if hasattr(route, 'path') and 'frame' in route.path.lower():
        print(f'- {route.path} ({route.methods})')
"
echo ""

echo "✅ Frame configs router testi tamamlandı!"
