from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'c5e7b2e9a011'
down_revision = '0010_fix_overlay_missing_columns'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('trainingsection', sa.Column('video_object', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('trainingsection', 'video_object')


