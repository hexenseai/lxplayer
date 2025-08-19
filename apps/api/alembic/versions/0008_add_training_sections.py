from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0008_add_training_sections'
down_revision = '0007_add_html_content_to_asset'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('trainingsection',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('training_id', sa.String(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('script', sa.String(), nullable=True),
        sa.Column('duration', sa.Integer(), nullable=True),
        sa.Column('asset_id', sa.String(), nullable=True),
        sa.Column('order_index', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['asset_id'], ['asset.id'], ),
        sa.ForeignKeyConstraint(['training_id'], ['training.id'], ),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('trainingsection')
