yeni login olmuştum.lo#!/usr/bin/env python3
"""
Script to create default styles in the system company
"""

from app.db import get_session
from app.models import Company, Style, User
from sqlmodel import select

def create_default_styles():
    session = next(get_session())
    
    # Get system company
    system_company = session.exec(select(Company).where(Company.is_system == True)).first()
    print(f'System company: {system_company.name if system_company else "Not found"}')
    
    # Get superadmin user
    superadmin = session.exec(select(User).where(User.role == "SuperAdmin")).first()
    print(f'SuperAdmin: {superadmin.username if superadmin else "Not found"}')
    
    if system_company and superadmin:
        # Create default styles
        default_styles = [
            {
                'name': 'Modern Blue',
                'description': 'Modern blue theme for professional presentations',
                'style_json': '{"primaryColor": "#2563eb", "secondaryColor": "#1e40af", "backgroundColor": "#f8fafc", "textColor": "#1e293b"}'
            },
            {
                'name': 'Corporate Green',
                'description': 'Corporate green theme for business presentations',
                'style_json': '{"primaryColor": "#059669", "secondaryColor": "#047857", "backgroundColor": "#f0fdf4", "textColor": "#064e3b"}'
            },
            {
                'name': 'Elegant Purple',
                'description': 'Elegant purple theme for creative presentations',
                'style_json': '{"primaryColor": "#7c3aed", "secondaryColor": "#5b21b6", "backgroundColor": "#faf5ff", "textColor": "#581c87"}'
            }
        ]
        
        for style_data in default_styles:
            # Check if style already exists
            existing = session.exec(select(Style).where(
                Style.name == style_data['name'],
                Style.company_id == system_company.id
            )).first()
            
            if not existing:
                new_style = Style(
                    name=style_data['name'],
                    description=style_data['description'],
                    style_json=style_data['style_json'],
                    company_id=system_company.id,
                    created_by=superadmin.id,
                    is_default=True
                )
                session.add(new_style)
                print(f'Created style: {style_data["name"]}')
            else:
                print(f'Style already exists: {style_data["name"]}')
        
        session.commit()
        print('Default styles created successfully!')
    else:
        print('System company or SuperAdmin not found!')

if __name__ == "__main__":
    create_default_styles()
