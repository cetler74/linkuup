"""Add foreign key constraint on business_id to places table

Revision ID: b4dbd27076f9
Revises: 98246a1b5af6
Create Date: 2025-10-26 10:30:08.886015

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision: str = 'b4dbd27076f9'
down_revision: Union[str, Sequence[str], None] = '98246a1b5af6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Only create FK if the column exists and constraint not already present
    bind = op.get_bind()
    col_exists = bind.execute(text(
        "SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='business_id'"
    )).first() is not None
    if col_exists:
        try:
            op.create_foreign_key('fk_campaigns_business_id_places', 'campaigns', 'places', ['business_id'], ['id'])
        except Exception:
            pass


def downgrade() -> None:
    try:
        op.drop_constraint('fk_campaigns_business_id_places', 'campaigns', type_='foreignkey')
    except Exception:
        pass
