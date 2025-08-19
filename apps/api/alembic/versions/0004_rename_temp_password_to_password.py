from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0004_user_pwd'
down_revision = '0003_user_profile_fields'
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table('user') as batch_op:
        batch_op.alter_column('temp_password', new_column_name='password', existing_type=sa.String(), existing_nullable=True)


def downgrade() -> None:
    with op.batch_alter_table('user') as batch_op:
        batch_op.alter_column('password', new_column_name='temp_password', existing_type=sa.String(), existing_nullable=True)
