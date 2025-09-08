#!/usr/bin/env python3

from app.db import get_session
from sqlalchemy import text

def add_new_constraint():
    session = next(get_session())
    try:
        # Add the new foreign key constraint
        session.execute(text('ALTER TABLE "user" ADD CONSTRAINT user_company_id_fkey FOREIGN KEY (company_id) REFERENCES company(id)'))
        session.commit()
        print("Added new foreign key constraint successfully")
        
    except Exception as e:
        session.rollback()
        print(f"Error: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    add_new_constraint()
