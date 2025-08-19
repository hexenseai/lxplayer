from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '4a7e3b2c1d12'
down_revision = ('c5e7b2e9a011', '3ad449cc4eba')
branch_labels = None
depends_on = None


def upgrade() -> None:
    # This is a no-op merge migration to unify multiple heads
    pass


def downgrade() -> None:
    # This merge migration has no downgrade operations
    pass


