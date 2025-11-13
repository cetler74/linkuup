#!/usr/bin/env python3
"""Update Pro plan trial_days to 0"""
import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, update

from backend.core.config import settings
from backend.models.subscription import Plan


async def update_pro_trial_days():
    """Update Pro plan to have trial_days=0"""
    engine = create_async_engine(settings.DATABASE_URL, future=True)
    async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    
    async with async_session() as db:
        # Get Pro plan
        result = await db.execute(select(Plan).where(Plan.code == "pro"))
        pro_plan = result.scalar_one_or_none()
        
        if not pro_plan:
            print("❌ Pro plan not found in database")
            return
        
        print(f"📋 Current Pro plan: trial_days={pro_plan.trial_days}")
        
        if pro_plan.trial_days == 0:
            print("✅ Pro plan already has trial_days=0")
        else:
            # Update to 0
            pro_plan.trial_days = 0
            await db.commit()
            await db.refresh(pro_plan)
            print(f"✅ Updated Pro plan: trial_days={pro_plan.trial_days}")
        
        # Verify
        result = await db.execute(select(Plan).where(Plan.code == "pro"))
        pro_plan = result.scalar_one_or_none()
        print(f"✅ Verified: Pro plan trial_days={pro_plan.trial_days}")
    
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(update_pro_trial_days())

