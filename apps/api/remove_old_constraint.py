#!/usr/bin/env python3

from app.db import get_session
from sqlalchemy import text

def remove_old_constraint():
    session = next(get_session())
    try:
        # Drop the old foreign key constraint
        session.execute(text('ALTER TABLE "user" DROP CONSTRAINT IF EXISTS user_organization_id_fkey'))
        session.commit()
        print("Dropped old foreign key constraint successfully")
        
    except Exception as e:
        session.rollback()
        print(f"Error: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    remove_old_constraint()
