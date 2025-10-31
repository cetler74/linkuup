#!/usr/bin/env python3
"""
Migration script to create the businesses table for the new API.
"""
import asyncio
import sys
from sqlalchemy.ext.asyncio import create_async_engine
from core.database import Base
from core.config import settings

# Import all models to ensure they are registered with Base
from models.user import User
from models.business import Business, BusinessService, BusinessEmployee, BusinessBooking, BusinessMessage, Campaign

async def migrate_to_business():
    """Create the businesses table for the new API."""
    print("🚀 Migrating to Business model...")
    print(f"📊 Database URL: {settings.DATABASE_URL}")
    
    try:
        # Create async engine
        engine = create_async_engine(
            settings.DATABASE_URL,
            echo=True,
            future=True,
            pool_pre_ping=True,
        )
        
        # Create all business-related tables
        print("📋 Creating business tables...")
        async with engine.begin() as conn:
            # Create all tables defined in the models
            await conn.run_sync(Base.metadata.create_all, checkfirst=True)
        
        print("✅ Migration completed successfully!")
        print("📊 New tables created:")
        print("  - businesses")
        print("  - business_services") 
        print("  - business_employees")
        
        await engine.dispose()
        
    except Exception as e:
        print(f"❌ Error during migration: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(migrate_to_business())
