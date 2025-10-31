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
    res = await db.execute(select(BillingSubscription).where(BillingSubscription.user_id == current_user.id, BillingSubscription.active == True))
    sub: BillingSubscription | None = res.scalar_one_or_none()
    if not sub:
        return SubscriptionResponse()
    return SubscriptionResponse(subscriptionId=sub.stripe_subscription_id, status=sub.status, planCode=sub.plan_code)


@router.post("/change-plan")
async def change_plan(req: ChangePlanRequest, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Find active subscription for user
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
        return {"status": "ok", "subscriptionId": updated.get("id")}
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


