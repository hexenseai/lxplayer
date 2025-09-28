#!/bin/bash

# Docker Compose ile cleanup script'ini çalıştır
echo "🔍 Running cleanup script in Docker container..."

# API servisinin environment'ını kullanarak geçici container oluştur
docker-compose run --rm api python cleanup_orphaned_company_trainings.py

echo "✅ Cleanup completed!"
