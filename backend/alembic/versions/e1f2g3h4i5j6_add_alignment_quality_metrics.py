"""Add alignment quality metrics to audio_files

Revision ID: e1f2g3h4i5j6
Revises: d4e5f6g7h8i9
Create Date: 2025-12-17 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e1f2g3h4i5j6'
down_revision: Union[str, None] = 'd4e5f6g7h8i9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add alignment quality metrics to audio_files table
    op.add_column('audio_files', sa.Column('alignment_score', sa.Float(), nullable=True))
    op.add_column('audio_files', sa.Column('unassigned_duration', sa.Float(), nullable=True))


def downgrade() -> None:
    # Remove alignment quality metrics from audio_files table
    op.drop_column('audio_files', 'unassigned_duration')
    op.drop_column('audio_files', 'alignment_score')
