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
    # Add organization_id column to user table (will be renamed to company_id in next migration)
    op.add_column('user', sa.Column('organization_id', sa.String(), nullable=True))
    
    # Add organization_id column to assets table
    op.add_column('asset', sa.Column('organization_id', sa.String(), nullable=True))
    
    # Add organization_id column to flow table
    op.add_column('flow', sa.Column('organization_id', sa.String(), nullable=True))
    
    # Add organization_id column to training table
    op.add_column('training', sa.Column('organization_id', sa.String(), nullable=True))
    
    # Add organization_id column to style table
    op.add_column('style', sa.Column('organization_id', sa.String(), nullable=True))
    
    # Add organization_id column to frameconfig table
    op.add_column('frameconfig', sa.Column('organization_id', sa.String(), nullable=True))
    
    # Add organization_id column to globalframeconfig table
    op.add_column('globalframeconfig', sa.Column('organization_id', sa.String(), nullable=True))


def downgrade() -> None:
    # Remove organization_id columns
    op.drop_column('user', 'organization_id')
    op.drop_column('asset', 'organization_id')
    op.drop_column('flow', 'organization_id')
    op.drop_column('training', 'organization_id')
    op.drop_column('style', 'organization_id')
    op.drop_column('frameconfig', 'organization_id')
    op.drop_column('globalframeconfig', 'organization_id')
