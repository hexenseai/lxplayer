"""add_avatar_id_to_training

Revision ID: 0018
Revises: 0017
Create Date: 2025-01-11 12:34:07.857587

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0018'
down_revision = '0017'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add avatar_id column to training table
    op.add_column('training', sa.Column('avatar_id', sa.String(), nullable=True))
    op.create_foreign_key('fk_training_avatar_id', 'training', 'avatar', ['avatar_id'], ['id'])


def downgrade() -> None:
    # Remove foreign key and column from training table
    op.drop_constraint('fk_training_avatar_id', 'training', type_='foreignkey')
    op.drop_column('training', 'avatar_id')
