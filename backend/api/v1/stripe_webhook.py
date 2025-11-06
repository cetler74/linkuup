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
        print(f"❌ Webhook signature verification failed: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid webhook: {e}")

    event_type = event.get("type")
    data = event.get("data", {}).get("object", {})
    
    print(f"📥 Received Stripe webhook: {event_type}")
    print(f"📦 Event ID: {event.get('id')}")

    # Use independent DB session to avoid dependency stack in webhook thread
    async with AsyncSessionLocal() as db:
        if event_type == "checkout.session.completed":
            await _handle_checkout_session_completed(db, data)
        elif event_type in ("customer.subscription.created", "customer.subscription.updated"):
            await _handle_subscription_updated(db, data)
        elif event_type == "customer.subscription.deleted":
            await _handle_subscription_deleted(db, data)
        elif event_type == "invoice.payment_succeeded":
            await _handle_invoice_payment_succeeded(db, data)
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


async def _handle_checkout_session_completed(db: AsyncSession, obj: dict) -> None:
    """Handle checkout.session.completed - create user account if registration data exists."""
    print(f"🔍 Processing checkout.session.completed: session_id={obj.get('id')}")
    metadata = obj.get("metadata", {})
    create_account = metadata.get("create_account_after_payment") == "true"
    
    print(f"🔍 create_account_after_payment: {create_account}")
    print(f"🔍 Metadata keys: {list(metadata.keys())}")
    
    if not create_account:
        print("ℹ️ Not a registration checkout, skipping account creation")
        return  # Not a registration checkout
    
    registration_data_str = metadata.get("registration_data")
    if not registration_data_str:
        print("⚠️ No registration data found in checkout session metadata")
        return
    
    try:
        import json
        registration_data = json.loads(registration_data_str)
        print(f"✅ Parsed registration data for email: {registration_data.get('email')}")
    except Exception as e:
        print(f"⚠️ Failed to parse registration data: {e}")
        return
    
    # Get plan_code from metadata
    plan_code = metadata.get("plan_code") or registration_data.get("selected_plan_code")
    print(f"🔍 Plan code from metadata: {plan_code}")
    
    # Check if invoice is paid before creating account
    subscription_id = obj.get("subscription")
    payment_status = obj.get("payment_status")
    
    print(f"🔍 Subscription ID: {subscription_id}, Payment Status: {payment_status}")
    
    if subscription_id:
        import stripe
        from core.config import settings
        stripe.api_key = settings.STRIPE_SECRET_KEY
        
        try:
            subscription = stripe.Subscription.retrieve(subscription_id)
            latest_invoice_id = subscription.get("latest_invoice")
            print(f"🔍 Latest invoice ID: {latest_invoice_id}")
            
            if latest_invoice_id:
                invoice = stripe.Invoice.retrieve(latest_invoice_id)
                invoice_paid = invoice.get("paid")
                invoice_status = invoice.get("status")
                print(f"🔍 Invoice paid: {invoice_paid}, status: {invoice_status}")
                
                if invoice_paid and invoice_status == "paid":
                    # Invoice is paid, create account with subscription
                    print(f"✅ Invoice is paid, creating user account for {registration_data.get('email')}")
                    await _create_user_from_registration_data(db, registration_data, subscription_id, plan_code)
                else:
                    print(f"⚠️ Invoice not paid yet for subscription {subscription_id}, waiting for invoice.payment_succeeded")
                    # Also check payment_status from checkout session
                    if payment_status == "paid":
                        print(f"✅ Payment status is paid, creating user account for {registration_data.get('email')}")
                        await _create_user_from_registration_data(db, registration_data, subscription_id, plan_code)
        except Exception as e:
            print(f"⚠️ Error checking invoice status: {e}")
            import traceback
            print(f"⚠️ Traceback: {traceback.format_exc()}")
    elif payment_status == "paid":
        # If no subscription but payment is paid, create account anyway
        print(f"✅ Payment status is paid (no subscription), creating user account for {registration_data.get('email')}")
        await _create_user_from_registration_data(db, registration_data, None, plan_code)


async def _handle_invoice_payment_succeeded(db: AsyncSession, obj: dict) -> None:
    """Handle invoice.payment_succeeded - create account if registration pending, or handle upgrade."""
    print(f"🔍 Processing invoice.payment_succeeded: invoice_id={obj.get('id')}")
    customer_id = obj.get("customer")
    subscription_id = obj.get("subscription")
    
    print(f"🔍 Customer ID: {customer_id}, Subscription ID: {subscription_id}")
    
    # Check if subscription has registration metadata (new registration)
    if subscription_id:
        import stripe
        from core.config import settings
        stripe.api_key = settings.STRIPE_SECRET_KEY
        
        try:
            subscription = stripe.Subscription.retrieve(subscription_id)
            subscription_metadata = subscription.get("metadata", {})
            registration_data_str = subscription_metadata.get("registration_data")
            is_upgrade = subscription_metadata.get("upgrade") == "true"
            
            print(f"🔍 Subscription metadata keys: {list(subscription_metadata.keys())}")
            print(f"🔍 Has registration_data: {bool(registration_data_str)}, is_upgrade: {is_upgrade}")
            
            # Handle new registration
            if registration_data_str:
                import json
                registration_data = json.loads(registration_data_str)
                email = registration_data.get("email")
                print(f"✅ Found registration data for email: {email}")
                
                if email:
                    # Check if user already exists
                    user_res = await db.execute(select(User).where(User.email == email))
                    existing_user = user_res.scalar_one_or_none()
                    
                    if not existing_user:
                        # Get plan_code from subscription metadata
                        plan_code = subscription_metadata.get("plan_code")
                        # Create user account now that payment is confirmed
                        print(f"✅ Creating user account for {email} after invoice payment succeeded")
                        await _create_user_from_registration_data(db, registration_data, subscription_id, plan_code)
                    else:
                        print(f"ℹ️ User {email} already exists, ensuring subscription and features")
                        # Ensure subscription is created and features are synced
                        plan_code = subscription_metadata.get("plan_code")
                        await _ensure_subscription_and_features(db, existing_user.id, subscription_id, plan_code)
            
            # Handle upgrade - ensure subscription is active
            elif is_upgrade:
                user_id_str = subscription_metadata.get("user_id")
                plan_code = subscription_metadata.get("plan_code")
                
                if user_id_str and plan_code:
                    user_id = int(user_id_str)
                    # Update subscription status to active
                    from models.billing import Subscription as BillingSubscription
                    sub_res = await db.execute(
                        select(BillingSubscription).where(BillingSubscription.user_id == user_id)
                    )
                    billing_sub = sub_res.scalar_one_or_none()
                    
                    if billing_sub:
                        billing_sub.plan_code = plan_code
                        billing_sub.status = "active"
                        billing_sub.active = True
                        await db.commit()
                        print(f"✅ Upgraded user {user_id} to {plan_code} plan after payment")
                        
                        # Sync to place subscriptions
                        await stripe_service.sync_subscription_to_places(
                            db,
                            user_id,
                            plan_code,
                            subscription,
                            "active"
                        )
        except Exception as e:
            print(f"⚠️ Error processing registration/upgrade in invoice.payment_succeeded: {e}")
    
    # Also handle invoice upsert
    await _handle_invoice_upsert(db, obj)


async def _create_user_from_registration_data(db: AsyncSession, registration_data: dict, subscription_id: str | None = None, plan_code: str | None = None) -> None:
    """Create user account from registration data after payment is confirmed.
    
    Args:
        db: Database session
        registration_data: User registration data
        subscription_id: Stripe subscription ID (if available)
        plan_code: Plan code (basic/pro) from checkout session metadata
    """
    from core.security import get_password_hash
    from datetime import datetime, timezone
    from models.user import User
    
    email = registration_data.get("email")
    if not email:
        print("⚠️ No email in registration data")
        return
    
    print(f"🔍 Creating user account for email: {email}, plan: {plan_code}")
    
    # Check if user already exists
    user_res = await db.execute(select(User).where(User.email == email))
    existing_user = user_res.scalar_one_or_none()
    
    if existing_user:
        print(f"ℹ️ User {email} already exists (ID: {existing_user.id}), skipping account creation")
        # Still need to create subscription if it doesn't exist
        if subscription_id:
            await _ensure_subscription_and_features(db, existing_user.id, subscription_id, plan_code)
        return
    
    try:
        # Create user
        user = User(
            email=email,
            password_hash=get_password_hash(registration_data.get("password", "")),
            name=f"{registration_data.get('first_name', '')} {registration_data.get('last_name', '')}".strip(),
            first_name=registration_data.get("first_name"),
            last_name=registration_data.get("last_name"),
            user_type=registration_data.get("user_type", "business_owner"),
            is_active=True,
            is_admin=False,
            is_owner=registration_data.get("user_type") == "business_owner",
            is_business_owner=registration_data.get("user_type") == "business_owner",
            gdpr_data_processing_consent=registration_data.get("gdpr_data_processing_consent", False),
            gdpr_data_processing_consent_date=datetime.now() if registration_data.get("gdpr_data_processing_consent") else None,
            gdpr_marketing_consent=registration_data.get("gdpr_marketing_consent", False),
            gdpr_marketing_consent_date=datetime.now() if registration_data.get("gdpr_marketing_consent") else None,
            gdpr_consent_version="1.0"
        )
        
        print(f"🔍 Adding user to database: {email}")
        db.add(user)
        await db.flush()  # Flush to get the user ID
        
        print(f"🔍 Committing user to database: {email}")
        await db.commit()
        await db.refresh(user)
        
        print(f"✅ Successfully created user account for {email} (ID: {user.id})")
    except Exception as e:
        print(f"❌ Error creating user account for {email}: {e}")
        import traceback
        print(f"❌ Traceback: {traceback.format_exc()}")
        await db.rollback()
        raise
    
    # Link Stripe customer to user and create subscription
    if subscription_id:
        await _ensure_subscription_and_features(db, user.id, subscription_id, plan_code)


async def _ensure_subscription_and_features(db: AsyncSession, user_id: int, subscription_id: str, plan_code: str | None = None) -> None:
    """Ensure subscription is created and features are synced for the user.
    
    Args:
        db: Database session
        user_id: User ID
        subscription_id: Stripe subscription ID
        plan_code: Plan code (basic/pro) - if None, will be extracted from subscription
    """
    import stripe
    from core.config import settings
    from models.billing import BillingCustomer, Subscription as BillingSubscription
    from datetime import datetime, timezone
    
    stripe.api_key = settings.STRIPE_SECRET_KEY
    
    try:
        print(f"🔍 Ensuring subscription and features for user {user_id}, subscription {subscription_id}")
        
        # Retrieve subscription from Stripe
        subscription = stripe.Subscription.retrieve(subscription_id)
        customer_id = subscription.get("customer")
        status = subscription.get("status")
        current_period_start = subscription.get("current_period_start")
        current_period_end = subscription.get("current_period_end")
        trial_start = subscription.get("trial_start")
        trial_end = subscription.get("trial_end")
        
        print(f"🔍 Subscription status: {status}, customer: {customer_id}")
        
        # Link Stripe customer to user
        if customer_id:
            bc_res = await db.execute(select(BillingCustomer).where(BillingCustomer.stripe_customer_id == customer_id))
            bc = bc_res.scalar_one_or_none()
            
            if not bc:
                bc = BillingCustomer(
                    user_id=user_id,
                    stripe_customer_id=customer_id,
                )
                db.add(bc)
                await db.commit()
                print(f"✅ Linked Stripe customer {customer_id} to user {user_id}")
            else:
                print(f"ℹ️ Stripe customer {customer_id} already linked to user {bc.user_id}")
        
        # Extract plan_code if not provided
        if not plan_code:
            plan_code = _extract_plan_code_from_stripe_subscription(subscription)
            # Also check subscription metadata
            subscription_metadata = subscription.get("metadata", {})
            if not plan_code:
                plan_code = subscription_metadata.get("plan_code")
        
        print(f"🔍 Plan code: {plan_code}")
        
        if not plan_code:
            print("⚠️ Could not determine plan_code, cannot create subscription")
            return
        
        # Create or update BillingSubscription
        sub_res = await db.execute(
            select(BillingSubscription).where(BillingSubscription.stripe_subscription_id == subscription_id)
        )
        billing_sub = sub_res.scalar_one_or_none()
        
        if not billing_sub:
            billing_sub = BillingSubscription(
                user_id=user_id,
                stripe_subscription_id=subscription_id,
                status=status,
                plan_code=plan_code,
                active=status in ("trialing", "active"),
            )
            db.add(billing_sub)
            print(f"✅ Creating BillingSubscription for user {user_id} with plan {plan_code}")
        else:
            billing_sub.status = status
            billing_sub.plan_code = plan_code
            billing_sub.active = status in ("trialing", "active")
            print(f"✅ Updating BillingSubscription for user {user_id} with plan {plan_code}")
        
        # Set timestamps
        if current_period_start:
            billing_sub.current_period_start = datetime.fromtimestamp(current_period_start, tz=timezone.utc)
        if current_period_end:
            billing_sub.current_period_end = datetime.fromtimestamp(current_period_end, tz=timezone.utc)
        
        await db.commit()
        print(f"✅ BillingSubscription saved for user {user_id}")
        
        # Sync subscription to place subscriptions (enables features)
        if billing_sub.plan_code and billing_sub.active:
            print(f"🔍 Syncing subscription to place subscriptions for user {user_id} with plan {plan_code}")
            await _sync_billing_to_place_subscriptions(
                db,
                user_id,
                plan_code,
                status,
                current_period_start,
                current_period_end,
                trial_start,
                trial_end
            )
            print(f"✅ Features synced for user {user_id} with plan {plan_code}")
        
    except Exception as e:
        print(f"❌ Error ensuring subscription and features: {e}")
        import traceback
        print(f"❌ Traceback: {traceback.format_exc()}")
        await db.rollback()
        raise


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
        print(f"ℹ️ No places found for user {user_id}, will sync feature permissions only")
    
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
        print(f"✅ Synced billing subscription to place subscriptions for user {user_id}")
    
    # Always sync user feature permissions (even if no places exist yet)
    try:
        from api.v1.subscriptions import _sync_user_feature_permissions_for_plan
        await _sync_user_feature_permissions_for_plan(db, user_id, plan.id)
        print(f"✅ Synced feature permissions for user {user_id} with plan {plan_code}")
    except Exception as e:
        print(f"⚠️ Error syncing feature permissions: {e}")
        import traceback
        print(f"⚠️ Traceback: {traceback.format_exc()}")


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


