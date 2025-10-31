"""add_rewards_to_existing_tables

Revision ID: 6e7193efabf1
Revises: 844d9b07e4e1
Create Date: 2025-01-27 17:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision = '6e7193efabf1'
down_revision = '844d9b07e4e1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add reward-related columns to existing tables."""
    
    # Add reward settings to places table (nullable first)
    bind = op.get_bind()
    if not bind.execute(text("SELECT 1 FROM information_schema.columns WHERE table_name='places' AND column_name='rewards_enabled'")) .first():
        op.add_column('places', sa.Column('rewards_enabled', sa.Boolean(), nullable=True))
    if not bind.execute(text("SELECT 1 FROM information_schema.columns WHERE table_name='places' AND column_name='rewards_points_per_booking'")) .first():
        op.add_column('places', sa.Column('rewards_points_per_booking', sa.Integer(), nullable=True))
    if not bind.execute(text("SELECT 1 FROM information_schema.columns WHERE table_name='places' AND column_name='rewards_calculation_method'")) .first():
        op.add_column('places', sa.Column('rewards_calculation_method', sa.String(30), nullable=True))
    
    # Update existing rows with default values
    op.execute("UPDATE places SET rewards_enabled = false WHERE rewards_enabled IS NULL")
    op.execute("UPDATE places SET rewards_points_per_booking = 10 WHERE rewards_points_per_booking IS NULL")
    op.execute("UPDATE places SET rewards_calculation_method = 'fixed_per_booking' WHERE rewards_calculation_method IS NULL")
    
    # Make columns NOT NULL after updating data (best-effort)
    try:
        op.alter_column('places', 'rewards_enabled', nullable=False)
        op.alter_column('places', 'rewards_points_per_booking', nullable=False)
        op.alter_column('places', 'rewards_calculation_method', nullable=False)
    except Exception:
        pass
    
    # Add user_id and reward points to bookings table
    if not bind.execute(text("SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='user_id'")).first():
        op.add_column('bookings', sa.Column('user_id', sa.Integer(), nullable=True))
    if not bind.execute(text("SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='rewards_points_earned'")).first():
        op.add_column('bookings', sa.Column('rewards_points_earned', sa.Integer(), nullable=True))
    if not bind.execute(text("SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='rewards_points_redeemed'")).first():
        op.add_column('bookings', sa.Column('rewards_points_redeemed', sa.Integer(), nullable=True))
    
    # Add foreign key constraint for user_id in bookings
    try:
        op.create_foreign_key('fk_bookings_user_id', 'bookings', 'users', ['user_id'], ['id'])
    except Exception:
        pass
    try:
        op.create_index(op.f('ix_bookings_user_id'), 'bookings', ['user_id'], unique=False)
    except Exception:
        pass
    
    # Add reward tracking to users table (nullable first)
    if not bind.execute(text("SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='total_reward_points'")).first():
        op.add_column('users', sa.Column('total_reward_points', sa.Integer(), nullable=True))
    if not bind.execute(text("SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='reward_tier'")).first():
        op.add_column('users', sa.Column('reward_tier', sa.String(20), nullable=True))
    
    # Update existing rows with default values
    op.execute("UPDATE users SET total_reward_points = 0 WHERE total_reward_points IS NULL")
    op.execute("UPDATE users SET reward_tier = 'bronze' WHERE reward_tier IS NULL")
    
    # Make columns NOT NULL after updating data (best-effort)
    try:
        op.alter_column('users', 'total_reward_points', nullable=False)
        op.alter_column('users', 'reward_tier', nullable=False)
    except Exception:
        pass


def downgrade() -> None:
    """Remove reward-related columns from existing tables."""
    
    # Remove columns from users table
    op.drop_column('users', 'reward_tier')
    op.drop_column('users', 'total_reward_points')
    
    # Remove foreign key and index from bookings
    op.drop_index(op.f('ix_bookings_user_id'), table_name='bookings')
    op.drop_constraint('fk_bookings_user_id', 'bookings', type_='foreignkey')
    
    # Remove columns from bookings table
    op.drop_column('bookings', 'rewards_points_redeemed')
    op.drop_column('bookings', 'rewards_points_earned')
    op.drop_column('bookings', 'user_id')
    
    # Remove columns from places table
    op.drop_column('places', 'rewards_calculation_method')
    op.drop_column('places', 'rewards_points_per_booking')
    op.drop_column('places', 'rewards_enabled')