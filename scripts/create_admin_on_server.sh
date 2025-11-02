#!/bin/bash

# Create admin user script - to be run on the server
# This creates the Python script and runs it

cat > ~/Linkuup/backend/create_admin_user.py << 'EOF'
#!/usr/bin/env python3
"""
Script to create an administrator user for LinkUup.
Run this on the server to create an admin account.
"""
import asyncio
import sys
import os
from datetime import datetime

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from core.database import Base
from core.config import settings
from core.security import get_password_hash
from models.user import User

async def create_admin_user(
    email: str,
    password: str,
    name: str,
    first_name: str = None,
    last_name: str = None
):
    """Create an administrator user"""
    
    print(f"🚀 Creating administrator user: {email}")
    
    try:
        # Create async engine
        engine = create_async_engine(
            settings.DATABASE_URL,
            echo=False,
            future=True,
        )
        
        # Create session
        async_session = sessionmaker(
            engine, class_=AsyncSession, expire_on_commit=False
        )
        
        async with async_session() as session:
            # Check if user already exists
            result = await session.execute(
                select(User).where(User.email == email)
            )
            existing_user = result.scalar_one_or_none()
            
            if existing_user:
                print(f"⚠️  User with email {email} already exists!")
                print(f"   Updating existing user to admin...")
                
                # Update existing user to admin
                existing_user.is_admin = True
                existing_user.user_type = "platform_admin"
                existing_user.password_hash = get_password_hash(password)
                if name:
                    existing_user.name = name
                if first_name:
                    existing_user.first_name = first_name
                if last_name:
                    existing_user.last_name = last_name
                existing_user.is_active = True
                existing_user.updated_at = datetime.now()
                
                await session.commit()
                await session.refresh(existing_user)
                
                print(f"✅ Updated user {email} to administrator")
                print(f"   User ID: {existing_user.id}")
                print(f"   Name: {existing_user.name}")
                print(f"   is_admin: {existing_user.is_admin}")
                print(f"   user_type: {existing_user.user_type}")
            else:
                # Create new admin user
                password_hash = get_password_hash(password)
                
                admin_user = User(
                    email=email,
                    password_hash=password_hash,
                    name=name or email.split('@')[0],
                    first_name=first_name or name.split()[0] if name and ' ' in name else None,
                    last_name=last_name or name.split()[-1] if name and ' ' in name else None,
                    user_type="platform_admin",
                    is_admin=True,
                    is_active=True,
                    is_business_owner=False,
                    is_owner=False,
                    gdpr_data_processing_consent=True,
                    gdpr_data_processing_consent_date=datetime.now(),
                    gdpr_marketing_consent=False,
                    gdpr_consent_version="1.0",
                )
                
                session.add(admin_user)
                await session.commit()
                await session.refresh(admin_user)
                
                print(f"✅ Administrator user created successfully!")
                print(f"   User ID: {admin_user.id}")
                print(f"   Email: {admin_user.email}")
                print(f"   Name: {admin_user.name}")
                print(f"   is_admin: {admin_user.is_admin}")
                print(f"   user_type: {admin_user.user_type}")
        
        await engine.dispose()
        
    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python3 create_admin_user.py <email> <password> <name> [first_name] [last_name]")
        print("\nExample:")
        print("  python3 create_admin_user.py admin@linkuup.com 'SecurePassword123' 'Admin User'")
        sys.exit(1)
    
    email = sys.argv[1]
    password = sys.argv[2]
    name = sys.argv[3]
    first_name = sys.argv[4] if len(sys.argv) > 4 else None
    last_name = sys.argv[5] if len(sys.argv) > 5 else None
    
    asyncio.run(create_admin_user(email, password, name, first_name, last_name))
EOF

chmod +x ~/Linkuup/backend/create_admin_user.py
echo "Script created successfully!"

