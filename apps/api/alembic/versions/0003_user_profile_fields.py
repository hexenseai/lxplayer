from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0003_user_profile_fields'
down_revision = '0002_users_orgs_company_training'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('user', sa.Column('role', sa.String(), nullable=True))
    op.add_column('user', sa.Column('department', sa.String(), nullable=True))
    op.add_column('user', sa.Column('temp_password', sa.String(), nullable=True))
    op.add_column('user', sa.Column('gpt_prefs', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('user', 'gpt_prefs')
    op.drop_column('user', 'temp_password')
    op.drop_column('user', 'department')
    op.drop_column('user', 'role')
