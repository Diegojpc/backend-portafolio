"""add voice_turns

Revision ID: a1c4e7d90b21
Revises: 8f2fd62e6d70
Create Date: 2026-10-18 23:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1c4e7d90b21'
down_revision: Union[str, Sequence[str], None] = '8f2fd62e6d70'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('voice_turns',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('conversation_id', sa.Integer(), nullable=False),
    sa.Column('ip_hash', sa.String(), nullable=False),
    sa.Column('input_chars', sa.Integer(), nullable=False),
    sa.Column('tts_chars', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['conversation_id'], ['conversations.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_voice_turns_conversation_id'), 'voice_turns', ['conversation_id'], unique=False)
    op.create_index(op.f('ix_voice_turns_ip_hash'), 'voice_turns', ['ip_hash'], unique=False)
    op.create_index(op.f('ix_voice_turns_created_at'), 'voice_turns', ['created_at'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_voice_turns_created_at'), table_name='voice_turns')
    op.drop_index(op.f('ix_voice_turns_ip_hash'), table_name='voice_turns')
    op.drop_index(op.f('ix_voice_turns_conversation_id'), table_name='voice_turns')
    op.drop_table('voice_turns')
