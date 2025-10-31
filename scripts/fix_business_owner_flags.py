#!/usr/bin/env python3
"""
Script to fix is_business_owner flag for existing users.
This ensures users with user_type='business_owner' have the is_business_owner flag set.
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent / 'backend'))

from sqlalchemy import select, update
from core.database import AsyncSessionLocal
from models.user import User

async def fix_business_owner_flags():
    """Update is_business_owner flag for users with user_type='business_owner'"""
    
    async with AsyncSessionLocal() as db:
        try:
            # Find all users with user_type='business_owner' but is_business_owner != True
            result = await db.execute(
                select(User).where(
                    User.user_type == 'business_owner',
                    (User.is_business_owner == False) | (User.is_business_owner == None)
                )
            )
            users_to_update = result.scalars().all()
            
            if not users_to_update:
                print("✅ No users need updating. All business owners have correct flags.")
                return
            
            print(f"Found {len(users_to_update)} business owner user(s) that need updating:")
            
            for user in users_to_update:
                print(f"  - {user.email} (ID: {user.id})")
                user.is_business_owner = True
                user.is_owner = True  # Also set is_owner for consistency
            
            await db.commit()
            print(f"\n✅ Successfully updated {len(users_to_update)} user(s)")
            
            # Verify the updates
            verify_result = await db.execute(
                select(User).where(User.user_type == 'business_owner')
            )
            all_owners = verify_result.scalars().all()
            
            print(f"\nVerification - All business owners:")
            for user in all_owners:
                print(f"  - {user.email}: is_business_owner={user.is_business_owner}, is_owner={user.is_owner}, user_type={user.user_type}")
            
        except Exception as e:
            print(f"❌ Error: {e}")
            await db.rollback()
            raise

if __name__ == "__main__":
    print("🔧 Fixing business owner flags in database...")
    asyncio.run(fix_business_owner_flags())
    print("✅ Done!")

