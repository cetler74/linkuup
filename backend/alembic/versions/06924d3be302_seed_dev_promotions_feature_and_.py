"""seed dev promotions feature and subscription (user 8, place 2)

Revision ID: 06924d3be302
Revises: 00d18827c55c
Create Date: 2025-10-30 17:18:25.269659

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision: str = '06924d3be302'
down_revision: Union[str, Sequence[str], None] = '00d18827c55c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Seed dev data for promotions feature and subscription."""
    bind = op.get_bind()

    # Ensure feature exists
    bind.execute(text(
        """
        INSERT INTO features (code, name)
        VALUES ('promotions','Promotions')
        ON CONFLICT (code) DO NOTHING
        """
    ))

    # Ensure plan exists (include non-null 'code')
    bind.execute(text(
        """
        INSERT INTO plans (id, code, name, price_cents, currency, trial_days, is_active)
        VALUES (1001, 'dev', 'Dev Plan', 0, 'EUR', 14, TRUE)
        ON CONFLICT (id) DO NOTHING
        """
    ))

    # Enable feature on plan
    bind.execute(text(
        """
        INSERT INTO plan_features (plan_id, feature_id, enabled)
        SELECT 1001, f.id, TRUE
        FROM features f
        WHERE f.code = 'promotions'
        ON CONFLICT DO NOTHING
        """
    ))

    # Active subscription for user 8 / place 2
    bind.execute(text(
        """
        INSERT INTO user_place_subscriptions (user_id, place_id, plan_id, status)
        VALUES (8, 2, 1001, 'ACTIVE')
        ON CONFLICT DO NOTHING
        """
    ))


def downgrade() -> None:
    """Remove seeded dev data (best-effort)."""
    bind = op.get_bind()
    # Remove subscription
    bind.execute(text("DELETE FROM user_place_subscriptions WHERE user_id=8 AND place_id=2 AND plan_id=1001"))
    # Keep plan/feature to avoid breaking other dev data
