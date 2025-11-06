#!/usr/bin/env python3
"""Script to sync feature permissions for a user based on their subscription plan."""
import asyncio
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from models.user import User
from models.subscription import Plan
from models.billing import Subscription as BillingSubscription
from api.v1.subscriptions import _sync_user_feature_permissions_for_plan
from core.config import settings

async def sync_user_features(user_id: int):
    """Sync feature permissions for a user based on their active subscription."""
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        # Get user
        user_res = await db.execute(select(User).where(User.id == user_id))
        user = user_res.scalar_one_or_none()
        
        if not user:
            print(f'❌ User {user_id} not found')
            return
        
        # Get their active subscription
        sub_res = await db.execute(
            select(BillingSubscription).where(
                BillingSubscription.user_id == user_id,
                BillingSubscription.active == True
            ).order_by(BillingSubscription.created_at.desc())
        )
        sub = sub_res.scalar_one_or_none()
        
        if not sub or not sub.plan_code:
            print(f'❌ No active subscription found for user {user_id}')
            return
        
        print(f'🔍 Syncing features for user {user.email} (ID: {user.id}) with plan {sub.plan_code}')
        
        # Get plan
        plan_res = await db.execute(select(Plan).where(Plan.code == sub.plan_code, Plan.is_active == True))
        plan = plan_res.scalar_one_or_none()
        
        if not plan:
            print(f'❌ Plan {sub.plan_code} not found')
            return
        
        # Sync feature permissions
        await _sync_user_feature_permissions_for_plan(db, user.id, plan.id)
        await db.commit()
        print(f'✅ Successfully synced feature permissions for user {user.email} with plan {sub.plan_code}')

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('Usage: python sync_user_features.py <user_id>')
        sys.exit(1)
    
    user_id = int(sys.argv[1])
    asyncio.run(sync_user_features(user_id))

