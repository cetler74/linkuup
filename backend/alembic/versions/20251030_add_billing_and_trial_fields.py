"""
Add billing tables and trial fields on users

Revision ID: 20251030_add_billing_and_trial_fields
Revises: 
Create Date: 2025-10-30
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b1a5b0f0a51030aa12cd34ef567890ab'
down_revision = '98246a1b5af6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # users: trial fields
    op.add_column('users', sa.Column('trial_start', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('trial_end', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('trial_status', sa.String(length=20), nullable=True, server_default='active'))

    # billing_customers
    op.create_table(
        'billing_customers',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False, unique=True),
        sa.Column('stripe_customer_id', sa.String(length=100), nullable=False, unique=True),
        sa.Column('default_payment_method', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    )

    # subscriptions
    op.create_table(
        'subscriptions',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('stripe_subscription_id', sa.String(length=100), nullable=True, unique=True),
        sa.Column('plan_code', sa.String(length=20), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('current_period_start', sa.DateTime(timezone=True), nullable=True),
        sa.Column('current_period_end', sa.DateTime(timezone=True), nullable=True),
        sa.Column('cancel_at_period_end', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    )

    op.create_index('ix_subscriptions_user_id', 'subscriptions', ['user_id'])
    op.create_index('ix_subscriptions_status', 'subscriptions', ['status'])
    op.create_index('ix_subscriptions_plan', 'subscriptions', ['plan_code'])

    # invoices
    op.create_table(
        'invoices',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('stripe_invoice_id', sa.String(length=100), nullable=True, unique=True),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('amount_due', sa.Integer(), nullable=True),
        sa.Column('hosted_invoice_url', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    )

    op.create_index('ix_invoices_user_id', 'invoices', ['user_id'])
    op.create_index('ix_invoices_status', 'invoices', ['status'])


def downgrade() -> None:
    op.drop_index('ix_invoices_status', table_name='invoices')
    op.drop_index('ix_invoices_user_id', table_name='invoices')
    op.drop_table('invoices')

    op.drop_index('ix_subscriptions_plan', table_name='subscriptions')
    op.drop_index('ix_subscriptions_status', table_name='subscriptions')
    op.drop_index('ix_subscriptions_user_id', table_name='subscriptions')
    op.drop_table('subscriptions')

    op.drop_table('billing_customers')

    op.drop_column('users', 'trial_status')
    op.drop_column('users', 'trial_end')
    op.drop_column('users', 'trial_start')


