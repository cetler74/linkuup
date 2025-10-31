"""Add campaigns tables

Revision ID: 20241220_add_campaigns_tables
Revises: 6ff826b41e80
Create Date: 2024-12-20 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20241220_add_campaigns_tables'
down_revision = '6ff826b41e80'
branch_labels = None
depends_on = None


def upgrade():
    # Create campaigns table (idempotent)
    bind = op.get_bind()
    campaigns_exists = bind.execute(text("SELECT to_regclass('public.campaigns')")).scalar() is not None
    if not campaigns_exists:
        op.create_table('campaigns',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('owner_id', sa.Integer(), nullable=False),
            sa.Column('name', sa.String(length=200), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('banner_message', sa.Text(), nullable=False),
            sa.Column('campaign_type', sa.String(length=50), nullable=False),
            sa.Column('start_datetime', sa.DateTime(), nullable=False),
            sa.Column('end_datetime', sa.DateTime(), nullable=False),
            sa.Column('discount_type', sa.String(length=20), nullable=True),
            sa.Column('discount_value', sa.DECIMAL(precision=10, scale=2), nullable=True),
            sa.Column('rewards_multiplier', sa.DECIMAL(precision=5, scale=2), nullable=True),
            sa.Column('rewards_bonus_points', sa.Integer(), nullable=True),
            sa.Column('free_service_type', sa.String(length=30), nullable=True),
            sa.Column('buy_quantity', sa.Integer(), nullable=True),
            sa.Column('get_quantity', sa.Integer(), nullable=True),
            sa.Column('is_active', sa.Boolean(), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
            sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
            sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_campaigns_id'), 'campaigns', ['id'], unique=False)
        op.create_index(op.f('ix_campaigns_owner_id'), 'campaigns', ['owner_id'], unique=False)
        op.create_index(op.f('ix_campaigns_start_datetime'), 'campaigns', ['start_datetime'], unique=False)
        op.create_index(op.f('ix_campaigns_end_datetime'), 'campaigns', ['end_datetime'], unique=False)
        op.create_index(op.f('ix_campaigns_is_active'), 'campaigns', ['is_active'], unique=False)

    # Create campaign_places table (idempotent)
    campaign_places_exists = bind.execute(text("SELECT to_regclass('public.campaign_places')")).scalar() is not None
    if not campaign_places_exists:
        op.create_table('campaign_places',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('campaign_id', sa.Integer(), nullable=False),
        sa.Column('place_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.ForeignKeyConstraint(['campaign_id'], ['campaigns.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['place_id'], ['places.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('campaign_id', 'place_id')
        )
        op.create_index(op.f('ix_campaign_places_id'), 'campaign_places', ['id'], unique=False)
        op.create_index(op.f('ix_campaign_places_campaign_id'), 'campaign_places', ['campaign_id'], unique=False)
        op.create_index(op.f('ix_campaign_places_place_id'), 'campaign_places', ['place_id'], unique=False)

    # Create campaign_services table (idempotent)
    campaign_services_exists = bind.execute(text("SELECT to_regclass('public.campaign_services')")).scalar() is not None
    if not campaign_services_exists:
        op.create_table('campaign_services',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('campaign_id', sa.Integer(), nullable=False),
        sa.Column('service_id', sa.Integer(), nullable=False),
        sa.Column('place_service_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.ForeignKeyConstraint(['campaign_id'], ['campaigns.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['place_service_id'], ['place_services.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['service_id'], ['services.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('campaign_id', 'service_id', 'place_service_id')
        )
        op.create_index(op.f('ix_campaign_services_id'), 'campaign_services', ['id'], unique=False)
        op.create_index(op.f('ix_campaign_services_campaign_id'), 'campaign_services', ['campaign_id'], unique=False)
        op.create_index(op.f('ix_campaign_services_service_id'), 'campaign_services', ['service_id'], unique=False)

    # Add check constraints (best-effort) only if table was created here
    if not campaigns_exists:
        try:
            op.create_check_constraint(
                'campaigns_campaign_type_check',
                'campaigns',
                "campaign_type IN ('price_reduction', 'rewards_increase', 'free_service')"
            )
        except Exception:
            pass
        try:
            op.create_check_constraint(
                'campaigns_discount_type_check',
                'campaigns',
                "discount_type IN ('percentage', 'fixed_amount')"
            )
        except Exception:
            pass
        try:
            op.create_check_constraint(
                'campaigns_free_service_type_check',
                'campaigns',
                "free_service_type IN ('specific_free', 'buy_x_get_y')"
            )
        except Exception:
            pass


def downgrade():
    # Drop check constraints
    op.drop_constraint('campaigns_free_service_type_check', 'campaigns', type_='check')
    op.drop_constraint('campaigns_discount_type_check', 'campaigns', type_='check')
    op.drop_constraint('campaigns_campaign_type_check', 'campaigns', type_='check')
    
    # Drop tables
    op.drop_index(op.f('ix_campaign_services_service_id'), table_name='campaign_services')
    op.drop_index(op.f('ix_campaign_services_campaign_id'), table_name='campaign_services')
    op.drop_index(op.f('ix_campaign_services_id'), table_name='campaign_services')
    op.drop_table('campaign_services')
    
    op.drop_index(op.f('ix_campaign_places_place_id'), table_name='campaign_places')
    op.drop_index(op.f('ix_campaign_places_campaign_id'), table_name='campaign_places')
    op.drop_index(op.f('ix_campaign_places_id'), table_name='campaign_places')
    op.drop_table('campaign_places')
    
    op.drop_index(op.f('ix_campaigns_is_active'), table_name='campaigns')
    op.drop_index(op.f('ix_campaigns_end_datetime'), table_name='campaigns')
    op.drop_index(op.f('ix_campaigns_start_datetime'), table_name='campaigns')
    op.drop_index(op.f('ix_campaigns_owner_id'), table_name='campaigns')
    op.drop_index(op.f('ix_campaigns_id'), table_name='campaigns')
    op.drop_table('campaigns')
