from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
import asyncio

from core.database import get_db
from core.dependencies import get_current_user
from models.user import User
from services import stripe_service
from pydantic import BaseModel
from sqlalchemy import select
from models.billing import Subscription as BillingSubscription


router = APIRouter()


class CreateSubscriptionRequest(BaseModel):
    planCode: str
class ChangePlanRequest(BaseModel):
    planCode: str

class CreateCheckoutSessionRequest(BaseModel):
    planCode: str
    registrationData: dict

class VerifyCheckoutSessionRequest(BaseModel):
    session_id: str


class SubscriptionResponse(BaseModel):
    subscriptionId: str | None = None
    status: str | None = None
    planCode: str | None = None



@router.post("/create-subscription")
async def create_subscription(req: CreateSubscriptionRequest, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        result = await stripe_service.create_subscription_and_get_client_secret(
            db=db,
            user=current_user,
            plan_code=req.planCode,
        )
        # result: { clientSecret?: str|None, subscriptionId: str, trialStarted: bool }
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/retry-invoice")
async def retry_invoice(invoiceId: str):
    try:
        client_secret = await asyncio.to_thread(stripe_service.retry_invoice_get_client_secret, invoiceId)
        return {"clientSecret": client_secret}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/subscription", response_model=SubscriptionResponse)
async def get_subscription(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        # Get all active subscriptions for the user
        res = await db.execute(
            select(BillingSubscription)
            .where(
                BillingSubscription.user_id == current_user.id, 
                BillingSubscription.active == True
            )
            .order_by(BillingSubscription.created_at.desc())  # Get most recent first
        )
        subs = res.scalars().all()
        
        if not subs:
            return SubscriptionResponse()
        
        # If multiple active subscriptions exist, use the most recent one
        # (Ideally, there should only be one active subscription per user)
        sub = subs[0]  # Most recent based on order_by
        
        # Log warning if multiple active subscriptions found
        if len(subs) > 1:
            print(f"⚠️ Warning: User {current_user.id} has {len(subs)} active subscriptions. Using most recent: {sub.stripe_subscription_id}")
        
        # Safely extract subscription data
        subscription_id = getattr(sub, 'stripe_subscription_id', None) or None
        status = getattr(sub, 'status', None) or None
        plan_code = getattr(sub, 'plan_code', None) or None
        
        return SubscriptionResponse(
            subscriptionId=subscription_id,
            status=status,
            planCode=plan_code
        )
    except Exception as e:
        # Log the error and return empty response instead of crashing
        import traceback
        print(f"⚠️ Error getting subscription for user {current_user.id}: {e}")
        print(f"⚠️ Traceback: {traceback.format_exc()}")
        # Return empty response instead of crashing - frontend should handle missing subscription gracefully
        return SubscriptionResponse()


@router.post("/change-plan")
async def change_plan(req: ChangePlanRequest, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Change plan - if upgrading to Pro (no trial), require payment first."""
    # Check if target plan requires payment (no trial)
    from models.subscription import Plan
    plan_result = await db.execute(select(Plan).where(Plan.code == req.planCode, Plan.is_active == True))
    target_plan = plan_result.scalar_one_or_none()
    
    if not target_plan:
        raise HTTPException(status_code=400, detail=f"Invalid plan code: {req.planCode}")
    
    # If target plan has no trial, require payment before upgrade
    plan_requires_payment = not target_plan.trial_days or target_plan.trial_days == 0
    
    if plan_requires_payment:
        # Create checkout session for upgrade
        try:
            result = await stripe_service.create_checkout_session_for_upgrade(
                user_id=current_user.id,
                user_email=current_user.email,
                plan_code=req.planCode,
                db=db
            )
            return {"checkoutUrl": result["url"], "requiresPayment": True}
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))
    
    # For plans with trial, proceed with upgrade
    res = await db.execute(select(BillingSubscription).where(BillingSubscription.user_id == current_user.id, BillingSubscription.active == True))
    sub: BillingSubscription | None = res.scalar_one_or_none()
    if not sub or not sub.stripe_subscription_id:
        raise HTTPException(status_code=400, detail="no_active_subscription")
    try:
        # Update price in Stripe
        new_price = stripe_service.get_price_id_for_plan(req.planCode)
        updated = await asyncio.to_thread(stripe_service.change_subscription_price, sub.stripe_subscription_id, new_price)
        # Optimistically update local plan_code; webhooks will sync definitive status
        sub.plan_code = req.planCode
        await db.commit()
        return {"status": "ok", "subscriptionId": updated.get("id"), "requiresPayment": False}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/portal-link")
async def portal_link(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    customer_id = await stripe_service.get_or_create_customer(db, current_user)
    try:
        url = await asyncio.to_thread(stripe_service.create_billing_portal_session, customer_id)
        return {"url": url}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/create-setup-intent")
async def create_setup_intent(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    customer_id = await stripe_service.get_or_create_customer(db, current_user)
    try:
        client_secret = await asyncio.to_thread(stripe_service.create_setup_intent, customer_id)
        return {"clientSecret": client_secret}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/create-checkout-session")
async def create_checkout_session(req: CreateCheckoutSessionRequest, db: AsyncSession = Depends(get_db)):
    """Create Stripe Checkout Session for Pro plan registration (account created after payment)."""
    try:
        # Validate request data
        if not req.planCode:
            raise HTTPException(status_code=400, detail="planCode is required")
        if not req.registrationData:
            raise HTTPException(status_code=400, detail="registrationData is required")
        if not req.registrationData.get("email"):
            raise HTTPException(status_code=400, detail="email is required in registrationData")
        
        result = await asyncio.to_thread(
            stripe_service.create_checkout_session_for_registration,
            plan_code=req.planCode,
            registration_data=req.registrationData
        )
        return {"checkoutUrl": result["url"]}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_detail = str(e)
        print(f"❌ Error creating checkout session: {error_detail}")
        print(f"❌ Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=400, detail=error_detail)


@router.post("/verify-checkout-session")
async def verify_checkout_session(req: VerifyCheckoutSessionRequest, db: AsyncSession = Depends(get_db)):
    """Verify checkout session and create user if payment was successful and user doesn't exist.
    This is a fallback mechanism in case webhooks fail or aren't configured.
    """
    import stripe
    from core.config import settings
    from api.v1.stripe_webhook import _create_user_from_registration_data, _ensure_subscription_and_features
    import json
    
    stripe.api_key = settings.STRIPE_SECRET_KEY
    
    try:
        session_id = req.session_id
        print(f"🔍 Verifying checkout session: {session_id}")
        
        # Retrieve checkout session from Stripe
        session = stripe.checkout.Session.retrieve(session_id)
        
        # Check if payment was successful
        payment_status = session.get("payment_status")
        if payment_status != "paid":
            return {"success": False, "message": f"Payment not completed. Status: {payment_status}"}
        
        # Check if this is a registration checkout
        metadata = session.get("metadata", {})
        create_account = metadata.get("create_account_after_payment") == "true"
        
        if not create_account:
            return {"success": False, "message": "Not a registration checkout"}
        
        # Get registration data
        registration_data_str = metadata.get("registration_data")
        if not registration_data_str:
            return {"success": False, "message": "No registration data found"}
        
        registration_data = json.loads(registration_data_str)
        email = registration_data.get("email")
        
        if not email:
            return {"success": False, "message": "No email in registration data"}
        
        # Check if user already exists
        from sqlalchemy import select
        from models.user import User
        user_res = await db.execute(select(User).where(User.email == email))
        existing_user = user_res.scalar_one_or_none()
        
        if existing_user:
            # User exists, ensure subscription is created
            subscription_id = session.get("subscription")
            plan_code = metadata.get("plan_code") or registration_data.get("selected_plan_code")
            
            if subscription_id:
                await _ensure_subscription_and_features(db, existing_user.id, subscription_id, plan_code)
            
            return {"success": True, "message": "User already exists", "user_id": existing_user.id}
        
        # User doesn't exist, create it
        subscription_id = session.get("subscription")
        plan_code = metadata.get("plan_code") or registration_data.get("selected_plan_code")
        
        print(f"✅ Payment successful, creating user account for {email}")
        await _create_user_from_registration_data(db, registration_data, subscription_id, plan_code)
        
        # Get the created user
        user_res = await db.execute(select(User).where(User.email == email))
        created_user = user_res.scalar_one_or_none()
        
        if created_user:
            return {"success": True, "message": "User created successfully", "user_id": created_user.id}
        else:
            return {"success": False, "message": "User creation failed"}
            
    except Exception as e:
        error_type = type(e).__name__
        error_msg = str(e)
        print(f"❌ Error verifying checkout session ({error_type}): {error_msg}")
        import traceback
        print(f"❌ Traceback: {traceback.format_exc()}")
        
        # Check if it's a Stripe error
        if hasattr(stripe, 'error') and isinstance(e, stripe.error.StripeError):
            return {"success": False, "message": f"Stripe error: {error_msg}"}
        else:
            return {"success": False, "message": f"Error: {error_msg}"}


@router.post("/sync-subscription")
async def sync_subscription(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Manually sync BillingSubscription to UserPlaceSubscription records for immediate feature access."""
    try:
        # Get active billing subscription
        res = await db.execute(
            select(BillingSubscription)
            .where(
                BillingSubscription.user_id == current_user.id,
                BillingSubscription.active == True
            )
            .order_by(BillingSubscription.created_at.desc())
        )
        sub = res.scalar_one_or_none()
        
        if not sub or not sub.plan_code:
            raise HTTPException(status_code=400, detail="No active subscription found or plan_code not set")
        
        # Get Stripe subscription to sync full details
        import stripe
        from core.config import settings
        stripe.api_key = settings.STRIPE_SECRET_KEY
        
        try:
            stripe_sub = stripe.Subscription.retrieve(sub.stripe_subscription_id)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to retrieve Stripe subscription: {e}")
        
        # Sync to place subscriptions
        await stripe_service.sync_subscription_to_places(
            db,
            current_user.id,
            sub.plan_code,
            stripe_sub,
            sub.status or "active",
        )
        
        return {"status": "ok", "message": "Subscription synced successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Sync failed: {str(e)}")


