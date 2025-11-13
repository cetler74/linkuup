"""create_user_feature_permissions_table

Revision ID: 1a4ab6565475
Revises: add_password_reset_lang
Create Date: 2025-11-13 11:47:47.869452

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1a4ab6565475'
down_revision: Union[str, Sequence[str], None] = 'add_password_reset_lang'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create user_feature_permissions table
    op.create_table(
        'user_feature_permissions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('feature_name', sa.String(length=50), nullable=False),
        sa.Column('is_enabled', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'feature_name', name='uq_user_feature')
    )
    op.create_index(op.f('ix_user_feature_permissions_id'), 'user_feature_permissions', ['id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    # Drop index if it exists
    try:
        op.drop_index(op.f('ix_user_feature_permissions_id'), table_name='user_feature_permissions')
    except:
        pass
    op.drop_table('user_feature_permissions')
