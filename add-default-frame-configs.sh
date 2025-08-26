#!/bin/bash

echo "🔧 Default Frame Config Verisi Ekliyoruz..."
echo ""

echo "🧪 Mevcut Global Frame Configs:"
curl -s http://yodea.hexense.ai/api/frame-configs/global
echo ""
echo ""

echo "🔧 Default Global Frame Config Oluşturuyoruz:"
curl -X POST http://yodea.hexense.ai/api/frame-configs/global \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Default Frame Config",
    "description": "Varsayılan frame konfigürasyonu",
    "object_position_x": 50,
    "object_position_y": 50,
    "scale": 1.0,
    "transform_origin_x": 50,
    "transform_origin_y": 50,
    "transition_duration": 0.3,
    "transition_easing": "ease-in-out",
    "is_active": true
  }'
echo ""
echo ""

echo "🧪 Oluşturulan Global Frame Configs:"
curl -s http://yodea.hexense.ai/api/frame-configs/global
echo ""
echo ""

echo "✅ Default frame config verisi eklendi!"
