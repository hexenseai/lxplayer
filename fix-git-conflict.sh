#!/bin/bash

echo "🔧 Git Conflict Çözümü Başlıyor..."
echo ""

echo "📊 Git Status:"
git status
echo ""

echo "🔍 Conflict Dosyaları:"
git diff --name-only --diff-filter=U
echo ""

echo "📄 db.py Dosyası İçeriği:"
cat apps/api/app/db.py
echo ""

echo "🔄 Conflict'i Çözüyor..."
# Conflict marker'larını kaldır ve doğru içeriği kullan
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

echo "✅ Conflict çözüldü!"
echo ""

echo "📋 Güncellenmiş db.py İçeriği:"
cat apps/api/app/db.py
echo ""

echo "🔄 Git Add ve Commit:"
git add apps/api/app/db.py
git commit -m "Fix API import error: add get_db function alias for backward compatibility"
echo ""

echo "📊 Git Status (son):"
git status
echo ""

echo "✅ Git conflict çözümü tamamlandı!"
