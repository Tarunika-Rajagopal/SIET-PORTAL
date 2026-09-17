"""Add team number unique constraint

Revision ID: 62b0ce1a7e91
Revises: '51a9bd0d53cd'
Create Date: 2026-09-17 12:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '62b0ce1a7e91'
down_revision: Union[str, None] = '51a9bd0d53cd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('teams', schema=None) as batch_op:
        batch_op.create_unique_constraint('uq_batch_section_team_no', ['batch_id', 'section_id', 'team_no'])


def downgrade() -> None:
    with op.batch_alter_table('teams', schema=None) as batch_op:
        batch_op.drop_constraint('uq_batch_section_team_no', type_='unique')
