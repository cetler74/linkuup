from typing import Optional, Tuple
import json
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

    # Get plan to determine trial_days
    from models.subscription import Plan
    plan_result = await db.execute(select(Plan).where(Plan.code == plan_code, Plan.is_active == True))
    plan = plan_result.scalar_one_or_none()
    trial_days = plan.trial_days if plan else 14
    
    # Only start trial if trial_days > 0 and no payment method
    # If trial_days = 0 (e.g., Pro plan), require payment immediately
    if not has_default_pm and trial_days > 0:
        # Start a trial at subscription level, no immediate payment intent
        sub = stripe.Subscription.create(
            customer=customer_id,
            items=[{"price": price_id}],
            payment_behavior="allow_incomplete",
            trial_period_days=trial_days,
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
            user.trial_end = now + timedelta(days=trial_days)
            user.trial_status = "active"
            await db.commit()
            
            # Sync to UserPlaceSubscription records for immediate feature access
            await sync_subscription_to_places(db, user.id, plan_code, sub, "trialing")
        except Exception as e:
            # Do not block on local persistence issues, but log for debugging
            print(f"⚠️ Error persisting subscription: {e}")
            import traceback
            traceback.print_exc()
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
    
    # Persist local subscription record
    try:
        result = await db.execute(select(BillingSubscription).where(BillingSubscription.stripe_subscription_id == sub["id"]))
        existing = result.scalar_one_or_none()
        if not existing:
            rec = BillingSubscription(
                user_id=user.id,
                stripe_subscription_id=sub["id"],
                plan_code=plan_code,
                status=sub.get("status", "incomplete"),
                active=False,  # Will be active after payment
            )
            db.add(rec)
            await db.commit()
    except Exception as e:
        print(f"⚠️ Error persisting subscription: {e}")
    
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


def create_checkout_session_for_registration(plan_code: str, registration_data: dict) -> dict:
    """
    Create Stripe Checkout Session for Pro plan registration.
    Account will be created after payment succeeds via webhook.
    """
    try:
        _init_stripe()
        from core.config import settings
        
        # Validate inputs
        if not plan_code:
            raise ValueError("plan_code is required")
        if not registration_data:
            raise ValueError("registration_data is required")
        if not registration_data.get("email"):
            raise ValueError("email is required in registration_data")
        
        # Validate APP_URL is set
        if not settings.APP_URL:
            raise RuntimeError("APP_URL is not configured")
        
        price_id = get_price_id_for_plan(plan_code)
        
        if not price_id:
            raise ValueError(f"Could not get price ID for plan_code: {plan_code}")
        
        # Create checkout session in subscription mode
        session = stripe.checkout.Session.create(
            mode="subscription",
            line_items=[{
                "price": price_id,
                "quantity": 1,
            }],
            success_url=f"{settings.APP_URL}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{settings.APP_URL}/register?canceled=true",
            metadata={
                "registration_data": json.dumps(registration_data),
                "plan_code": plan_code,
                "create_account_after_payment": "true",
            },
            customer_email=registration_data.get("email"),
            subscription_data={
                "metadata": {
                    "registration_data": json.dumps(registration_data),
                    "plan_code": plan_code,
                }
            }
        )
        
        if not session or not session.url:
            raise RuntimeError("Failed to create Stripe checkout session")
        
        return {"url": session.url, "session_id": session.id}
    except stripe.error.StripeError as e:
        error_msg = f"Stripe error: {str(e)}"
        print(f"❌ {error_msg}")
        raise RuntimeError(error_msg)
    except Exception as e:
        error_msg = f"Error creating checkout session: {str(e)}"
        print(f"❌ {error_msg}")
        raise


def _get_subscription_item_id(sub: dict) -> Optional[str]:
    try:
        items = sub.get("items", {}).get("data", [])
        if items and isinstance(items, list) and isinstance(items[0], dict):
            return items[0].get("id")
    except Exception:
        return None
    return None


async def create_checkout_session_for_upgrade(user_id: int, user_email: str, plan_code: str, db: AsyncSession) -> dict:
    """
    Create Stripe Checkout Session for plan upgrade.
    Used when upgrading to Pro plan (no trial) - payment required before upgrade.
    """
    _init_stripe()
    from core.config import settings
    from models.billing import BillingCustomer
    
    price_id = get_price_id_for_plan(plan_code)
    
    # Get or create Stripe customer
    result = await db.execute(select(BillingCustomer).where(BillingCustomer.user_id == user_id))
    billing_customer = result.scalar_one_or_none()
    
    customer_id = None
    if billing_customer and billing_customer.stripe_customer_id:
        customer_id = billing_customer.stripe_customer_id
    else:
        # Create Stripe customer
        customer = stripe.Customer.create(
            email=user_email,
            metadata={
                "app_user_id": str(user_id),
            },
        )
        customer_id = customer["id"]
        
        # Persist billing customer
        if not billing_customer:
            billing_customer = BillingCustomer(
                user_id=user_id,
                stripe_customer_id=customer_id,
            )
            db.add(billing_customer)
        else:
            billing_customer.stripe_customer_id = customer_id
        await db.commit()
    
    # Create checkout session in subscription mode for upgrade
    session = stripe.checkout.Session.create(
        mode="subscription",
        customer=customer_id,
        line_items=[{
            "price": price_id,
            "quantity": 1,
        }],
        success_url=f"{settings.APP_URL}/payment/success?upgrade=true&plan={plan_code}",
        cancel_url=f"{settings.APP_URL}/billing?canceled=true",
        metadata={
            "upgrade": "true",
            "user_id": str(user_id),
            "plan_code": plan_code,
        },
        subscription_data={
            "metadata": {
                "upgrade": "true",
                "user_id": str(user_id),
                "plan_code": plan_code,
            }
        }
    )
    
    return {"url": session.url, "session_id": session.id}


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


async def sync_subscription_to_places(
    db: AsyncSession,
    user_id: int,
    plan_code: str,
    stripe_subscription: dict,
    status: str,
) -> None:
    """Sync Stripe subscription to UserPlaceSubscription records for all user places."""
    from models.subscription import Plan, UserPlaceSubscription, SubscriptionStatusEnum
    from models.place_existing import Place
    from datetime import datetime, timezone, timedelta
    
    try:
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
            print(f"ℹ️ No places found for user {user_id}, will sync feature permissions only")
        
        # Determine subscription status
        if status in ("trialing", "active"):
            sub_status = SubscriptionStatusEnum.TRIALING if status == "trialing" else SubscriptionStatusEnum.ACTIVE
        else:
            return
        
        # Extract timestamps from Stripe subscription
        now = datetime.now(timezone.utc)
        current_period_start = stripe_subscription.get("current_period_start")
        current_period_end = stripe_subscription.get("current_period_end")
        trial_start = stripe_subscription.get("trial_start")
        trial_end = stripe_subscription.get("trial_end")
        
        period_start = datetime.fromtimestamp(current_period_start, tz=timezone.utc) if current_period_start else now
        period_end = datetime.fromtimestamp(current_period_end, tz=timezone.utc) if current_period_end else (now + timedelta(days=30))
        
        trial_start_dt = datetime.fromtimestamp(trial_start, tz=timezone.utc) if trial_start else now
        trial_end_dt = datetime.fromtimestamp(trial_end, tz=timezone.utc) if trial_end else (now + timedelta(days=plan.trial_days))
        
        # Create/update UserPlaceSubscription for each place (if places exist)
        if places:
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
                    place_sub.trial_start_at = trial_start_dt
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
                        trial_start_at=trial_start_dt,
                        trial_end_at=trial_end_dt,
                    )
                    db.add(place_sub)
            
            await db.commit()
            print(f"✅ Synced subscription to place subscriptions for user {user_id}")
        
        # Always sync user feature permissions (even if no places exist yet)
        try:
            from api.v1.subscriptions import _sync_user_feature_permissions_for_plan
            await _sync_user_feature_permissions_for_plan(db, user_id, plan.id)
            print(f"✅ Synced feature permissions for user {user_id} with plan {plan_code}")
        except Exception as e:
            print(f"⚠️ Error syncing feature permissions: {e}")
            import traceback
            print(f"⚠️ Traceback: {traceback.format_exc()}")
    except Exception as e:
        print(f"⚠️ Error syncing subscription to places: {e}")
        import traceback
        traceback.print_exc()

