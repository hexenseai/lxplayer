#!/usr/bin/env python3
"""
Script to run the new migration
Usage: python run_migration.py
"""

import subprocess
import sys
import os

def run_migration():
    """Run the alembic migration"""
    try:
        print("Running alembic migration...")
        
        # Change to the api directory
        api_dir = os.path.dirname(os.path.abspath(__file__))
        os.chdir(api_dir)
        
        # Run the migration
        result = subprocess.run(
            ["alembic", "upgrade", "head"],
            capture_output=True,
            text=True,
            cwd=api_dir
        )
        
        if result.returncode == 0:
            print("Migration completed successfully!")
            print("Output:", result.stdout)
        else:
            print("Migration failed!")
            print("Error:", result.stderr)
            return False
            
    except Exception as e:
        print(f"Error running migration: {e}")
        return False
    
    return True

if __name__ == "__main__":
    success = run_migration()
    if not success:
        sys.exit(1)
