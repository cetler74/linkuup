"""merge campaign tables

Revision ID: 98246a1b5af6
Revises: 6ed573de3564, 20241220_add_campaigns_tables
Create Date: 2025-10-25 20:35:01.245568

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '98246a1b5af6'
down_revision: Union[str, Sequence[str], None] = ('6ed573de3564', '20241220_add_campaigns_tables')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
