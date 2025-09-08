"""rename organization to company

Revision ID: 0015_rename_organization_to_company
Revises: 0014_add_organization_id_to_models
Create Date: 2024-01-15 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0015'
down_revision = '0014'
branch_labels = None
depends_on = None


def upgrade():
    # Rename organization table to company
    op.rename_table('organization', 'company')
    
    # Add new columns to company table
    op.add_column('company', sa.Column('description', sa.String(), nullable=True))
    op.add_column('company', sa.Column('address', sa.String(), nullable=True))
    op.add_column('company', sa.Column('phone', sa.String(), nullable=True))
    op.add_column('company', sa.Column('email', sa.String(), nullable=True))
    op.add_column('company', sa.Column('website', sa.String(), nullable=True))
    op.add_column('company', sa.Column('created_at', sa.DateTime(), nullable=True))
    op.add_column('company', sa.Column('updated_at', sa.DateTime(), nullable=True))
    
    # Add new columns to user table
    op.add_column('user', sa.Column('is_active', sa.Boolean(), nullable=True))
    op.add_column('user', sa.Column('created_at', sa.DateTime(), nullable=True))
    op.add_column('user', sa.Column('updated_at', sa.DateTime(), nullable=True))
    
    # Rename organization_id columns to company_id
    op.alter_column('user', 'organization_id', new_column_name='company_id')
    op.alter_column('asset', 'organization_id', new_column_name='company_id')
    op.alter_column('flow', 'organization_id', new_column_name='company_id')
    op.alter_column('training', 'organization_id', new_column_name='company_id')
    op.alter_column('companytraining', 'organization_id', new_column_name='company_id')
    op.alter_column('frameconfig', 'organization_id', new_column_name='company_id')
    op.alter_column('globalframeconfig', 'organization_id', new_column_name='company_id')
    op.alter_column('style', 'organization_id', new_column_name='company_id')
    
    # Update foreign key constraints
    op.drop_constraint('user_organization_id_fkey', 'user', type_='foreignkey')
    op.create_foreign_key('user_company_id_fkey', 'user', 'company', ['company_id'], ['id'])
    
    op.drop_constraint('asset_organization_id_fkey', 'asset', type_='foreignkey')
    op.create_foreign_key('asset_company_id_fkey', 'asset', 'company', ['company_id'], ['id'])
    
    op.drop_constraint('flow_organization_id_fkey', 'flow', type_='foreignkey')
    op.create_foreign_key('flow_company_id_fkey', 'flow', 'company', ['company_id'], ['id'])
    
    op.drop_constraint('training_organization_id_fkey', 'training', type_='foreignkey')
    op.create_foreign_key('training_company_id_fkey', 'training', 'company', ['company_id'], ['id'])
    
    op.drop_constraint('companytraining_organization_id_fkey', 'companytraining', type_='foreignkey')
    op.create_foreign_key('companytraining_company_id_fkey', 'companytraining', 'company', ['company_id'], ['id'])
    
    op.drop_constraint('frameconfig_organization_id_fkey', 'frameconfig', type_='foreignkey')
    op.create_foreign_key('frameconfig_company_id_fkey', 'frameconfig', 'company', ['company_id'], ['id'])
    
    op.drop_constraint('globalframeconfig_organization_id_fkey', 'globalframeconfig', type_='foreignkey')
    op.create_foreign_key('globalframeconfig_company_id_fkey', 'globalframeconfig', 'company', ['company_id'], ['id'])
    
    op.drop_constraint('style_organization_id_fkey', 'style', type_='foreignkey')
    op.create_foreign_key('style_company_id_fkey', 'style', 'company', ['company_id'], ['id'])


def downgrade():
    # Revert foreign key constraints
    op.drop_constraint('user_company_id_fkey', 'user', type_='foreignkey')
    op.create_foreign_key('user_organization_id_fkey', 'user', 'company', ['company_id'], ['id'])
    
    op.drop_constraint('asset_company_id_fkey', 'asset', type_='foreignkey')
    op.create_foreign_key('asset_organization_id_fkey', 'asset', 'company', ['company_id'], ['id'])
    
    op.drop_constraint('flow_company_id_fkey', 'flow', type_='foreignkey')
    op.create_foreign_key('flow_organization_id_fkey', 'flow', 'company', ['company_id'], ['id'])
    
    op.drop_constraint('training_company_id_fkey', 'training', type_='foreignkey')
    op.create_foreign_key('training_organization_id_fkey', 'training', 'company', ['company_id'], ['id'])
    
    op.drop_constraint('companytraining_company_id_fkey', 'companytraining', type_='foreignkey')
    op.create_foreign_key('companytraining_organization_id_fkey', 'companytraining', 'company', ['company_id'], ['id'])
    
    op.drop_constraint('frameconfig_company_id_fkey', 'frameconfig', type_='foreignkey')
    op.create_foreign_key('frameconfig_organization_id_fkey', 'frameconfig', 'company', ['company_id'], ['id'])
    
    op.drop_constraint('globalframeconfig_company_id_fkey', 'globalframeconfig', type_='foreignkey')
    op.create_foreign_key('globalframeconfig_organization_id_fkey', 'globalframeconfig', 'company', ['company_id'], ['id'])
    
    op.drop_constraint('style_company_id_fkey', 'style', type_='foreignkey')
    op.create_foreign_key('style_organization_id_fkey', 'style', 'company', ['company_id'], ['id'])
    
    # Rename company_id columns back to organization_id
    op.alter_column('user', 'company_id', new_column_name='organization_id')
    op.alter_column('asset', 'company_id', new_column_name='organization_id')
    op.alter_column('flow', 'company_id', new_column_name='organization_id')
    op.alter_column('training', 'company_id', new_column_name='organization_id')
    op.alter_column('companytraining', 'company_id', new_column_name='organization_id')
    op.alter_column('frameconfig', 'company_id', new_column_name='organization_id')
    op.alter_column('globalframeconfig', 'company_id', new_column_name='organization_id')
    op.alter_column('style', 'company_id', new_column_name='organization_id')
    
    # Remove new columns from user table
    op.drop_column('user', 'updated_at')
    op.drop_column('user', 'created_at')
    op.drop_column('user', 'is_active')
    
    # Remove new columns from company table
    op.drop_column('company', 'updated_at')
    op.drop_column('company', 'created_at')
    op.drop_column('company', 'website')
    op.drop_column('company', 'email')
    op.drop_column('company', 'phone')
    op.drop_column('company', 'address')
    op.drop_column('company', 'description')
    
    # Rename company table back to organization
    op.rename_table('company', 'organization')
