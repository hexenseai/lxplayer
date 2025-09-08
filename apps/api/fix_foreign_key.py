#!/usr/bin/env python3

from app.db import get_session
from sqlmodel import text

def fix_foreign_key():
    session = next(get_session())
    try:
        # Drop the old foreign key constraint
        session.exec(text('ALTER TABLE "user" DROP CONSTRAINT IF EXISTS user_organization_id_fkey'))
        print("Dropped old foreign key constraint")
        
        # Add the new foreign key constraint
        session.exec(text('ALTER TABLE "user" ADD CONSTRAINT user_company_id_fkey FOREIGN KEY (company_id) REFERENCES company(id)'))
        print("Added new foreign key constraint")
        
        session.commit()
        print("Foreign key constraint updated successfully")
        
    except Exception as e:
        session.rollback()
        print(f"Error: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    fix_foreign_key()
