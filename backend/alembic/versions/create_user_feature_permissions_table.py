"""create_user_feature_permissions_table

Revision ID: create_user_feature_permissions
Revises: 59fcebf36ca2
Create Date: 2025-11-02 15:40:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c1a2b3c4d5e6'
down_revision = '59fcebf36ca2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'user_feature_permissions',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('feature_name', sa.String(50), nullable=False),
        sa.Column('is_enabled', sa.Boolean(), default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    )
    op.create_unique_constraint('uq_user_feature', 'user_feature_permissions', ['user_id', 'feature_name'])
    op.create_index('ix_user_feature_permissions_user_id', 'user_feature_permissions', ['user_id'])


def downgrade() -> None:
    op.drop_index('ix_user_feature_permissions_user_id', table_name='user_feature_permissions')
    op.drop_constraint('uq_user_feature', 'user_feature_permissions', type_='unique')
    op.drop_table('user_feature_permissions')

