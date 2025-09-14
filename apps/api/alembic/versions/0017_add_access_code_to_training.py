"""add access_code to training

Revision ID: 0017
Revises: f3e8314d5f35
Create Date: 2024-01-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0017'
down_revision = 'f3e8314d5f35'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add access_code column to training table
    op.add_column('training', sa.Column('access_code', sa.String(), nullable=True))


def downgrade() -> None:
    # Remove access_code column from training table
    op.drop_column('training', 'access_code')
