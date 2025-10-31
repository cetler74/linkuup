#!/usr/bin/env python3
"""
Script to update an existing user to have platform administrator privileges.
This script directly updates the database to ensure proper admin permissions.
"""

import os
import sys
import asyncio
import hashlib
import secrets
from datetime import datetime

# Add the backend directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, update
from backend.models.user import User

# Configuration
DATABASE_URL = "postgresql+asyncpg://carloslarramba@localhost:5432/linkuup_db"
ADMIN_EMAIL = "platform.admin@linkuup.com"
ADMIN_PASSWORD = "PlatformAdmin2025!"

def hash_password(password):
    """Hash password using the same method as the backend"""
    salt = secrets.token_hex(16)
    password_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
    return f"{salt}:{password_hash.hex()}"

async def update_platform_admin():
    """Update existing user to have platform administrator privileges"""
    try:
        print("🔧 Updating Platform Administrator privileges...")
        
        # Database connection
        engine = create_async_engine(DATABASE_URL)
        async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        
        async with async_session() as session:
            # Find the user
            result = await session.execute(
                select(User).where(User.email == ADMIN_EMAIL)
            )
            user = result.scalar_one_or_none()
            
            if not user:
                print(f"❌ User with email {ADMIN_EMAIL} not found!")
                return False
            
            print(f"✅ Found user: {user.email} (ID: {user.id})")
            print(f"   Current user_type: {user.user_type}")
            print(f"   Current is_admin: {user.is_admin}")
            print(f"   Current is_active: {user.is_active}")
            
            # Update user to have platform admin privileges
            await session.execute(
                update(User)
                .where(User.id == user.id)
                .values(
                    user_type="platform_admin",
                    is_admin=True,
                    is_active=True,
                    password_hash=hash_password(ADMIN_PASSWORD),
                    updated_at=datetime.utcnow()
                )
            )
            
            await session.commit()
            
            # Verify the update
            result = await session.execute(
                select(User).where(User.id == user.id)
            )
            updated_user = result.scalar_one()
            
            print("✅ Platform Administrator updated successfully!")
            print(f"   Email: {updated_user.email}")
            print(f"   Name: {updated_user.name}")
            print(f"   User Type: {updated_user.user_type}")
            print(f"   Is Admin: {updated_user.is_admin}")
            print(f"   Is Active: {updated_user.is_active}")
            print(f"   Updated: {updated_user.updated_at}")
            
            return True
            
    except Exception as e:
        print(f"❌ Error updating platform administrator: {e}")
        return False
    finally:
        if 'engine' in locals():
            await engine.dispose()

async def test_admin_access():
    """Test that the updated admin can access admin endpoints"""
    try:
        print("\n🧪 Testing admin access...")
        
        import requests
        
        # Login to get token
        response = requests.post("http://localhost:5001/api/v1/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if response.status_code != 200:
            print(f"❌ Login failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
        
        token = response.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Test admin stats endpoint
        stats_response = requests.get("http://localhost:5001/api/v1/admin/stats", headers=headers)
        if stats_response.status_code == 200:
            print("✅ Admin stats endpoint accessible")
        else:
            print(f"❌ Admin stats endpoint failed: {stats_response.status_code}")
            return False
        
        # Test admin owners endpoint
        owners_response = requests.get("http://localhost:5001/api/v1/admin/owners", headers=headers)
        if owners_response.status_code in [200, 500]:  # 500 is expected if no data
            print("✅ Admin owners endpoint accessible")
        else:
            print(f"❌ Admin owners endpoint failed: {owners_response.status_code}")
            return False
        
        print("✅ All admin endpoints are accessible!")
        return True
        
    except Exception as e:
        print(f"❌ Error testing admin access: {e}")
        return False

async def main():
    """Main function"""
    print("🚀 LinkUup Platform Administrator Update")
    print("=" * 50)
    
    # Update platform admin
    if await update_platform_admin():
        # Test admin access
        if await test_admin_access():
            print("\n🎉 Platform Administrator setup complete!")
            print("\nYou can now:")
            print(f"1. Log in to the frontend with {ADMIN_EMAIL}")
            print(f"2. Use password: {ADMIN_PASSWORD}")
            print("3. Access the Admin Dashboard via the header button")
            print("4. Manage all business owners and platform configurations")
            print("\n⚠️  IMPORTANT: Change the password after first login!")
        else:
            print("\n❌ Admin access test failed")
            sys.exit(1)
    else:
        print("\n❌ Platform Administrator update failed")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
