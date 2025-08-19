from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0009'
down_revision = '0008_add_training_sections'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add training_section_id column
    op.add_column('overlay', sa.Column('training_section_id', sa.String(), nullable=True))
    op.create_foreign_key('overlay_training_section_id_fkey', 'overlay', 'trainingsection', ['training_section_id'], ['id'])
    
    # Drop existing columns
    op.drop_column('overlay', 'start_time')
    op.drop_column('overlay', 'end_time')
    op.drop_column('overlay', 'kind')
    op.drop_column('overlay', 'payload_json')
    
    # Add new columns
    op.add_column('overlay', sa.Column('time_stamp', sa.Integer(), nullable=True))
    op.add_column('overlay', sa.Column('type', sa.String(), nullable=True))
    op.add_column('overlay', sa.Column('caption', sa.String(), nullable=True))
    op.add_column('overlay', sa.Column('content_id', sa.String(), nullable=True))
    op.add_column('overlay', sa.Column('style', sa.String(), nullable=True))
    op.add_column('overlay', sa.Column('frame', sa.String(), nullable=True))
    op.add_column('overlay', sa.Column('animation', sa.String(), nullable=True))
    op.add_column('overlay', sa.Column('position', sa.String(), nullable=True))
    
    # Add foreign key constraint for content_id
    op.create_foreign_key('overlay_content_id_fkey', 'overlay', 'asset', ['content_id'], ['id'])


def downgrade() -> None:
    # Drop foreign key constraints (only if they exist)
    try:
        op.drop_constraint('overlay_content_id_fkey', 'overlay', type_='foreignkey')
    except:
        pass
    
    try:
        op.drop_constraint('overlay_training_section_id_fkey', 'overlay', type_='foreignkey')
    except:
        pass
    
    # Drop new columns (only if they exist)
    try:
        op.drop_column('overlay', 'position')
    except:
        pass
    
    try:
        op.drop_column('overlay', 'animation')
    except:
        pass
    
    try:
        op.drop_column('overlay', 'frame')
    except:
        pass
    
    try:
        op.drop_column('overlay', 'style')
    except:
        pass
    
    try:
        op.drop_column('overlay', 'content_id')
    except:
        pass
    
    try:
        op.drop_column('overlay', 'caption')
    except:
        pass
    
    try:
        op.drop_column('overlay', 'type')
    except:
        pass
    
    try:
        op.drop_column('overlay', 'time_stamp')
    except:
        pass
    
    # Add back old columns (only if they don't exist)
    try:
        op.add_column('overlay', sa.Column('start_time', sa.Float(), nullable=False))
    except:
        pass
    
    try:
        op.add_column('overlay', sa.Column('end_time', sa.Float(), nullable=False))
    except:
        pass
    
    try:
        op.add_column('overlay', sa.Column('kind', sa.String(), nullable=False))
    except:
        pass
    
    try:
        op.add_column('overlay', sa.Column('payload_json', sa.String(), nullable=False, server_default='{}'))
    except:
        pass
    
    # Drop training_section_id column (only if it exists)
    try:
        op.drop_column('overlay', 'training_section_id')
    except:
        pass
