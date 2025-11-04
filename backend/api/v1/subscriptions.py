from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from sqlalchemy.orm import aliased
from typing import Optional, List
from datetime import datetime, timezone
from datetime import timedelta
import logging

from core.database import get_db
from core.dependencies import get_current_user
from models.user import User
from models.subscription import Plan, Feature, PlanFeature, UserPlaceSubscription, SubscriptionStatusEnum
from models.customer_existing import PlaceFeatureSetting
from models.user_feature_permissions import UserFeaturePermission
from models.place_existing import PlaceEmployee
from schemas.subscriptions import (
    PlansResponse,
    PlanResponse,
    FeatureResponse,
    PlanFeatureResponse,
    SubscriptionStatusResponse,
    StartTrialRequest,
    ChangePlanRequest,
    CancelRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter()


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


async def _sync_user_feature_permissions_for_plan(db: AsyncSession, user_id: int, plan_id: int):
    """Upsert user_feature_permissions according to plan_features for the selected plan.
    We map plan feature codes to user-level permission names.
    """
    # Get plan feature matrix
    pf_result = await db.execute(
        select(PlanFeature, Feature)
        .join(Feature, PlanFeature.feature_id == Feature.id)
        .where(PlanFeature.plan_id == plan_id)
    )
    rows = pf_result.all()
    enabled_codes = {feat.code for pf, feat in rows if pf.enabled}

    # Map plan feature codes to user permission flags
    should_enable = {
        'bookings': True,  # bookings basic always true
        'notifications': True,  # notifications basic always true
        'rewards': 'rewards' in enabled_codes,
        'campaigns': any(code in enabled_codes for code in (
            'campaigns_email', 'campaigns_sms', 'campaigns_whatsapp'
        )),
        # messaging: if SMS/WhatsApp campaigns present, allow messaging UI
        'messaging': any(code in enabled_codes for code in ('campaigns_sms', 'campaigns_whatsapp')),
        'time_off': 'time_off' in enabled_codes,
    }

    # Upsert each permission (except time_off)
    for feature_name, is_enabled in should_enable.items():
        query = select(UserFeaturePermission).where(
            UserFeaturePermission.user_id == user_id,
            UserFeaturePermission.feature_name == feature_name
        )
        result = await db.execute(query)
        perm = result.scalar_one_or_none()
        if perm:
            perm.is_enabled = bool(is_enabled)
        else:
            db.add(UserFeaturePermission(user_id=user_id, feature_name=feature_name, is_enabled=bool(is_enabled)))
    await db.commit()


@router.get("/plans", response_model=PlansResponse)
async def list_plans(
    db: AsyncSession = Depends(get_db)
):
    plans_result = await db.execute(select(Plan).where(Plan.is_active == True))
    plans: List[Plan] = plans_result.scalars().all()

    responses: List[PlanResponse] = []
    for plan in plans:
        # Fetch plan features join features
        pf_result = await db.execute(
            select(PlanFeature, Feature)
            .join(Feature, PlanFeature.feature_id == Feature.id)
            .where(PlanFeature.plan_id == plan.id)
        )
        items = pf_result.all()
        features_res: List[PlanFeatureResponse] = []
        for pf, feat in items:
            features_res.append(PlanFeatureResponse(
                feature=FeatureResponse(id=feat.id, code=feat.code, name=feat.name, description=feat.description),
                enabled=pf.enabled,
                limit_value=pf.limit_value,
            ))
        responses.append(PlanResponse(
            id=plan.id,
            code=plan.code,
            name=plan.name,
            price_cents=plan.price_cents,
            currency=plan.currency,
            trial_days=plan.trial_days,
            features=features_res,
        ))
    return PlansResponse(plans=responses)


@router.get("/status", response_model=SubscriptionStatusResponse)
async def get_subscription_status(
    place_id: int = Query(..., description="Place ID to check status for"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        # Outer join to avoid errors when no plan/subscription exists
        sub_plan_result = await db.execute(
            select(UserPlaceSubscription, Plan)
            .join(Plan, UserPlaceSubscription.plan_id == Plan.id, isouter=True)
            .where(
                and_(
                    UserPlaceSubscription.user_id == current_user.id,
                    UserPlaceSubscription.place_id == place_id,
                )
            )
            .order_by(UserPlaceSubscription.created_at.desc())
        )
        row = sub_plan_result.first()
        if not row:
            return SubscriptionStatusResponse(
                place_id=place_id,
                status=SubscriptionStatusEnum.NONE.value,
                trial_days_remaining=None,
            )

        sub: UserPlaceSubscription = row[0]
        plan: Optional[Plan] = row[1]

        trial_days_remaining: Optional[int] = None
        if sub.trial_end_at:
            now = _now_utc()
            delta = sub.trial_end_at - now
            trial_days_remaining = max(0, delta.days)

        return SubscriptionStatusResponse(
            place_id=place_id,
            plan_code=plan.code if plan else None,
            plan_name=plan.name if plan else None,
            status=sub.status.value,
            trial_end_at=sub.trial_end_at,
            trial_days_remaining=trial_days_remaining,
        )
    except Exception:
        # Gracefully return NONE to avoid breaking UI if any unexpected error occurs
        return SubscriptionStatusResponse(
            place_id=place_id,
            status=SubscriptionStatusEnum.NONE.value,
            trial_days_remaining=None,
        )


@router.post("/start-trial")
async def start_trial(
    body: StartTrialRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Resolve plan
    plan_res = await db.execute(select(Plan).where(Plan.code == body.plan_code, Plan.is_active == True))
    plan = plan_res.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=400, detail="Invalid plan_code")

    # Check existing active/trialing subscription for this user/place
    existing_res = await db.execute(
        select(UserPlaceSubscription)
        .where(
            and_(
                UserPlaceSubscription.user_id == current_user.id,
                UserPlaceSubscription.place_id == body.place_id,
                UserPlaceSubscription.status.in_([SubscriptionStatusEnum.TRIALING, SubscriptionStatusEnum.ACTIVE])
            )
        )
    )
    existing = existing_res.scalar_one_or_none()
    now = _now_utc()
    if existing:
        # Idempotent: if already on same plan and trialing/active, return success
        return {"status": "ok", "message": "Subscription already active or trialing"}

    # Create new trial subscription
    from datetime import timedelta
    trial_end = now + timedelta(days=plan.trial_days)

    sub = UserPlaceSubscription(
        user_id=current_user.id,
        place_id=body.place_id,
        plan_id=plan.id,
        status=SubscriptionStatusEnum.TRIALING,
        trial_start_at=now,
        trial_end_at=trial_end,
        current_period_start=now,
        current_period_end=trial_end,
    )
    db.add(sub)
    await db.commit()
    return {"status": "ok"}


@router.post("/change-plan")
async def change_plan(
    body: ChangePlanRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    plan_res = await db.execute(select(Plan).where(Plan.code == body.plan_code, Plan.is_active == True))
    plan = plan_res.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=400, detail="Invalid plan_code")

    sub_res = await db.execute(
        select(UserPlaceSubscription)
        .where(
            and_(
                UserPlaceSubscription.user_id == current_user.id,
                UserPlaceSubscription.place_id == body.place_id,
                UserPlaceSubscription.status.in_([SubscriptionStatusEnum.TRIALING, SubscriptionStatusEnum.ACTIVE])
            )
        )
    )
    sub = sub_res.scalar_one_or_none()
    if not sub:
        # No existing subscription: create one and start trial immediately
        now = _now_utc()
        trial_end = now + timedelta(days=plan.trial_days)
        new_sub = UserPlaceSubscription(
            user_id=current_user.id,
            place_id=body.place_id,
            plan_id=plan.id,
            status=SubscriptionStatusEnum.TRIALING,
            trial_start_at=now,
            trial_end_at=trial_end,
            current_period_start=now,
            current_period_end=trial_end,
        )
        db.add(new_sub)
        await db.commit()
        # Sync user-level permissions to reflect new plan
        await _sync_user_feature_permissions_for_plan(db, current_user.id, plan.id)
        # Optionally enable a requested feature after upgrade/trial creation
        if body.feature_to_enable:
            # Ensure PlaceFeatureSetting exists
            fs_res = await db.execute(select(PlaceFeatureSetting).where(PlaceFeatureSetting.place_id == body.place_id))
            fs = fs_res.scalar_one_or_none()
            if not fs:
                fs = PlaceFeatureSetting(place_id=body.place_id)
                db.add(fs)
            
            # Enable the requested feature based on feature_to_enable value
            if body.feature_to_enable == 'rewards':
                fs.rewards_enabled = True
            elif body.feature_to_enable == 'time_off':
                fs.time_off_enabled = True
            elif body.feature_to_enable == 'campaigns':
                fs.campaigns_enabled = True
            elif body.feature_to_enable == 'messaging':
                fs.messaging_enabled = True
            await db.commit()
        return {"status": "ok", "message": "Subscription created and trial started"}

    # Downgrade checks: enforce employees limit if applicable for target plan
    pf_res = await db.execute(
        select(PlanFeature, Feature)
        .join(Feature, PlanFeature.feature_id == Feature.id)
        .where(and_(PlanFeature.plan_id == plan.id, Feature.code == 'employees'))
    )
    row = pf_res.first()
    if row:
        pf: PlanFeature = row[0]
        if pf.enabled and pf.limit_value is not None:
            # Count only active employees for limit validation
            count_res = await db.execute(
                select(func.count(PlaceEmployee.id)).where(
                    PlaceEmployee.place_id == body.place_id,
                    PlaceEmployee.is_active == True
                )
            )
            current_count = count_res.scalar() or 0
            if current_count > pf.limit_value:
                raise HTTPException(
                    status_code=400,
                    detail=f"over_limit: employees current={current_count} limit={pf.limit_value}"
                )
    sub.plan_id = plan.id
    await db.commit()

    # Sync user-level permissions to reflect new plan
    await _sync_user_feature_permissions_for_plan(db, current_user.id, plan.id)

    # If a specific feature should be enabled post-change and allowed by plan
    if body.feature_to_enable:
        # Ensure PlaceFeatureSetting exists
        fs_res = await db.execute(select(PlaceFeatureSetting).where(PlaceFeatureSetting.place_id == body.place_id))
        fs = fs_res.scalar_one_or_none()
        if not fs:
            fs = PlaceFeatureSetting(place_id=body.place_id)
            db.add(fs)
        
        # Enable the requested feature based on feature_to_enable value
        if body.feature_to_enable == 'rewards':
            fs.rewards_enabled = True
        elif body.feature_to_enable == 'time_off':
            fs.time_off_enabled = True
        elif body.feature_to_enable == 'campaigns':
            fs.campaigns_enabled = True
        elif body.feature_to_enable == 'messaging':
            fs.messaging_enabled = True
        await db.commit()

    return {"status": "ok"}


@router.post("/cancel")
async def cancel_subscription(
    body: CancelRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    sub_res = await db.execute(
        select(UserPlaceSubscription)
        .where(
            and_(
                UserPlaceSubscription.user_id == current_user.id,
                UserPlaceSubscription.place_id == body.place_id,
                UserPlaceSubscription.status.in_([SubscriptionStatusEnum.TRIALING, SubscriptionStatusEnum.ACTIVE])
            )
        )
    )
    sub = sub_res.scalar_one_or_none()
    if not sub:
        return {"status": "ok"}

    sub.status = SubscriptionStatusEnum.CANCELED
    sub.canceled_at = _now_utc()
    await db.commit()
    return {"status": "ok"}
