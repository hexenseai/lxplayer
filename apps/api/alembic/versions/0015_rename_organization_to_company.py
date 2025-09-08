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
    connection = op.get_bind()
    
    # Check if organization table exists and rename to company
    result = connection.execute(sa.text("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'organization'
        );
    """)).scalar()
    
    if result:
        # Organization table exists, rename it to company
        op.rename_table('organization', 'company')
    
    # Add missing columns to company table if they don't exist
    columns_to_add = [
        ('description', sa.String()),
        ('address', sa.String()),
        ('phone', sa.String()),
        ('email', sa.String()),
        ('website', sa.String()),
        ('created_at', sa.DateTime()),
        ('updated_at', sa.DateTime())
    ]
    
    for column_name, column_type in columns_to_add:
        result = connection.execute(sa.text(f"""
            SELECT EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'company' 
                AND column_name = '{column_name}'
            );
        """)).scalar()
        
        if not result:
            op.add_column('company', sa.Column(column_name, column_type, nullable=True))
    
    # Add missing columns to user table if they don't exist
    user_columns_to_add = [
        ('is_active', sa.Boolean()),
        ('created_at', sa.DateTime()),
        ('updated_at', sa.DateTime())
    ]
    
    for column_name, column_type in user_columns_to_add:
        result = connection.execute(sa.text(f"""
            SELECT EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'user' 
                AND column_name = '{column_name}'
            );
        """)).scalar()
        
        if not result:
            op.add_column('user', sa.Column(column_name, column_type, nullable=True))
    
    # Rename organization_id columns to company_id if they exist
    tables_to_rename = ['user', 'asset', 'flow', 'training', 'companytraining', 'frameconfig', 'globalframeconfig', 'style']
    
    for table_name in tables_to_rename:
        # Check if organization_id column exists and company_id doesn't
        result = connection.execute(sa.text(f"""
            SELECT EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = '{table_name}' 
                AND column_name = 'organization_id'
            );
        """)).scalar()
        
        if result:
            result2 = connection.execute(sa.text(f"""
                SELECT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = '{table_name}' 
                    AND column_name = 'company_id'
                );
            """)).scalar()
            
            if not result2:
                op.alter_column(table_name, 'organization_id', new_column_name='company_id')
    
    # Update foreign key constraints safely
    fk_mappings = [
        ('user', 'user_organization_id_fkey', 'user_company_id_fkey'),
        ('asset', 'asset_organization_id_fkey', 'asset_company_id_fkey'),
        ('flow', 'flow_organization_id_fkey', 'flow_company_id_fkey'),
        ('training', 'training_organization_id_fkey', 'training_company_id_fkey'),
        ('companytraining', 'companytraining_organization_id_fkey', 'companytraining_company_id_fkey'),
        ('frameconfig', 'frameconfig_organization_id_fkey', 'frameconfig_company_id_fkey'),
        ('globalframeconfig', 'globalframeconfig_organization_id_fkey', 'globalframeconfig_company_id_fkey'),
        ('style', 'style_organization_id_fkey', 'style_company_id_fkey')
    ]
    
    for table_name, old_fk_name, new_fk_name in fk_mappings:
        # Check if old foreign key constraint exists
        result = connection.execute(sa.text(f"""
            SELECT EXISTS (
                SELECT FROM information_schema.table_constraints 
                WHERE table_schema = 'public' 
                AND table_name = '{table_name}' 
                AND constraint_name = '{old_fk_name}'
            );
        """)).scalar()
        
        if result:
            op.drop_constraint(old_fk_name, table_name, type_='foreignkey')
        
        # Check if new foreign key constraint doesn't exist
        result2 = connection.execute(sa.text(f"""
            SELECT EXISTS (
                SELECT FROM information_schema.table_constraints 
                WHERE table_schema = 'public' 
                AND table_name = '{table_name}' 
                AND constraint_name = '{new_fk_name}'
            );
        """)).scalar()
        
        if not result2:
            op.create_foreign_key(new_fk_name, table_name, 'company', ['company_id'], ['id'])


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