"""Add speaking_practice_sessions table

Revision ID: 002
Revises: 001
Create Date: 2026-08-22 09:30:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'speaking_practice_sessions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('topic', sa.String(), nullable=False, server_default='Free Talk'),
        sa.Column('transcript', sa.JSON(), nullable=True),
        sa.Column('duration', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('language', sa.String(), nullable=True, server_default='en-US'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_speaking_practice_sessions_id'), 'speaking_practice_sessions', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_speaking_practice_sessions_id'), table_name='speaking_practice_sessions')
    op.drop_table('speaking_practice_sessions')
