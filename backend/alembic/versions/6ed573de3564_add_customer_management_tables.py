"""add_customer_management_tables

Revision ID: 6ed573de3564
Revises: 6e7193efabf1
Create Date: 2025-01-27 17:45:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision = '6ed573de3564'
down_revision = '6e7193efabf1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add customer management tables."""
    
    bind = op.get_bind()
    # Create customer_place_associations table (idempotent)
    if not bind.execute(text("SELECT to_regclass('public.customer_place_associations')")).scalar():
        op.create_table('customer_place_associations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('place_id', sa.Integer(), nullable=False),
        sa.Column('first_booking_date', sa.Date(), nullable=True),
        sa.Column('last_booking_date', sa.Date(), nullable=True),
        sa.Column('total_bookings', sa.Integer(), nullable=False, default=0),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['place_id'], ['places.id'], ),
        sa.UniqueConstraint('user_id', 'place_id', name='unique_customer_place')
        )
        op.create_index(op.f('ix_customer_place_associations_id'), 'customer_place_associations', ['id'], unique=False)
        op.create_index(op.f('ix_customer_place_associations_user_id'), 'customer_place_associations', ['user_id'], unique=False)
        op.create_index(op.f('ix_customer_place_associations_place_id'), 'customer_place_associations', ['place_id'], unique=False)

    # Create customer_rewards table (idempotent)
    if not bind.execute(text("SELECT to_regclass('public.customer_rewards')")).scalar():
        op.create_table('customer_rewards',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('place_id', sa.Integer(), nullable=False),
        sa.Column('points_balance', sa.Integer(), nullable=False, default=0),
        sa.Column('total_points_earned', sa.Integer(), nullable=False, default=0),
        sa.Column('total_points_redeemed', sa.Integer(), nullable=False, default=0),
        sa.Column('tier', sa.String(20), nullable=False, default='bronze'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['place_id'], ['places.id'], ),
        sa.UniqueConstraint('user_id', 'place_id', name='unique_customer_reward')
        )
        op.create_index(op.f('ix_customer_rewards_id'), 'customer_rewards', ['id'], unique=False)
        op.create_index(op.f('ix_customer_rewards_user_id'), 'customer_rewards', ['user_id'], unique=False)
        op.create_index(op.f('ix_customer_rewards_place_id'), 'customer_rewards', ['place_id'], unique=False)

    # Create reward_transactions table (idempotent)
    if not bind.execute(text("SELECT to_regclass('public.reward_transactions')")).scalar():
        op.create_table('reward_transactions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('customer_reward_id', sa.Integer(), nullable=False),
        sa.Column('booking_id', sa.Integer(), nullable=True),
        sa.Column('transaction_type', sa.String(20), nullable=False),
        sa.Column('points_change', sa.Integer(), nullable=False),
        sa.Column('points_balance_after', sa.Integer(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['customer_reward_id'], ['customer_rewards.id'], ),
        sa.ForeignKeyConstraint(['booking_id'], ['bookings.id'], )
        )
        op.create_index(op.f('ix_reward_transactions_id'), 'reward_transactions', ['id'], unique=False)
        op.create_index(op.f('ix_reward_transactions_customer_reward_id'), 'reward_transactions', ['customer_reward_id'], unique=False)
        op.create_index(op.f('ix_reward_transactions_booking_id'), 'reward_transactions', ['booking_id'], unique=False)

    # Create reward_settings table (idempotent)
    if not bind.execute(text("SELECT to_regclass('public.reward_settings')")).scalar():
        op.create_table('reward_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('place_id', sa.Integer(), nullable=True),
        sa.Column('calculation_method', sa.String(30), nullable=False),
        sa.Column('points_per_booking', sa.Integer(), nullable=True),
        sa.Column('points_per_currency_unit', sa.Integer(), nullable=True),
        sa.Column('redemption_rules', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['place_id'], ['places.id'], )
        )
        op.create_index(op.f('ix_reward_settings_id'), 'reward_settings', ['id'], unique=False)
        op.create_index(op.f('ix_reward_settings_place_id'), 'reward_settings', ['place_id'], unique=False)

    # Create place_feature_settings table (idempotent)
    if not bind.execute(text("SELECT to_regclass('public.place_feature_settings')")).scalar():
        op.create_table('place_feature_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('place_id', sa.Integer(), nullable=False),
        sa.Column('bookings_enabled', sa.Boolean(), nullable=False, default=True),
        sa.Column('rewards_enabled', sa.Boolean(), nullable=False, default=False),
        sa.Column('time_off_enabled', sa.Boolean(), nullable=False, default=True),
        sa.Column('campaigns_enabled', sa.Boolean(), nullable=False, default=True),
        sa.Column('messaging_enabled', sa.Boolean(), nullable=False, default=True),
        sa.Column('notifications_enabled', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['place_id'], ['places.id'], ),
        sa.UniqueConstraint('place_id', name='unique_place_feature_settings')
        )
        op.create_index(op.f('ix_place_feature_settings_id'), 'place_feature_settings', ['id'], unique=False)
        op.create_index(op.f('ix_place_feature_settings_place_id'), 'place_feature_settings', ['place_id'], unique=False)

    # Create default place_feature_settings for existing places
    op.execute("""
        INSERT INTO place_feature_settings (place_id, bookings_enabled, rewards_enabled, time_off_enabled, campaigns_enabled, messaging_enabled, notifications_enabled)
        SELECT id, booking_enabled, rewards_enabled, true, true, true, true
        FROM places
        WHERE id NOT IN (SELECT place_id FROM place_feature_settings)
    """)


def downgrade() -> None:
    """Remove customer management tables."""
    
    # Drop tables in reverse order
    op.drop_index(op.f('ix_place_feature_settings_place_id'), table_name='place_feature_settings')
    op.drop_index(op.f('ix_place_feature_settings_id'), table_name='place_feature_settings')
    op.drop_table('place_feature_settings')
    
    op.drop_index(op.f('ix_reward_settings_place_id'), table_name='reward_settings')
    op.drop_index(op.f('ix_reward_settings_id'), table_name='reward_settings')
    op.drop_table('reward_settings')
    
    op.drop_index(op.f('ix_reward_transactions_booking_id'), table_name='reward_transactions')
    op.drop_index(op.f('ix_reward_transactions_customer_reward_id'), table_name='reward_transactions')
    op.drop_index(op.f('ix_reward_transactions_id'), table_name='reward_transactions')
    op.drop_table('reward_transactions')
    
    op.drop_index(op.f('ix_customer_rewards_place_id'), table_name='customer_rewards')
    op.drop_index(op.f('ix_customer_rewards_user_id'), table_name='customer_rewards')
    op.drop_index(op.f('ix_customer_rewards_id'), table_name='customer_rewards')
    op.drop_table('customer_rewards')
    
    op.drop_index(op.f('ix_customer_place_associations_place_id'), table_name='customer_place_associations')
    op.drop_index(op.f('ix_customer_place_associations_user_id'), table_name='customer_place_associations')
    op.drop_index(op.f('ix_customer_place_associations_id'), table_name='customer_place_associations')
    op.drop_table('customer_place_associations')