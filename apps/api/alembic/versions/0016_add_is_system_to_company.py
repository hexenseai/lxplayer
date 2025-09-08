"""add_is_system_to_company

Revision ID: 0016
Revises: b9ee0798a68c
Create Date: 2025-01-12 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0016'
down_revision = '0015'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add is_system column to company table
    op.add_column('company', sa.Column('is_system', sa.Boolean(), nullable=False, server_default='false'))
    
    # Create system company if it doesn't exist
    connection = op.get_bind()
    connection.execute(sa.text("""
        INSERT INTO company (id, name, business_topic, description, is_system, created_at, updated_at)
        SELECT gen_random_uuid(), 'LXPlayer System', 'System company for SuperAdmins and default content', 
               'This is the system company that contains default styles, frame configs, and other content that can be imported by other companies.',
               true, NOW(), NOW()
        WHERE NOT EXISTS (
            SELECT 1 FROM company WHERE is_system = true
        )
    """))


def downgrade() -> None:
    # Remove is_system column from company table
    op.drop_column('company', 'is_system')
