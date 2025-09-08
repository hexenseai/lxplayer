#!/usr/bin/env python3

from app.db import get_session
from sqlmodel import text

def check_data():
    session = next(get_session())
    try:
        # Check companies
        companies = session.exec(text('SELECT id, name FROM company')).all()
        print('Companies:', companies)
        
        # Check user company_ids
        users = session.exec(text('SELECT DISTINCT company_id FROM "user" WHERE company_id IS NOT NULL')).all()
        print('User company_ids:', users)
        
        # Check if there are any mismatches
        company_ids = [c[0] for c in companies]
        user_company_ids = [u[0] for u in users]
        
        print('Company IDs:', company_ids)
        print('User company IDs:', user_company_ids)
        
        missing_ids = set(user_company_ids) - set(company_ids)
        if missing_ids:
            print('Missing company IDs:', missing_ids)
        else:
            print('All user company IDs exist in company table')
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    check_data()