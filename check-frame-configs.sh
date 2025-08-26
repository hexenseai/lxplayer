#!/bin/bash

echo "🔍 Frame Configs Endpoint Kontrolü..."
echo ""

echo "🧪 Frame Configs Endpoint Testi:"
echo "1. Global Frame Configs:"
curl -s http://yodea.hexense.ai/api/frame-configs/global
echo ""
echo ""

echo "2. Frame Configs Ana Endpoint:"
curl -s http://yodea.hexense.ai/api/frame-configs
echo ""
echo ""

echo "3. API Debug Endpoint (Frame Configs Router Kontrolü):"
curl -s http://yodea.hexense.ai/api/debug | grep -i frame
echo ""
echo ""

echo "🔍 API Router Listesi (Frame Configs Kontrolü):"
docker compose exec api python -c "
from app.main import app
for route in app.routes:
    if hasattr(route, 'path') and 'frame' in route.path.lower():
        print(f'- {route.path} ({route.methods})')
"
echo ""

echo "✅ Frame configs kontrolü tamamlandı!"
