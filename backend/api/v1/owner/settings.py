from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, text
from typing import Optional

from core.database import get_db
from core.dependencies import get_current_business_owner
from models.user import User
from models.customer_existing import PlaceFeatureSetting
from services.feature_access import has_feature
from models.rewards import RewardSetting
from schemas.settings import (
    PlaceFeatureSettingsResponse,
    PlaceFeatureSettingsUpdate,
    PlaceSettingsResponse
)
from schemas.rewards import (
    RewardSettingsResponse,
    RewardSettingsCreate,
    RewardSettingsUpdate
)

router = APIRouter()


@router.get("/places/{place_id}/settings", response_model=PlaceSettingsResponse)
async def get_place_settings(
    place_id: int,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Get all settings for a specific place"""
    
    # Verify place ownership
    from models.place_existing import Place
    place_result = await db.execute(
        select(Place).where(
            Place.id == place_id,
            Place.owner_id == current_user.id,
            Place.is_active == True
        )
    )
    place = place_result.scalar_one_or_none()
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")
    
    # Get feature settings
    feature_query = select(PlaceFeatureSetting).where(
        PlaceFeatureSetting.place_id == place_id
    )
    feature_result = await db.execute(feature_query)
    feature_settings = feature_result.scalar_one_or_none()
    
    if not feature_settings:
        # Create default feature settings
        feature_settings = PlaceFeatureSetting(
            place_id=place_id,
            bookings_enabled=True,
            rewards_enabled=False,
            time_off_enabled=True,
            campaigns_enabled=True,
            messaging_enabled=True,
            notifications_enabled=True
        )
        db.add(feature_settings)
        await db.commit()
        await db.refresh(feature_settings)
    
    # Get reward settings
    reward_query = select(RewardSetting).where(
        and_(
            RewardSetting.place_id == place_id,
            RewardSetting.is_active == True
        )
    )
    reward_result = await db.execute(reward_query)
    reward_settings = reward_result.scalar_one_or_none()
    
    return PlaceSettingsResponse(
        feature_settings=PlaceFeatureSettingsResponse(
            id=feature_settings.id,
            place_id=feature_settings.place_id,
            bookings_enabled=feature_settings.bookings_enabled,
            rewards_enabled=feature_settings.rewards_enabled,
            time_off_enabled=feature_settings.time_off_enabled,
            campaigns_enabled=feature_settings.campaigns_enabled,
            messaging_enabled=feature_settings.messaging_enabled,
            notifications_enabled=feature_settings.notifications_enabled,
            created_at=feature_settings.created_at,
            updated_at=feature_settings.updated_at
        ),
        reward_settings=RewardSettingsResponse(
            id=reward_settings.id,
            place_id=reward_settings.place_id,
            calculation_method=reward_settings.calculation_method,
            points_per_booking=reward_settings.points_per_booking,
            points_per_currency_unit=reward_settings.points_per_currency_unit,
            redemption_rules=reward_settings.redemption_rules,
            is_active=reward_settings.is_active,
            created_at=reward_settings.created_at,
            updated_at=reward_settings.updated_at
        ) if reward_settings else None
    )


@router.put("/places/{place_id}/settings/features", response_model=PlaceFeatureSettingsResponse)
async def update_feature_settings(
    place_id: int,
    settings_update: PlaceFeatureSettingsUpdate,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Update feature settings for a place"""
    
    # Get existing settings
    query = select(PlaceFeatureSetting).where(
        PlaceFeatureSetting.place_id == place_id
    )
    result = await db.execute(query)
    feature_settings = result.scalar_one_or_none()
    
    if not feature_settings:
        # Create new settings
        feature_settings = PlaceFeatureSetting(place_id=place_id)
        db.add(feature_settings)
    
    # Guard: Pro-only features require plan access before enabling
    if settings_update.rewards_enabled is True:
        has_rewards = await has_feature(db, current_user.id, place_id, "rewards")
        if not has_rewards:
            raise HTTPException(status_code=403, detail="feature_requires_pro: rewards")

    # Update settings
    if settings_update.bookings_enabled is not None:
        feature_settings.bookings_enabled = settings_update.bookings_enabled
    if settings_update.rewards_enabled is not None:
        feature_settings.rewards_enabled = settings_update.rewards_enabled
    if settings_update.time_off_enabled is not None:
        feature_settings.time_off_enabled = settings_update.time_off_enabled
    if settings_update.campaigns_enabled is not None:
        feature_settings.campaigns_enabled = settings_update.campaigns_enabled
    if settings_update.messaging_enabled is not None:
        feature_settings.messaging_enabled = settings_update.messaging_enabled
    if settings_update.notifications_enabled is not None:
        feature_settings.notifications_enabled = settings_update.notifications_enabled
    
    await db.commit()
    await db.refresh(feature_settings)
    
    return PlaceFeatureSettingsResponse(
        id=feature_settings.id,
        place_id=feature_settings.place_id,
        bookings_enabled=feature_settings.bookings_enabled,
        rewards_enabled=feature_settings.rewards_enabled,
        time_off_enabled=feature_settings.time_off_enabled,
        campaigns_enabled=feature_settings.campaigns_enabled,
        messaging_enabled=feature_settings.messaging_enabled,
        notifications_enabled=feature_settings.notifications_enabled,
        created_at=feature_settings.created_at,
        updated_at=feature_settings.updated_at
    )


@router.get("/places/{place_id}/reward-settings", response_model=Optional[RewardSettingsResponse])
async def get_reward_settings(
    place_id: int,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Get reward settings for a place"""
    
    # First try place-specific settings
    query = select(RewardSetting).where(
        and_(
            RewardSetting.place_id == place_id,
            RewardSetting.is_active == True
        )
    )
    result = await db.execute(query)
    reward_settings = result.scalar_one_or_none()
    
    if not reward_settings:
        # Try global settings
        global_query = select(RewardSetting).where(
            and_(
                RewardSetting.place_id.is_(None),
                RewardSetting.is_active == True
            )
        )
        global_result = await db.execute(global_query)
        reward_settings = global_result.scalar_one_or_none()
    
    if not reward_settings:
        return None
    
    return RewardSettingsResponse(
        id=reward_settings.id,
        place_id=reward_settings.place_id,
        calculation_method=reward_settings.calculation_method,
        points_per_booking=reward_settings.points_per_booking,
        points_per_currency_unit=reward_settings.points_per_currency_unit,
        redemption_rules=reward_settings.redemption_rules,
        is_active=reward_settings.is_active,
        created_at=reward_settings.created_at,
        updated_at=reward_settings.updated_at
    )


@router.put("/places/{place_id}/reward-settings", response_model=RewardSettingsResponse)
async def update_reward_settings(
    place_id: int,
    settings_update: RewardSettingsUpdate,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Update reward settings for a place"""
    
    # Get existing settings
    query = select(RewardSetting).where(
        and_(
            RewardSetting.place_id == place_id,
            RewardSetting.is_active == True
        )
    )
    result = await db.execute(query)
    reward_settings = result.scalar_one_or_none()
    
    if not reward_settings:
        # Create new settings
        reward_settings = RewardSetting(
            place_id=place_id,
            calculation_method="fixed_per_booking",
            points_per_booking=10,
            is_active=True
        )
        db.add(reward_settings)
    
    # Update settings
    if settings_update.calculation_method is not None:
        reward_settings.calculation_method = settings_update.calculation_method
    if settings_update.points_per_booking is not None:
        reward_settings.points_per_booking = settings_update.points_per_booking
    if settings_update.points_per_currency_unit is not None:
        reward_settings.points_per_currency_unit = settings_update.points_per_currency_unit
    if settings_update.redemption_rules is not None:
        reward_settings.redemption_rules = settings_update.redemption_rules
    if settings_update.is_active is not None:
        reward_settings.is_active = settings_update.is_active
    
    await db.commit()
    await db.refresh(reward_settings)
    
    return RewardSettingsResponse(
        id=reward_settings.id,
        place_id=reward_settings.place_id,
        calculation_method=reward_settings.calculation_method,
        points_per_booking=reward_settings.points_per_booking,
        points_per_currency_unit=reward_settings.points_per_currency_unit,
        redemption_rules=reward_settings.redemption_rules,
        is_active=reward_settings.is_active,
        created_at=reward_settings.created_at,
        updated_at=reward_settings.updated_at
    )


@router.post("/reward-settings/global", response_model=RewardSettingsResponse)
async def create_global_reward_settings(
    settings_create: RewardSettingsCreate,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Create global reward settings (applied to all places)"""
    
    # Check if global settings already exist
    query = select(RewardSetting).where(
        and_(
            RewardSetting.place_id.is_(None),
            RewardSetting.is_active == True
        )
    )
    result = await db.execute(query)
    existing_settings = result.scalar_one_or_none()
    
    if existing_settings:
        raise HTTPException(
            status_code=400,
            detail="Global reward settings already exist. Use update endpoint to modify them."
        )
    
    # Create global settings
    global_settings = RewardSetting(
        place_id=None,  # Global settings
        calculation_method=settings_create.calculation_method,
        points_per_booking=settings_create.points_per_booking,
        points_per_currency_unit=settings_create.points_per_currency_unit,
        redemption_rules=settings_create.redemption_rules,
        is_active=settings_create.is_active
    )
    
    db.add(global_settings)
    await db.commit()
    await db.refresh(global_settings)
    
    return RewardSettingsResponse(
        id=global_settings.id,
        place_id=global_settings.place_id,
        calculation_method=global_settings.calculation_method,
        points_per_booking=global_settings.points_per_booking,
        redemption_rules=global_settings.redemption_rules,
        is_active=global_settings.is_active,
        created_at=global_settings.created_at,
        updated_at=global_settings.updated_at
    )


@router.post("/subscriptions/dev-enable-promotions")
async def dev_enable_promotions(
    place_id: int,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Dev utility: enable promotions feature by creating a plan and active subscription.
    This seeds:
      - features: promotions
      - plans: Dev Plan (id=1001)
      - plan_features: enable promotions
      - user_place_subscriptions: ACTIVE for current user and given place_id
    """
    # Basic ownership check to avoid seeding for foreign places
    place_owner_q = text("SELECT owner_id FROM places WHERE id = :pid")
    owner_row = (await db.execute(place_owner_q, {"pid": place_id})).first()
    if not owner_row or owner_row[0] != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="not_owner_of_place")

    # Ensure feature exists
    await db.execute(
        text(
            """
            INSERT INTO features (code, name)
            VALUES ('promotions','Promotions')
            ON CONFLICT (code) DO NOTHING
            """
        )
    )

    # Ensure plan exists
    await db.execute(
        text(
            """
            INSERT INTO plans (id, name)
            VALUES (1001, 'Dev Plan')
            ON CONFLICT (id) DO NOTHING
            """
        )
    )

    # Enable feature on plan
    await db.execute(
        text(
            """
            INSERT INTO plan_features (plan_id, feature_id, enabled)
            SELECT 1001, f.id, TRUE
            FROM features f
            WHERE f.code = 'promotions'
            ON CONFLICT DO NOTHING
            """
        )
    )

    # Create active subscription for current user
    await db.execute(
        text(
            """
            INSERT INTO user_place_subscriptions (user_id, place_id, plan_id, status)
            VALUES (:uid, :pid, 1001, 'ACTIVE')
            ON CONFLICT DO NOTHING
            """
        ),
        {"uid": current_user.id, "pid": place_id}
    )

    await db.commit()
    return {"ok": True}
