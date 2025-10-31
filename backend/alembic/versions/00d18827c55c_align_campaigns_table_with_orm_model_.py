"""align campaigns table with ORM model (place_id, type, status, config, created_by)

Revision ID: 00d18827c55c
Revises: b4dbd27076f9
Create Date: 2025-10-30 16:13:09.969535

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision: str = '00d18827c55c'
down_revision: Union[str, Sequence[str], None] = 'b4dbd27076f9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add new ORM-aligned columns (idempotent)
    bind = op.get_bind()
    def col_exists(table: str, column: str) -> bool:
        return bind.execute(text(
            "SELECT 1 FROM information_schema.columns WHERE table_name=:t AND column_name=:c"
        ), {"t": table, "c": column}).first() is not None

    if not col_exists('campaigns', 'place_id'):
        op.add_column('campaigns', sa.Column('place_id', sa.Integer(), nullable=True))
    if not col_exists('campaigns', 'type'):
        op.add_column('campaigns', sa.Column('type', sa.String(length=50), nullable=True))
    if not col_exists('campaigns', 'status'):
        op.add_column('campaigns', sa.Column('status', sa.String(length=20), server_default='draft', nullable=True))
    if not col_exists('campaigns', 'config'):
        op.add_column('campaigns', sa.Column('config', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    if not col_exists('campaigns', 'automation_rules'):
        op.add_column('campaigns', sa.Column('automation_rules', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    if not col_exists('campaigns', 'created_by'):
        op.add_column('campaigns', sa.Column('created_by', sa.Integer(), nullable=True))

    # Add FKs where possible (left nullable to avoid failing on existing rows)
    try:
        op.create_foreign_key(None, 'campaigns', 'places', ['place_id'], ['id'])
    except Exception:
        pass
    try:
        op.create_foreign_key(None, 'campaigns', 'users', ['created_by'], ['id'])
    except Exception:
        pass

    # Drop strict legacy check constraint if it exists
    try:
        op.drop_constraint('campaigns_campaign_type_check', 'campaigns', type_='check')
    except Exception:
        # Constraint may not exist in some environments; ignore
        pass

    # Backfill simple fields from legacy columns
    # type <- campaign_type, created_by <- owner_id, status from is_active
    # Backfill values only if legacy columns exist
    legacy_cols = bind.execute(text(
        """
        SELECT column_name FROM information_schema.columns 
        WHERE table_name='campaigns' AND column_name IN ('campaign_type','owner_id','is_active')
        """
    )).fetchall()
    if legacy_cols and len(legacy_cols) >= 1:
        try:
            op.execute(
                """
                UPDATE campaigns
                SET type = COALESCE(type, campaign_type),
                    created_by = COALESCE(created_by, owner_id),
                    status = COALESCE(status, CASE WHEN is_active IS TRUE THEN 'active' ELSE 'draft' END)
                """
            )
        except Exception:
            pass

    # Backfill config JSONB from legacy scalar columns
    # Note: jsonb_build_object will include nulls for missing values
    # Only set config where it's currently null and legacy columns exist
    legacy_config_cols = bind.execute(text(
        """
        SELECT column_name FROM information_schema.columns 
        WHERE table_name='campaigns' AND column_name IN (
            'banner_message','start_datetime','end_datetime','is_active','discount_type','discount_value',
            'rewards_multiplier','rewards_bonus_points','free_service_type','buy_quantity','get_quantity'
        )
        """
    )).fetchall()
    if legacy_config_cols and len(legacy_config_cols) >= 1:
        try:
            op.execute(
                """
                UPDATE campaigns
                SET config = COALESCE(config, jsonb_build_object(
                    'banner_message', banner_message,
                    'start_datetime', to_char(start_datetime, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
                    'end_datetime', to_char(end_datetime, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
                    'is_active', is_active,
                    'discount_type', discount_type,
                    'discount_value', discount_value,
                    'rewards_multiplier', rewards_multiplier,
                    'rewards_bonus_points', rewards_bonus_points,
                    'free_service_type', free_service_type,
                    'buy_quantity', buy_quantity,
                    'get_quantity', get_quantity
                ))
                """
            )
        except Exception:
            pass

    # Optional: remove server_default now that data is populated
    try:
        op.alter_column('campaigns', 'status', server_default=None)
    except Exception:
        pass


def downgrade() -> None:
    """Downgrade schema."""
    # Recreate legacy check constraint (limited legacy types)
    try:
        op.create_check_constraint(
            'campaigns_campaign_type_check',
            'campaigns',
            "campaign_type IN ('price_reduction', 'rewards_increase', 'free_service')"
        )
    except Exception:
        pass

    # Drop FK constraints (names are autogenerated, dropping columns will drop them implicitly)
    # Drop columns added in upgrade
    for col in ['automation_rules', 'config', 'status', 'type', 'created_by', 'place_id']:
        try:
            op.drop_column('campaigns', col)
        except Exception:
            pass
