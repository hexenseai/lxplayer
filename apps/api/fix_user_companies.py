#!/usr/bin/env python3

from app.db import get_session
from sqlmodel import text

def fix_user_companies():
    session = next(get_session())
    try:
        # Get the first available company ID
        company = session.exec(text('SELECT id FROM company LIMIT 1')).first()
        if not company:
            print("No companies found!")
            return
            
        company_id = company[0]
        print(f"Using company ID: {company_id}")
        
        # Update all users with invalid company_id to use the first available company
        from sqlalchemy import text as sql_text
        result = session.execute(sql_text('UPDATE "user" SET company_id = :company_id WHERE company_id NOT IN (SELECT id FROM company)'), {"company_id": company_id})
        session.commit()
        
        print(f"Updated users with invalid company_id to use company: {company_id}")
        
        # Verify the fix
        users = session.exec(text('SELECT DISTINCT company_id FROM "user" WHERE company_id IS NOT NULL')).all()
        print('User company_ids after fix:', users)
        
    except Exception as e:
        session.rollback()
        print(f"Error: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    fix_user_companies()
