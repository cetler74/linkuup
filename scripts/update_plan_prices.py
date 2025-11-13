#!/usr/bin/env python3
"""Update plan prices in database"""
import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

from backend.core.config import settings
from backend.models.subscription import Plan


async def update_plan_prices():
    """Update plan prices to correct values"""
    engine = create_async_engine(settings.DATABASE_URL, future=True)
    async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    
    async with async_session() as db:
        # Update Basic plan
        basic_result = await db.execute(select(Plan).where(Plan.code == "basic"))
        basic_plan = basic_result.scalar_one_or_none()
        
        if basic_plan:
            print(f"📋 Current Basic plan: price_cents={basic_plan.price_cents}")
            if basic_plan.price_cents != 595:
                basic_plan.price_cents = 595
                await db.commit()
                print(f"✅ Updated Basic plan: price_cents=595 (5.95 EUR)")
            else:
                print(f"✅ Basic plan already has correct price")
        else:
            print("❌ Basic plan not found")
        
        # Update Pro plan
        pro_result = await db.execute(select(Plan).where(Plan.code == "pro"))
        pro_plan = pro_result.scalar_one_or_none()
        
        if pro_plan:
            print(f"📋 Current Pro plan: price_cents={pro_plan.price_cents}")
            if pro_plan.price_cents != 1095:
                pro_plan.price_cents = 1095
                await db.commit()
                print(f"✅ Updated Pro plan: price_cents=1095 (10.95 EUR)")
            else:
                print(f"✅ Pro plan already has correct price")
        else:
            print("❌ Pro plan not found")
        
        # Verify
        all_plans_result = await db.execute(select(Plan).where(Plan.is_active == True))
        all_plans = all_plans_result.scalars().all()
        print("\n📊 All active plans:")
        for plan in all_plans:
            print(f"  - {plan.code}: price_cents={plan.price_cents} ({plan.price_cents/100:.2f} EUR), trial_days={plan.trial_days}")
    
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(update_plan_prices())

