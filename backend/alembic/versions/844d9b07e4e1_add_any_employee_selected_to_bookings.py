"""add_any_employee_selected_to_bookings

Revision ID: 844d9b07e4e1
Revises: 6ff826b41e80
Create Date: 2025-10-25 12:28:20.005422

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision: str = '844d9b07e4e1'
down_revision: Union[str, Sequence[str], None] = '6ff826b41e80'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add any_employee_selected column to bookings table
    bind = op.get_bind()
    exists = bind.execute(text("""
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='bookings' AND column_name='any_employee_selected'
    """)).first() is not None
    if not exists:
        op.add_column('bookings', sa.Column('any_employee_selected', sa.Boolean(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    # Remove any_employee_selected column from bookings table
    bind = op.get_bind()
    exists = bind.execute(text("""
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='bookings' AND column_name='any_employee_selected'
    """)).first() is not None
    if exists:
        op.drop_column('bookings', 'any_employee_selected')
