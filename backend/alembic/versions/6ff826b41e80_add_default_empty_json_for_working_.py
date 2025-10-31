"""Add default empty JSON for working_hours in places table

Revision ID: 6ff826b41e80
Revises: a912268897c5
Create Date: 2025-10-25 11:42:52.223812

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '6ff826b41e80'
down_revision: Union[str, Sequence[str], None] = 'a912268897c5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("UPDATE places SET working_hours = '{}' WHERE working_hours IS NULL")
    op.alter_column('places', 'working_hours',
               existing_type=postgresql.JSON(astext_type=sa.Text()),
               nullable=False,
               comment=None,
               existing_comment='JSON object storing working hours for each day of the week')


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column('places', 'working_hours',
               existing_type=postgresql.JSON(astext_type=sa.Text()),
               nullable=True,
               comment='JSON object storing working hours for each day of the week')
