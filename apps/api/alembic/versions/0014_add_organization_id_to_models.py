"""add company_id to models

Revision ID: 0014
Revises: aa06ab9f0395
Create Date: 2024-01-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0014'
down_revision = 'aa06ab9f0395'
branch_labels = None
depends_on = None


def upgrade() -> None:
    connection = op.get_bind()
    
    # Add organization_id columns to tables if they don't exist
    tables_to_add_org_id = ['user', 'asset', 'flow', 'training', 'style', 'frameconfig', 'globalframeconfig']
    
    for table_name in tables_to_add_org_id:
        # Check if organization_id column exists
        result = connection.execute(sa.text(f"""
            SELECT EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = '{table_name}' 
                AND column_name = 'organization_id'
            );
        """)).scalar()
        
        if not result:
            op.add_column(table_name, sa.Column('organization_id', sa.String(), nullable=True))


def downgrade() -> None:
    connection = op.get_bind()
    
    # Remove organization_id columns if they exist
    tables_to_remove_org_id = ['user', 'asset', 'flow', 'training', 'style', 'frameconfig', 'globalframeconfig']
    
    for table_name in tables_to_remove_org_id:
        # Check if organization_id column exists
        result = connection.execute(sa.text(f"""
            SELECT EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = '{table_name}' 
                AND column_name = 'organization_id'
            );
        """)).scalar()
        
        if result:
            op.drop_column(table_name, 'organization_id')
