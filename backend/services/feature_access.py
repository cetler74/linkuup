from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func

from models.subscription import (
    UserPlaceSubscription,
    PlanFeature,
    Feature,
    SubscriptionStatusEnum,
)


async def has_feature(db: AsyncSession, user_id: int, place_id: int, feature_code: str) -> bool:
    sub_q = select(UserPlaceSubscription).where(
        and_(
            UserPlaceSubscription.user_id == user_id,
            UserPlaceSubscription.place_id == place_id,
            UserPlaceSubscription.status.in_([SubscriptionStatusEnum.TRIALING, SubscriptionStatusEnum.ACTIVE]),
        )
    )
    sub = (await db.execute(sub_q)).scalar_one_or_none()
    if not sub:
        return False

    pf_q = (
        select(PlanFeature, Feature)
        .join(Feature, PlanFeature.feature_id == Feature.id)
        .where(
            and_(
                PlanFeature.plan_id == sub.plan_id,
                Feature.code == feature_code,
            )
        )
    )
    row = (await db.execute(pf_q)).first()
    if not row:
        return False
    plan_feature: PlanFeature = row[0]
    return bool(plan_feature.enabled)


async def get_limit(db: AsyncSession, user_id: int, place_id: int, feature_code: str) -> Optional[int]:
    sub_q = select(UserPlaceSubscription).where(
        and_(
            UserPlaceSubscription.user_id == user_id,
            UserPlaceSubscription.place_id == place_id,
            UserPlaceSubscription.status.in_([SubscriptionStatusEnum.TRIALING, SubscriptionStatusEnum.ACTIVE]),
        )
    )
    sub = (await db.execute(sub_q)).scalar_one_or_none()
    if not sub:
        return None

    pf_q = (
        select(PlanFeature, Feature)
        .join(Feature, PlanFeature.feature_id == Feature.id)
        .where(
            and_(
                PlanFeature.plan_id == sub.plan_id,
                Feature.code == feature_code,
            )
        )
    )
    row = (await db.execute(pf_q)).first()
    if not row:
        return None
    plan_feature: PlanFeature = row[0]
    return plan_feature.limit_value


