from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0010_fix_overlay_missing_columns'
down_revision = '0009'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add missing column that should exist according to the model
    op.add_column('overlay', sa.Column('training_section_id', sa.String(), nullable=True))
    
    # Add foreign key constraint for training_section_id
    op.create_foreign_key('overlay_training_section_id_fkey', 'overlay', 'trainingsection', ['training_section_id'], ['id'])


def downgrade() -> None:
    # Drop foreign key constraint
    op.drop_constraint('overlay_training_section_id_fkey', 'overlay', type_='foreignkey')
    
    # Drop column
    op.drop_column('overlay', 'training_section_id')
