"""add_password_reset_and_language_preference

Revision ID: add_password_reset_lang
Revises: create_user_feature_permissions
Create Date: 2025-01-XX XX:XX:XX.XXXXXX

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_password_reset_lang'
down_revision = 'create_user_feature_permissions'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add password reset fields
    op.add_column('users', sa.Column('password_reset_token', sa.String(length=200), nullable=True))
    op.add_column('users', sa.Column('password_reset_token_expires_at', sa.DateTime(timezone=True), nullable=True))
    
    # Add language preference field
    op.add_column('users', sa.Column('language_preference', sa.String(length=10), nullable=True, server_default='en'))
    
    # Create index on password_reset_token for faster lookups
    op.create_index('ix_users_password_reset_token', 'users', ['password_reset_token'], unique=False)


def downgrade() -> None:
    # Drop index
    op.drop_index('ix_users_password_reset_token', table_name='users')
    
    # Drop columns
    op.drop_column('users', 'language_preference')
    op.drop_column('users', 'password_reset_token_expires_at')
    op.drop_column('users', 'password_reset_token')

