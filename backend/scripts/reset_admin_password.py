#!/usr/bin/env python3
"""
Script to reset admin user password and fix login issues.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select
from core.config import settings
from core.security import get_password_hash
from models.user import User
import asyncio

async def reset_admin_password(email: str, new_password: str):
    """Reset password for admin user"""
    # Create async engine
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        try:
            # Find user
            result = await db.execute(select(User).where(User.email == email))
            user = result.scalar_one_or_none()
            
            if not user:
                print(f"❌ User with email {email} not found")
                return False
            
            # Update password
            user.password_hash = get_password_hash(new_password)
            user.is_active = True  # Ensure user is active
            
            # Ensure user has admin privileges
            if email in ["admin@linkuup.com", "platform.admin@linkuup.com"]:
                user.user_type = "platform_admin"
                user.is_admin = True
            
            await db.commit()
            await db.refresh(user)
            
            print(f"✅ Password reset successful for {email}")
            print(f"   User Type: {user.user_type}")
            print(f"   Is Admin: {user.is_admin}")
            print(f"   Is Active: {user.is_active}")
            return True
            
        except Exception as e:
            print(f"❌ Error resetting password: {e}")
            await db.rollback()
            return False
        finally:
            await engine.dispose()

async def check_all_admins():
    """Check all platform admin users"""
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        try:
            result = await db.execute(
                select(User).where(
                    (User.user_type == "platform_admin") | (User.is_admin == True)
                )
            )
            admins = result.scalars().all()
            
            print(f"\nFound {len(admins)} platform administrator(s):\n")
            for admin in admins:
                print(f"  Email: {admin.email}")
                print(f"  Name: {admin.name}")
                print(f"  User Type: {admin.user_type}")
                print(f"  Is Admin: {admin.is_admin}")
                print(f"  Is Active: {admin.is_active}")
                print()
                
        except Exception as e:
            print(f"❌ Error checking admins: {e}")
        finally:
            await engine.dispose()

async def main():
    if len(sys.argv) > 1 and sys.argv[1] == "check":
        await check_all_admins()
    elif len(sys.argv) >= 3:
        email = sys.argv[1]
        new_password = sys.argv[2]
        await reset_admin_password(email, new_password)
    else:
        print("Usage:")
        print("  python3 reset_admin_password.py check")
        print("  python3 reset_admin_password.py <email> <new_password>")
        print("\nExample:")
        print("  python3 reset_admin_password.py admin@linkuup.com admin123")

if __name__ == "__main__":
    asyncio.run(main())

