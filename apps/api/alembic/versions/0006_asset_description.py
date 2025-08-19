from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0006_asset_description'
down_revision = '0005_user_role_default'
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table('asset') as batch_op:
        batch_op.add_column(sa.Column('description', sa.String(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('asset') as batch_op:
        batch_op.drop_column('description')

