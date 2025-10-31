#!/usr/bin/env python3
import asyncio
from typing import Dict

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from backend.core.config import settings
from backend.models.subscription import Plan, Feature, PlanFeature


FEATURES: Dict[str, Dict[str, str]] = {
    "booking": {"name": "Booking", "description": "Booking with email notifications"},
    "services": {"name": "Services", "description": "Manage services"},
    "employees": {"name": "Employees", "description": "Employee management (limit applies)"},
    "time_off": {"name": "Time-off", "description": "Employee time-off management"},
    "campaigns_email": {"name": "Email Campaigns", "description": "Create messaging campaigns for email"},
    "campaigns_sms": {"name": "SMS Campaigns", "description": "Create messaging campaigns for SMS"},
    "campaigns_whatsapp": {"name": "WhatsApp Campaigns", "description": "Create messaging campaigns for WhatsApp"},
    "promotions": {"name": "Promotions", "description": "Create new promotions"},
    "rewards": {"name": "Rewards", "description": "Loyalty rewards"},
}


async def upsert_feature(db: AsyncSession, code: str, name: str, description: str) -> int:
    result = await db.execute(
        Feature.__table__.select().where(Feature.code == code)
    )
    row = result.first()
    if row:
        return row[0]
    feature = Feature(code=code, name=name, description=description)
    db.add(feature)
    await db.flush()
    return feature.id


async def upsert_plan(db: AsyncSession, code: str, name: str, price_cents: int, trial_days: int) -> int:
    result = await db.execute(
        Plan.__table__.select().where(Plan.code == code)
    )
    row = result.first()
    if row:
        plan_id = row[0]
        await db.execute(
            Plan.__table__.update()
            .where(Plan.id == plan_id)
            .values(name=name, price_cents=price_cents, trial_days=trial_days, is_active=True)
        )
        return plan_id
    plan = Plan(code=code, name=name, price_cents=price_cents, trial_days=trial_days, is_active=True)
    db.add(plan)
    await db.flush()
    return plan.id


async def upsert_plan_feature(db: AsyncSession, plan_id: int, feature_id: int, enabled: bool, limit_value: int | None):
    result = await db.execute(
        PlanFeature.__table__.select().where(
            (PlanFeature.plan_id == plan_id) & (PlanFeature.feature_id == feature_id)
        )
    )
    row = result.first()
    if row:
        await db.execute(
            PlanFeature.__table__.update()
            .where(PlanFeature.id == row[0])
            .values(enabled=enabled, limit_value=limit_value)
        )
    else:
        db.add(PlanFeature(plan_id=plan_id, feature_id=feature_id, enabled=enabled, limit_value=limit_value))


async def seed():
    engine = create_async_engine(settings.DATABASE_URL, future=True)
    async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with async_session() as db:
        # Ensure features
        feature_ids: Dict[str, int] = {}
        for code, meta in FEATURES.items():
            feature_ids[code] = await upsert_feature(db, code, meta["name"], meta["description"])

        # Plans
        basic_id = await upsert_plan(db, "basic", "Basic", price_cents=0, trial_days=14)
        pro_id = await upsert_plan(db, "pro", "Pro", price_cents=0, trial_days=14)

        # Basic matrix
        await upsert_plan_feature(db, basic_id, feature_ids["booking"], True, None)
        await upsert_plan_feature(db, basic_id, feature_ids["services"], True, None)
        await upsert_plan_feature(db, basic_id, feature_ids["employees"], True, 2)
        await upsert_plan_feature(db, basic_id, feature_ids["time_off"], False, None)
        await upsert_plan_feature(db, basic_id, feature_ids["campaigns_email"], True, None)
        await upsert_plan_feature(db, basic_id, feature_ids["campaigns_sms"], False, None)
        await upsert_plan_feature(db, basic_id, feature_ids["campaigns_whatsapp"], False, None)
        await upsert_plan_feature(db, basic_id, feature_ids["promotions"], False, None)
        await upsert_plan_feature(db, basic_id, feature_ids["rewards"], False, None)

        # Pro matrix
        await upsert_plan_feature(db, pro_id, feature_ids["booking"], True, None)
        await upsert_plan_feature(db, pro_id, feature_ids["services"], True, None)
        await upsert_plan_feature(db, pro_id, feature_ids["employees"], True, 5)
        await upsert_plan_feature(db, pro_id, feature_ids["time_off"], True, None)
        await upsert_plan_feature(db, pro_id, feature_ids["campaigns_email"], True, None)
        await upsert_plan_feature(db, pro_id, feature_ids["campaigns_sms"], True, None)
        await upsert_plan_feature(db, pro_id, feature_ids["campaigns_whatsapp"], True, None)
        await upsert_plan_feature(db, pro_id, feature_ids["promotions"], True, None)
        await upsert_plan_feature(db, pro_id, feature_ids["rewards"], True, None)

        await db.commit()

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())


