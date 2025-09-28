#!/usr/bin/env python3
"""
Script to clean up orphaned CompanyTraining records in the database.
This script removes CompanyTraining records that have:
1. null company_id values
2. training_id references that no longer exist
3. company_id references that no longer exist
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add the API app to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'apps', 'api'))

def cleanup_orphaned_company_trainings():
    """Clean up orphaned CompanyTraining records"""
    
    # Database connection
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/lxplayer")
    
    try:
        engine = create_engine(DATABASE_URL)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        session = SessionLocal()
        
        print("🔍 Starting cleanup of orphaned CompanyTraining records...")
        
        # 1. Find and delete records with null company_id
        result = session.execute(text("""
            DELETE FROM companytraining 
            WHERE company_id IS NULL
        """))
        null_company_count = result.rowcount
        print(f"🗑️  Deleted {null_company_count} records with null company_id")
        
        # 2. Find and delete records with non-existent training_id
        result = session.execute(text("""
            DELETE FROM companytraining 
            WHERE training_id NOT IN (SELECT id FROM training)
        """))
        orphaned_training_count = result.rowcount
        print(f"🗑️  Deleted {orphaned_training_count} records with non-existent training_id")
        
        # 3. Find and delete records with non-existent company_id
        result = session.execute(text("""
            DELETE FROM companytraining 
            WHERE company_id NOT IN (SELECT id FROM company)
        """))
        orphaned_company_count = result.rowcount
        print(f"🗑️  Deleted {orphaned_company_count} records with non-existent company_id")
        
        # 4. Show remaining records for verification
        result = session.execute(text("SELECT COUNT(*) FROM companytraining"))
        remaining_count = result.scalar()
        print(f"📊 Remaining CompanyTraining records: {remaining_count}")
        
        # 5. Show sample of remaining records
        if remaining_count > 0:
            result = session.execute(text("""
                SELECT ct.id, ct.company_id, ct.training_id, ct.access_code,
                       c.name as company_name, t.title as training_title
                FROM companytraining ct
                LEFT JOIN company c ON ct.company_id = c.id
                LEFT JOIN training t ON ct.training_id = t.id
                LIMIT 5
            """))
            records = result.fetchall()
            print("📋 Sample of remaining records:")
            for record in records:
                print(f"  - ID: {record[0]}, Company: {record[4] or 'NULL'}, Training: {record[5] or 'NULL'}")
        
        session.commit()
        print("✅ Cleanup completed successfully!")
        
    except Exception as e:
        print(f"❌ Error during cleanup: {str(e)}")
        if 'session' in locals():
            session.rollback()
        return False
    
    finally:
        if 'session' in locals():
            session.close()
    
    return True

if __name__ == "__main__":
    success = cleanup_orphaned_company_trainings()
    sys.exit(0 if success else 1)
