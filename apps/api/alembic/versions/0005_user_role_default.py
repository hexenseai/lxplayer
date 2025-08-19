from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0005_user_role_default'
down_revision = '0004_user_pwd'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # backfill null roles
    op.execute("UPDATE \"user\" SET role='User' WHERE role IS NULL")
    # ensure column exists and set default
    with op.batch_alter_table('user') as batch_op:
      batch_op.alter_column('role', existing_type=sa.String(), server_default='User', existing_nullable=True)


def downgrade() -> None:
    with op.batch_alter_table('user') as batch_op:
      batch_op.alter_column('role', existing_type=sa.String(), server_default=None, existing_nullable=True)
