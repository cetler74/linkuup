"""
Billing models for Stripe integration: customers, subscriptions, invoices.
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .base import Base


class BillingCustomer(Base):
    __tablename__ = 'billing_customers'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, unique=True)
    stripe_customer_id = Column(String(100), nullable=False, unique=True)
    default_payment_method = Column(String(100), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User")


class Subscription(Base):
    __tablename__ = 'subscriptions'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    stripe_subscription_id = Column(String(100), nullable=True, unique=True)
    plan_code = Column(String(20), nullable=False)  # 'basic' | 'pro'
    status = Column(String(20), nullable=True)  # trialing, active, incomplete, past_due, canceled, unpaid
    current_period_start = Column(DateTime(timezone=True), nullable=True)
    current_period_end = Column(DateTime(timezone=True), nullable=True)
    cancel_at_period_end = Column(Boolean, nullable=False, server_default='false')
    active = Column(Boolean, nullable=False, server_default='true')

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User")


class Invoice(Base):
    __tablename__ = 'invoices'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    stripe_invoice_id = Column(String(100), nullable=True, unique=True)
    status = Column(String(20), nullable=True)
    amount_due = Column(Integer, nullable=True)
    hosted_invoice_url = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User")


