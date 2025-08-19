from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0002_users_orgs_company_training'
down_revision = '0001_init'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('organization', sa.Column('business_topic', sa.String(), nullable=True))
    op.add_column('user', sa.Column('username', sa.String(), nullable=True))
    op.add_column('user', sa.Column('full_name', sa.String(), nullable=True))
    op.create_index('ix_user_username', 'user', ['username'], unique=False)

    op.create_table(
        'companytraining',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('organization_id', sa.String(), nullable=False),
        sa.Column('training_id', sa.String(), nullable=False),
        sa.Column('expectations', sa.String(), nullable=True),
        sa.Column('access_code', sa.String(), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organization.id']),
        sa.ForeignKeyConstraint(['training_id'], ['training.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_companytraining_access_code', 'companytraining', ['access_code'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_companytraining_access_code', table_name='companytraining')
    op.drop_table('companytraining')
    op.drop_index('ix_user_username', table_name='user')
    op.drop_column('user', 'full_name')
    op.drop_column('user', 'username')
    op.drop_column('organization', 'business_topic')
