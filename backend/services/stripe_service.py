from typing import Optional, Tuple
import stripe
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from core.config import settings
from models.user import User
from models.billing import BillingCustomer, Subscription as BillingSubscription


def _init_stripe() -> None:
    if not settings.STRIPE_SECRET_KEY:
        raise RuntimeError("STRIPE_SECRET_KEY is not configured")
    stripe.api_key = settings.STRIPE_SECRET_KEY


def get_price_id_for_plan(plan_code: str) -> str:
    code = (plan_code or '').lower()
    if code == 'basic':
        if not settings.STRIPE_PRICE_BASIC:
            raise RuntimeError("STRIPE_PRICE_BASIC not configured")
        return settings.STRIPE_PRICE_BASIC
    if code == 'pro':
        if not settings.STRIPE_PRICE_PRO:
            raise RuntimeError("STRIPE_PRICE_PRO not configured")
        return settings.STRIPE_PRICE_PRO
    raise ValueError(f"Unknown plan_code: {plan_code}")


async def get_or_create_customer(db: AsyncSession, user: User) -> str:
    """Return Stripe customer id for user, creating if missing and persisting locally."""
    _init_stripe()

    result = await db.execute(select(BillingCustomer).where(BillingCustomer.user_id == user.id))
    billing_customer: Optional[BillingCustomer] = result.scalar_one_or_none()
    if billing_customer and billing_customer.stripe_customer_id:
        return billing_customer.stripe_customer_id

    # Create Stripe customer
    customer = stripe.Customer.create(
        email=user.email,
        metadata={
            "app_user_id": str(user.id),
        },
    )

    # Persist billing customer
    billing_customer = BillingCustomer(
        user_id=user.id,
        stripe_customer_id=customer["id"],
    )
    db.add(billing_customer)
    await db.commit()
    return customer["id"]


async def _get_billing_customer(db: AsyncSession, user_id: int) -> Optional[BillingCustomer]:
    result = await db.execute(select(BillingCustomer).where(BillingCustomer.user_id == user_id))
    return result.scalar_one_or_none()


async def create_subscription_and_get_client_secret(
    db: AsyncSession,
    user: User,
    plan_code: str,
) -> dict:
    """
    Create a Subscription in Stripe.
    - If user has no default payment method → start subscription-level trial (no card).
    - Otherwise → create with default_incomplete and return PaymentIntent client_secret.

    Returns dict: { clientSecret?: str | None, subscriptionId: str, trialStarted: bool }
    """
    _init_stripe()
    customer_id = await get_or_create_customer(db, user)
    price_id = get_price_id_for_plan(plan_code)

    billing_customer = await _get_billing_customer(db, user.id)
    has_default_pm = bool(getattr(billing_customer, "default_payment_method", None))

    if not has_default_pm:
        # Start a 14-day trial at subscription level, no immediate payment intent
        sub = stripe.Subscription.create(
            customer=customer_id,
            items=[{"price": price_id}],
            payment_behavior="allow_incomplete",
            trial_period_days=14,
        )
        # Persist local subscription and user trial window for immediate access
        try:
            # Upsert subscription row
            result = await db.execute(select(BillingSubscription).where(BillingSubscription.stripe_subscription_id == sub["id"]))
            existing = result.scalar_one_or_none()
            if not existing:
                rec = BillingSubscription(
                    user_id=user.id,
                    stripe_subscription_id=sub["id"],
                    plan_code=plan_code,
                    status="trialing",
                    active=True,
                )
                db.add(rec)
            else:
                existing.status = "trialing"
                existing.active = True
                existing.plan_code = plan_code
            # Also set user-level trial fields for gating
            from datetime import datetime, timezone, timedelta
            now = datetime.now(timezone.utc)
            user.trial_start = now
            user.trial_end = now + timedelta(days=14)
            user.trial_status = "active"
            await db.commit()
        except Exception:
            # Do not block on local persistence issues
            pass
        return {"clientSecret": None, "subscriptionId": sub["id"], "trialStarted": True}

    # Collect payment now using Payment Element
    sub = stripe.Subscription.create(
        customer=customer_id,
        items=[{"price": price_id}],
        payment_behavior="default_incomplete",
        expand=["latest_invoice.payment_intent"],
    )

    latest_invoice = sub.get("latest_invoice") or {}
    payment_intent = (
        latest_invoice.get("payment_intent") if isinstance(latest_invoice, dict) else None
    )
    client_secret = payment_intent.get("client_secret") if isinstance(payment_intent, dict) else None
    if not client_secret:
        # Fallback: treat as trial started if Stripe didn't create a PI
        return {"clientSecret": None, "subscriptionId": sub["id"], "trialStarted": True}
    return {"clientSecret": client_secret, "subscriptionId": sub["id"], "trialStarted": False}


def retry_invoice_get_client_secret(invoice_id: str) -> str:
    _init_stripe()
    invoice = stripe.Invoice.retrieve(invoice_id, expand=["payment_intent"])
    pi = invoice.get("payment_intent")
    if not isinstance(pi, dict) or not pi.get("client_secret"):
        raise RuntimeError("Failed to obtain client_secret for retry")
    return pi["client_secret"]


def create_billing_portal_session(customer_id: str, return_url: Optional[str] = None) -> str:
    _init_stripe()
    url = return_url or settings.APP_URL
    session = stripe.billing_portal.Session.create(customer=customer_id, return_url=url)
    return session.get("url")


def create_setup_intent(customer_id: str) -> str:
    _init_stripe()
    setup_intent = stripe.SetupIntent.create(customer=customer_id, usage="off_session")
    return setup_intent.get("client_secret")


def _get_subscription_item_id(sub: dict) -> Optional[str]:
    try:
        items = sub.get("items", {}).get("data", [])
        if items and isinstance(items, list) and isinstance(items[0], dict):
            return items[0].get("id")
    except Exception:
        return None
    return None


def change_subscription_price(stripe_subscription_id: str, new_price_id: str) -> dict:
    _init_stripe()
    # Retrieve current subscription to get item id
    current = stripe.Subscription.retrieve(stripe_subscription_id)
    item_id = _get_subscription_item_id(current)
    if not item_id:
        raise RuntimeError("Failed to resolve subscription item to change price")

    updated = stripe.Subscription.modify(
        stripe_subscription_id,
        items=[{
            'id': item_id,
            'price': new_price_id,
        }],
        proration_behavior='create_prorations',
        expand=["latest_invoice.payment_intent"],
    )
    return updated

