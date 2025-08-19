from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'b913a1d2c013'
down_revision = '4a7e3b2c1d12'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('overlay', sa.Column('pause_on_show', sa.Boolean(), nullable=True))


def downgrade() -> None:
    op.drop_column('overlay', 'pause_on_show')


