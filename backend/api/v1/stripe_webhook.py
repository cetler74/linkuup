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
    
    # Get trial period info from Stripe subscription
    trial_start = obj.get("trial_start")
    trial_end = obj.get("trial_end")

    # Upsert subscription record
    res = await db.execute(
        select(BillingSubscription).where(BillingSubscription.stripe_subscription_id == stripe_subscription_id)
    )
    sub = res.scalar_one_or_none()
    if not sub:
        # If new subscription, try to get plan_code from Stripe price ID
        plan_code = _extract_plan_code_from_stripe_subscription(obj)
        sub = BillingSubscription(
            user_id=user_id,
            stripe_subscription_id=stripe_subscription_id,
            status=status,
            plan_code=plan_code,
            active=status in ("trialing", "active"),
        )
        db.add(sub)
    else:
        sub.status = status
        sub.active = status in ("trialing", "active")
        # If plan_code wasn't set, try to extract it now
        if not sub.plan_code:
            plan_code = _extract_plan_code_from_stripe_subscription(obj)
            if plan_code:
                sub.plan_code = plan_code
    
    # Timestamps are epoch seconds per Stripe
    from datetime import datetime, timezone
    if current_period_start:
        sub.current_period_start = datetime.fromtimestamp(current_period_start, tz=timezone.utc)
    if current_period_end:
        sub.current_period_end = datetime.fromtimestamp(current_period_end, tz=timezone.utc)
    await db.commit()
    
    # Sync to UserPlaceSubscription records for feature gating
    if sub.plan_code and sub.active:
        await _sync_billing_to_place_subscriptions(db, user_id, sub.plan_code, status, 
                                                     current_period_start, current_period_end,
                                                     trial_start, trial_end)


async def _handle_subscription_deleted(db: AsyncSession, obj: dict) -> None:
    stripe_subscription_id = obj.get("id")
    res = await db.execute(select(BillingSubscription).where(BillingSubscription.stripe_subscription_id == stripe_subscription_id))
    sub = res.scalar_one_or_none()
    if sub:
        user_id = sub.user_id
        sub.status = "canceled"
        sub.active = False
        await db.commit()
        
        # Cancel UserPlaceSubscription records for this user
        await _cancel_place_subscriptions_for_user(db, user_id)


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


def _extract_plan_code_from_stripe_subscription(subscription_obj: dict) -> str | None:
    """Extract plan_code from Stripe subscription by matching price ID to configured prices."""
    try:
        items = subscription_obj.get("items", {}).get("data", [])
        if not items:
            return None
        
        price_id = items[0].get("price", {}).get("id")
        if not price_id:
            return None
        
        # Match price ID to plan code using configured Stripe prices
        from services import stripe_service
        from core.config import settings
        
        if price_id == settings.STRIPE_PRICE_BASIC:
            return "basic"
        elif price_id == settings.STRIPE_PRICE_PRO:
            return "pro"
        
        return None
    except Exception:
        return None


async def _sync_billing_to_place_subscriptions(
    db: AsyncSession,
    user_id: int,
    plan_code: str,
    status: str,
    current_period_start: int | None,
    current_period_end: int | None,
    trial_start: int | None,
    trial_end: int | None,
) -> None:
    """Sync BillingSubscription to UserPlaceSubscription records for all user places."""
    from models.subscription import Plan, UserPlaceSubscription, SubscriptionStatusEnum
    from models.place_existing import Place
    from datetime import datetime, timezone, timedelta
    
    # Get the plan
    plan_res = await db.execute(select(Plan).where(Plan.code == plan_code, Plan.is_active == True))
    plan = plan_res.scalar_one_or_none()
    if not plan:
        print(f"⚠️ Plan not found for code: {plan_code}")
        return
    
    # Get all active places for this user
    places_res = await db.execute(
        select(Place).where(Place.owner_id == user_id, Place.is_active == True)
    )
    places = places_res.scalars().all()
    
    if not places:
        print(f"⚠️ No places found for user {user_id}")
        return
    
    # Determine subscription status
    if status in ("trialing", "active"):
        sub_status = SubscriptionStatusEnum.TRIALING if status == "trialing" else SubscriptionStatusEnum.ACTIVE
    else:
        # Don't sync inactive subscriptions
        return
    
    # Convert timestamps
    now = datetime.now(timezone.utc)
    period_start = datetime.fromtimestamp(current_period_start, tz=timezone.utc) if current_period_start else now
    period_end = datetime.fromtimestamp(current_period_end, tz=timezone.utc) if current_period_end else (now + timedelta(days=30))
    
    trial_start_dt = None
    trial_end_dt = None
    if trial_start:
        trial_start_dt = datetime.fromtimestamp(trial_start, tz=timezone.utc)
    if trial_end:
        trial_end_dt = datetime.fromtimestamp(trial_end, tz=timezone.utc)
    
    # If no trial_end from Stripe but status is trialing, calculate from plan trial_days
    if status == "trialing" and not trial_end_dt:
        trial_end_dt = now + timedelta(days=plan.trial_days)
        if not trial_start_dt:
            trial_start_dt = now
    
    # Create/update UserPlaceSubscription for each place
    for place in places:
        # Check if subscription already exists
        sub_res = await db.execute(
            select(UserPlaceSubscription).where(
                UserPlaceSubscription.user_id == user_id,
                UserPlaceSubscription.place_id == place.id,
            )
        )
        place_sub = sub_res.scalar_one_or_none()
        
        if place_sub:
            # Update existing subscription
            place_sub.plan_id = plan.id
            place_sub.status = sub_status
            place_sub.current_period_start = period_start
            place_sub.current_period_end = period_end
            if trial_start_dt:
                place_sub.trial_start_at = trial_start_dt
            if trial_end_dt:
                place_sub.trial_end_at = trial_end_dt
        else:
            # Create new subscription
            place_sub = UserPlaceSubscription(
                user_id=user_id,
                place_id=place.id,
                plan_id=plan.id,
                status=sub_status,
                current_period_start=period_start,
                current_period_end=period_end,
                trial_start_at=trial_start_dt or now,
                trial_end_at=trial_end_dt or (now + timedelta(days=plan.trial_days)),
            )
            db.add(place_sub)
    
    await db.commit()
    
    # Sync user feature permissions
    try:
        from api.v1.subscriptions import _sync_user_feature_permissions_for_plan
        await _sync_user_feature_permissions_for_plan(db, user_id, plan.id)
        print(f"✅ Synced billing subscription to place subscriptions and permissions for user {user_id}")
    except Exception as e:
        print(f"⚠️ Error syncing feature permissions: {e}")


async def _cancel_place_subscriptions_for_user(db: AsyncSession, user_id: int) -> None:
    """Cancel all UserPlaceSubscription records for a user when billing subscription is canceled."""
    from models.subscription import UserPlaceSubscription, SubscriptionStatusEnum
    
    res = await db.execute(
        select(UserPlaceSubscription).where(
            UserPlaceSubscription.user_id == user_id,
            UserPlaceSubscription.status.in_([SubscriptionStatusEnum.TRIALING, SubscriptionStatusEnum.ACTIVE]),
        )
    )
    place_subs = res.scalars().all()
    
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    
    for place_sub in place_subs:
        place_sub.status = SubscriptionStatusEnum.CANCELED
        place_sub.canceled_at = now
    
    await db.commit()


