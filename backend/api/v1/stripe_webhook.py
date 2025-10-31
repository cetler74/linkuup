from fastapi import APIRouter, Request, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import stripe
import json

from core.config import settings
from core.database import get_db, AsyncSessionLocal
from models.billing import Subscription as BillingSubscription, Invoice as BillingInvoice, BillingCustomer
from models.user import User


router = APIRouter()


@router.post("/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    if not settings.STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=500, detail="Stripe webhook secret not configured")
    try:
        event = stripe.Webhook.construct_event(
            payload=payload,
            sig_header=sig_header,
            secret=settings.STRIPE_WEBHOOK_SECRET,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid webhook: {e}")

    event_type = event.get("type")
    data = event.get("data", {}).get("object", {})

    # Use independent DB session to avoid dependency stack in webhook thread
    async with AsyncSessionLocal() as db:
        if event_type in ("customer.subscription.created", "customer.subscription.updated"):
            await _handle_subscription_updated(db, data)
        elif event_type == "customer.subscription.deleted":
            await _handle_subscription_deleted(db, data)
        elif event_type == "invoice.payment_succeeded":
            await _handle_invoice_upsert(db, data)
        elif event_type == "invoice.payment_failed":
            await _handle_invoice_upsert(db, data)
        elif event_type in ("payment_intent.succeeded", "payment_intent.payment_failed"):
            # No-op: subscription handler covers status; keep for completeness
            pass
        elif event_type == "setup_intent.succeeded":
            await _handle_setup_intent(db, data)
        else:
            # Unhandled event types are acknowledged
            pass

    return {"received": True}


async def _lookup_user_id_by_customer(db: AsyncSession, customer_id: str) -> int | None:
    res = await db.execute(select(BillingCustomer).where(BillingCustomer.stripe_customer_id == customer_id))
    bc = res.scalar_one_or_none()
    return bc.user_id if bc else None


async def _handle_subscription_updated(db: AsyncSession, obj: dict) -> None:
    customer_id = obj.get("customer")
    user_id = await _lookup_user_id_by_customer(db, customer_id)
    if not user_id:
        return
    status = obj.get("status")
    current_period_start = obj.get("current_period_start")
    current_period_end = obj.get("current_period_end")
    stripe_subscription_id = obj.get("id")

    # Upsert subscription record
    res = await db.execute(
        select(BillingSubscription).where(BillingSubscription.stripe_subscription_id == stripe_subscription_id)
    )
    sub = res.scalar_one_or_none()
    if not sub:
        sub = BillingSubscription(
            user_id=user_id,
            stripe_subscription_id=stripe_subscription_id,
            status=status,
            active=status in ("trialing", "active"),
        )
        db.add(sub)
    else:
        sub.status = status
        sub.active = status in ("trialing", "active")
    # Timestamps are epoch seconds per Stripe
    from datetime import datetime, timezone
    if current_period_start:
        sub.current_period_start = datetime.fromtimestamp(current_period_start, tz=timezone.utc)
    if current_period_end:
        sub.current_period_end = datetime.fromtimestamp(current_period_end, tz=timezone.utc)
    await db.commit()


async def _handle_subscription_deleted(db: AsyncSession, obj: dict) -> None:
    stripe_subscription_id = obj.get("id")
    res = await db.execute(select(BillingSubscription).where(BillingSubscription.stripe_subscription_id == stripe_subscription_id))
    sub = res.scalar_one_or_none()
    if sub:
        sub.status = "canceled"
        sub.active = False
        await db.commit()


async def _handle_invoice_upsert(db: AsyncSession, obj: dict) -> None:
    customer_id = obj.get("customer")
    user_id = await _lookup_user_id_by_customer(db, customer_id)
    if not user_id:
        return
    stripe_invoice_id = obj.get("id")
    status = obj.get("status")
    amount_due = obj.get("amount_due")
    hosted_invoice_url = obj.get("hosted_invoice_url")

    res = await db.execute(select(BillingInvoice).where(BillingInvoice.stripe_invoice_id == stripe_invoice_id))
    inv = res.scalar_one_or_none()
    if not inv:
        inv = BillingInvoice(
            user_id=user_id,
            stripe_invoice_id=stripe_invoice_id,
            status=status,
            amount_due=amount_due,
            hosted_invoice_url=hosted_invoice_url,
        )
        db.add(inv)
    else:
        inv.status = status
        inv.amount_due = amount_due
        inv.hosted_invoice_url = hosted_invoice_url
    await db.commit()


async def _handle_setup_intent(db: AsyncSession, obj: dict) -> None:
    customer_id = obj.get("customer")
    pm = obj.get("payment_method")
    if not customer_id or not pm:
        return
    res = await db.execute(select(BillingCustomer).where(BillingCustomer.stripe_customer_id == customer_id))
    bc = res.scalar_one_or_none()
    if bc:
        bc.default_payment_method = pm
        await db.commit()


