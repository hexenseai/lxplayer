import os
from sqlmodel import SQLModel, create_engine, Session
from alembic.config import Config
from alembic import command

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://postgres:postgres@localhost:5433/lxplayer")
engine = create_engine(DATABASE_URL, echo=False)


def get_session():
    with Session(engine) as session:
        yield session


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
