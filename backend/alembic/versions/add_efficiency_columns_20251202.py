"""add efficiency analysis columns

Revision ID: add_efficiency_cols
Revises: merge_heads_12345
Create Date: 2025-12-02

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision = 'add_efficiency_cols'
down_revision = 'merge_heads_12345'
branch_labels = None
depends_on = None


def upgrade():
    # Check if table exists, if not create it
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    if 'meeting_efficiency_analysis' not in inspector.get_table_names():
        # Table doesn't exist, create it with all columns
        op.create_table(
            'meeting_efficiency_analysis',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('audio_file_id', sa.Integer(), nullable=False),
            sa.Column('entropy_values', mysql.JSON(), nullable=True),
            sa.Column('entropy_avg', sa.Float(), nullable=True),
            sa.Column('entropy_std', sa.Float(), nullable=True),
            sa.Column('overall_ttr', mysql.JSON(), nullable=True),
            sa.Column('overall_information_content', mysql.JSON(), nullable=True),
            sa.Column('overall_sentence_probability', mysql.JSON(), nullable=True),
            sa.Column('overall_perplexity', mysql.JSON(), nullable=True),
            sa.Column('entropy_insight', sa.String(length=500), nullable=True),
            sa.Column('overall_ttr_insight', sa.String(length=500), nullable=True),
            sa.Column('overall_info_insight', sa.String(length=500), nullable=True),
            sa.Column('overall_sentence_prob_insight', sa.String(length=500), nullable=True),
            sa.Column('overall_ppl_insight', sa.String(length=500), nullable=True),
            sa.Column('speaker_metrics', mysql.JSON(), nullable=False),
            sa.Column('total_speakers', sa.Integer(), nullable=False),
            sa.Column('total_turns', sa.Integer(), nullable=False),
            sa.Column('total_sentences', sa.Integer(), nullable=False),
            sa.Column('analysis_version', sa.String(length=20), nullable=False, server_default='1.0'),
            sa.Column('analyzed_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
            sa.Column('qualitative_analysis', mysql.JSON(), nullable=True),
            sa.Column('silence_analysis', mysql.JSON(), nullable=True),
            sa.Column('interaction_analysis', mysql.JSON(), nullable=True),
            sa.PrimaryKeyConstraint('id'),
            sa.ForeignKeyConstraint(['audio_file_id'], ['audio_files.id'], ondelete='CASCADE'),
            sa.UniqueConstraint('audio_file_id')
        )
        op.create_index('ix_meeting_efficiency_analysis_id', 'meeting_efficiency_analysis', ['id'])
        op.create_index('ix_meeting_efficiency_analysis_audio_file_id', 'meeting_efficiency_analysis', ['audio_file_id'])
    else:
        # Table exists, add missing columns if they don't exist
        existing_columns = [col['name'] for col in inspector.get_columns('meeting_efficiency_analysis')]

        if 'entropy_values' not in existing_columns:
            op.add_column('meeting_efficiency_analysis', sa.Column('entropy_values', mysql.JSON(), nullable=True))

        if 'entropy_avg' not in existing_columns:
            op.add_column('meeting_efficiency_analysis', sa.Column('entropy_avg', sa.Float(), nullable=True))

        if 'entropy_std' not in existing_columns:
            op.add_column('meeting_efficiency_analysis', sa.Column('entropy_std', sa.Float(), nullable=True))

        if 'qualitative_analysis' not in existing_columns:
            op.add_column('meeting_efficiency_analysis', sa.Column('qualitative_analysis', mysql.JSON(), nullable=True))

        if 'silence_analysis' not in existing_columns:
            op.add_column('meeting_efficiency_analysis', sa.Column('silence_analysis', mysql.JSON(), nullable=True))

        if 'interaction_analysis' not in existing_columns:
            op.add_column('meeting_efficiency_analysis', sa.Column('interaction_analysis', mysql.JSON(), nullable=True))


def downgrade():
    # Only remove columns if table exists
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    if 'meeting_efficiency_analysis' in inspector.get_table_names():
        existing_columns = [col['name'] for col in inspector.get_columns('meeting_efficiency_analysis')]

        if 'interaction_analysis' in existing_columns:
            op.drop_column('meeting_efficiency_analysis', 'interaction_analysis')

        if 'silence_analysis' in existing_columns:
            op.drop_column('meeting_efficiency_analysis', 'silence_analysis')

        if 'qualitative_analysis' in existing_columns:
            op.drop_column('meeting_efficiency_analysis', 'qualitative_analysis')

        if 'entropy_std' in existing_columns:
            op.drop_column('meeting_efficiency_analysis', 'entropy_std')

        if 'entropy_avg' in existing_columns:
            op.drop_column('meeting_efficiency_analysis', 'entropy_avg')

        if 'entropy_values' in existing_columns:
            op.drop_column('meeting_efficiency_analysis', 'entropy_values')
