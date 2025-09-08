#!/usr/bin/env python3
"""
Script to create a super admin user
Usage: python app/scripts/create_super_admin.py
"""

import sys
import os
from pathlib import Path

# Add the current directory to the path so we can import from app
current_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(current_dir))

from sqlmodel import Session, select
from app.db import get_session
from app.models import User, Company
from app.auth import hash_password


def create_super_admin():
    """Create a super admin user if it doesn't exist"""
    
    # Get database session
    session = next(get_session())
    
    try:
        # Check if super admin already exists
        existing_super_admin = session.exec(
            select(User).where(User.role == "SuperAdmin")
        ).first()
        
        if existing_super_admin:
            print(f"Super admin already exists: {existing_super_admin.email}")
            return existing_super_admin
        
        # Create system company if it doesn't exist
        system_company = session.exec(
            select(Company).where(Company.is_system == True)
        ).first()
        
        if not system_company:
            system_company = Company(
                name="LXPlayer System",
                business_topic="System company for SuperAdmins and default content",
                description="This is the system company that contains default styles, frame configs, and other content that can be imported by other companies.",
                is_system=True
            )
            session.add(system_company)
            session.commit()
            session.refresh(system_company)
            print(f"Created system company: {system_company.name}")
        
        # Create super admin user
        super_admin = User(
            email="superadmin@example.com",
            username="superadmin",
            full_name="Super Administrator",
            company_id=system_company.id,
            role="SuperAdmin",
            department="IT",
            password=hash_password("superadmin123")  # Change this password in production
        )
        
        session.add(super_admin)
        session.commit()
        session.refresh(super_admin)
        
        print(f"Super admin created successfully:")
        print(f"  Email: {super_admin.email}")
        print(f"  Username: {super_admin.username}")
        print(f"  Role: {super_admin.role}")
        print(f"  Company: {system_company.name} (System Company)")
        print(f"  Password: superadmin123 (change this in production!)")
        
        return super_admin
        
    except Exception as e:
        print(f"Error creating super admin: {e}")
        session.rollback()
        raise
    finally:
        session.close()


if __name__ == "__main__":
    print("Creating super admin user...")
    create_super_admin()
    print("Done!")
