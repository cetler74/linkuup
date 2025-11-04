"""merge multiple heads

Revision ID: 59fcebf36ca2
Revises: 06924d3be302, b1a5b0f0a51030aa12cd34ef567890ab
Create Date: 2025-11-01 21:02:16.818770

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '59fcebf36ca2'
down_revision: Union[str, Sequence[str], None] = ('06924d3be302', 'b1a5b0f0a51030aa12cd34ef567890ab')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
