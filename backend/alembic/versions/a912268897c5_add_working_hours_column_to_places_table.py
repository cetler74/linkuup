"""Add working_hours column to places table

Revision ID: a912268897c5
Revises: 
Create Date: 2025-10-25 11:03:51.701847

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a912268897c5'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add working_hours column to places table (idempotent if column already exists)
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name='places' AND column_name='working_hours'
            ) THEN
                ALTER TABLE places ADD COLUMN working_hours JSON;
            END IF;
        EXCEPTION
            WHEN duplicate_column THEN
                -- Column already exists; ignore
                NULL;
        END$$;
        """
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Remove working_hours column if it exists
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name='places' AND column_name='working_hours'
            ) THEN
                ALTER TABLE places DROP COLUMN working_hours;
            END IF;
        END$$;
        """
    )
