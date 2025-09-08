#!/usr/bin/env python3
"""
Script to create default frame configs in the system company
"""

from app.db import get_session
from app.models import Company, GlobalFrameConfig, User
from sqlmodel import select

def create_default_frame_configs():
    session = next(get_session())
    
    # Get system company
    system_company = session.exec(select(Company).where(Company.is_system == True)).first()
    print(f'System company: {system_company.name if system_company else "Not found"}')
    
    # Get superadmin user
    superadmin = session.exec(select(User).where(User.role == "SuperAdmin")).first()
    print(f'SuperAdmin: {superadmin.username if superadmin else "Not found"}')
    
    if system_company and superadmin:
        # Create default frame configs
        default_configs = [
            {
                'name': 'Center Default',
                'description': 'Default centered frame configuration',
                'object_position_x': 50.0,
                'object_position_y': 50.0,
                'scale': 1.0,
                'transform_origin_x': 50.0,
                'transform_origin_y': 50.0,
                'transition_duration': 0.3,
                'transition_easing': 'ease-in-out'
            },
            {
                'name': 'Top Left',
                'description': 'Top left positioned frame configuration',
                'object_position_x': 20.0,
                'object_position_y': 20.0,
                'scale': 0.8,
                'transform_origin_x': 0.0,
                'transform_origin_y': 0.0,
                'transition_duration': 0.2,
                'transition_easing': 'ease-out'
            },
            {
                'name': 'Bottom Right',
                'description': 'Bottom right positioned frame configuration',
                'object_position_x': 80.0,
                'object_position_y': 80.0,
                'scale': 0.9,
                'transform_origin_x': 100.0,
                'transform_origin_y': 100.0,
                'transition_duration': 0.4,
                'transition_easing': 'ease-in'
            }
        ]
        
        for config_data in default_configs:
            # Check if config already exists
            existing = session.exec(select(GlobalFrameConfig).where(
                GlobalFrameConfig.name == config_data['name'],
                GlobalFrameConfig.company_id == system_company.id
            )).first()
            
            if not existing:
                new_config = GlobalFrameConfig(
                    name=config_data['name'],
                    description=config_data['description'],
                    object_position_x=config_data['object_position_x'],
                    object_position_y=config_data['object_position_y'],
                    scale=config_data['scale'],
                    transform_origin_x=config_data['transform_origin_x'],
                    transform_origin_y=config_data['transform_origin_y'],
                    transition_duration=config_data['transition_duration'],
                    transition_easing=config_data['transition_easing'],
                    company_id=system_company.id,
                    created_by=superadmin.id,
                    is_active=True
                )
                session.add(new_config)
                print(f'Created frame config: {config_data["name"]}')
            else:
                print(f'Frame config already exists: {config_data["name"]}')
        
        session.commit()
        print('Default frame configs created successfully!')
    else:
        print('System company or SuperAdmin not found!')

if __name__ == "__main__":
    create_default_frame_configs()
