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
    # Add company_id column to user table
    op.add_column('user', sa.Column('company_id', sa.String(), nullable=True))
    op.create_foreign_key(None, 'user', 'company', ['company_id'], ['id'])
    
    # Add company_id column to assets table
    op.add_column('asset', sa.Column('company_id', sa.String(), nullable=True))
    op.create_foreign_key(None, 'asset', 'company', ['company_id'], ['id'])
    
    # Add company_id column to flow table
    op.add_column('flow', sa.Column('company_id', sa.String(), nullable=True))
    op.create_foreign_key(None, 'flow', 'company', ['company_id'], ['id'])
    
    # Add company_id column to training table
    op.add_column('training', sa.Column('company_id', sa.String(), nullable=True))
    op.create_foreign_key(None, 'training', 'company', ['company_id'], ['id'])
    
    # Add company_id column to style table
    op.add_column('style', sa.Column('company_id', sa.String(), nullable=True))
    op.create_foreign_key(None, 'style', 'company', ['company_id'], ['id'])
    
    # Add company_id column to frameconfig table
    op.add_column('frameconfig', sa.Column('company_id', sa.String(), nullable=True))
    op.create_foreign_key(None, 'frameconfig', 'company', ['company_id'], ['id'])
    
    # Add company_id column to globalframeconfig table
    op.add_column('globalframeconfig', sa.Column('company_id', sa.String(), nullable=True))
    op.create_foreign_key(None, 'globalframeconfig', 'company', ['company_id'], ['id'])


def downgrade() -> None:
    # Remove foreign key constraints
    op.drop_constraint(None, 'user', type_='foreignkey')
    op.drop_constraint(None, 'asset', type_='foreignkey')
    op.drop_constraint(None, 'flow', type_='foreignkey')
    op.drop_constraint(None, 'training', type_='foreignkey')
    op.drop_constraint(None, 'style', type_='foreignkey')
    op.drop_constraint(None, 'frameconfig', type_='foreignkey')
    op.drop_constraint(None, 'globalframeconfig', type_='foreignkey')
    
    # Remove company_id columns
    op.drop_column('user', 'company_id')
    op.drop_column('asset', 'company_id')
    op.drop_column('flow', 'company_id')
    op.drop_column('training', 'company_id')
    op.drop_column('style', 'company_id')
    op.drop_column('frameconfig', 'company_id')
    op.drop_column('globalframeconfig', 'company_id')
