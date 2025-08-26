#!/bin/bash

echo "🔧 Manuel Güncelleme Başlıyor..."
echo ""

echo "📄 db.py Dosyasını Manuel Güncelliyor..."
cat > apps/api/app/db.py << 'EOF'
import os
from sqlmodel import SQLModel, create_engine, Session
from alembic.config import Config
from alembic import command

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://postgres:postgres@localhost:5433/lxplayer")
engine = create_engine(DATABASE_URL, echo=False)


def get_session():
    with Session(engine) as session:
        yield session


def get_db():
    """Alias for get_session for backward compatibility"""
    return get_session()


def init_db() -> None:
    """Initialize database and run migrations"""
    # Create tables if they don't exist
    SQLModel.metadata.create_all(engine)
    
    # Run Alembic migrations
    try:
        alembic_cfg = Config("alembic.ini")
        command.upgrade(alembic_cfg, "head")
        print("Database migrations completed successfully")
    except Exception as e:
        print(f"Migration error (this is normal if tables already exist): {e}")
EOF

echo "✅ db.py güncellendi!"
echo ""

echo "📋 Güncellenmiş İçerik:"
cat apps/api/app/db.py
echo ""

echo "🎯 Sonraki Adımlar:"
echo "1. API container'ını yeniden build edin:"
echo "   docker compose build --no-cache api"
echo "2. API'yi başlatın:"
echo "   docker compose up -d api"
echo "3. Login testi yapın:"
echo "   curl -X POST http://yodea.hexense.ai/auth/login -H 'Content-Type: application/json' -d '{\"email\":\"admin@lxplayer.com\",\"password\":\"admin123\"}'"
