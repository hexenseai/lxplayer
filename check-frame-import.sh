#!/bin/bash

echo "🔍 Frame Configs Import Hatası Kontrolü..."
echo ""

echo "1. Frame Configs Router Import Testi:"
docker compose exec api python -c "
try:
    from app.routers import frame_configs
    print('✅ Frame configs router import başarılı')
except Exception as e:
    print(f'❌ Frame configs router import hatası: {e}')
    import traceback
    traceback.print_exc()
"
echo ""

echo "2. Frame Configs Router Routes Testi:"
docker compose exec api python -c "
try:
    from app.routers import frame_configs
    print('Frame configs router routes:')
    for route in frame_configs.router.routes:
        if hasattr(route, 'path'):
            print(f'- {route.path} ({route.methods})')
except Exception as e:
    print(f'❌ Frame configs router routes hatası: {e}')
"
echo ""

echo "3. Main App Import Testi:"
docker compose exec api python -c "
try:
    from app.main import app
    print('✅ Main app import başarılı')
    print(f'Toplam route sayısı: {len(app.routes)}')
    
    frame_routes = [r for r in app.routes if hasattr(r, 'path') and 'frame' in r.path.lower()]
    print(f'Frame configs route sayısı: {len(frame_routes)}')
    
    for route in frame_routes:
        print(f'- {route.path} ({route.methods})')
        
except Exception as e:
    print(f'❌ Main app import hatası: {e}')
    import traceback
    traceback.print_exc()
"
echo ""

echo "4. API Startup Logs Detaylı Kontrolü:"
docker compose logs --tail=50 api | grep -E "(ERROR|Exception|Traceback|frame|config|import)"
echo ""

echo "✅ Frame configs import kontrolü tamamlandı!"
