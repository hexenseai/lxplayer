from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0001_init'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('organization',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table('flow',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('graph_json', sa.String(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table('asset',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('kind', sa.String(), nullable=False),
        sa.Column('uri', sa.String(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table('rubric',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('criteria_json', sa.String(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table('training',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('flow_id', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['flow_id'], ['flow.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table('user',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=True),
        sa.Column('organization_id', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['organization_id'], ['organization.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_user_email', 'user', ['email'], unique=True)
    op.create_table('overlay',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('training_id', sa.String(), nullable=False),
        sa.Column('start_time', sa.Float(), nullable=False),
        sa.Column('end_time', sa.Float(), nullable=False),
        sa.Column('kind', sa.String(), nullable=False),
        sa.Column('payload_json', sa.String(), nullable=False),
        sa.ForeignKeyConstraint(['training_id'], ['training.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table('session',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=True),
        sa.Column('training_id', sa.String(), nullable=False),
        sa.Column('started_at', sa.DateTime(), nullable=False),
        sa.Column('ended_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['training_id'], ['training.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table('interactionlog',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('session_id', sa.String(), nullable=False),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.Column('event', sa.String(), nullable=False),
        sa.Column('data_json', sa.String(), nullable=False),
        sa.ForeignKeyConstraint(['session_id'], ['session.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table('report',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('training_id', sa.String(), nullable=False),
        sa.Column('generated_at', sa.DateTime(), nullable=False),
        sa.Column('metrics_json', sa.String(), nullable=False),
        sa.ForeignKeyConstraint(['training_id'], ['training.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table('embedding',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('owner_kind', sa.String(), nullable=False),
        sa.Column('owner_id', sa.String(), nullable=False),
        sa.Column('vector', sa.LargeBinary(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('embedding')
    op.drop_table('report')
    op.drop_table('interactionlog')
    op.drop_table('session')
    op.drop_table('overlay')
    op.drop_index('ix_user_email', table_name='user')
    op.drop_table('user')
    op.drop_table('training')
    op.drop_table('rubric')
    op.drop_table('asset')
    op.drop_table('flow')
    op.drop_table('organization')
