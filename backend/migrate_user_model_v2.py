#!/usr/bin/env python3
"""
Migration script to update the User model schema - Version 2
This script adds the missing user_type and GDPR fields
"""

import asyncio
import os
from sqlalchemy import text
from core.database import AsyncSessionLocal

async def migrate_user_model_v2():
    """Migrate the users table to add missing fields"""
    
    # Get database session
    async with AsyncSessionLocal() as session:
        try:
            # Add user_type column
            await session.execute(text("""
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS user_type VARCHAR(20) DEFAULT 'customer'
            """))
            
            # Add missing GDPR fields
            await session.execute(text("""
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS gdpr_data_processing_consent BOOLEAN DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS gdpr_data_processing_consent_date TIMESTAMP WITH TIME ZONE,
                ADD COLUMN IF NOT EXISTS gdpr_marketing_consent BOOLEAN DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS gdpr_marketing_consent_date TIMESTAMP WITH TIME ZONE
            """))
            
            # Update existing records to set default values
            await session.execute(text("""
                UPDATE users 
                SET user_type = CASE 
                    WHEN is_business_owner = TRUE THEN 'business_owner'
                    WHEN is_admin = TRUE THEN 'platform_admin'
                    ELSE 'customer'
                END,
                gdpr_data_processing_consent = COALESCE(gdpr_consent_given, FALSE),
                gdpr_data_processing_consent_date = gdpr_consent_timestamp,
                gdpr_marketing_consent = FALSE
                WHERE user_type IS NULL
            """))
            
            await session.commit()
            print("✅ User model migration v2 completed successfully!")
            
        except Exception as e:
            print(f"❌ Migration failed: {e}")
            await session.rollback()
            raise

if __name__ == "__main__":
    asyncio.run(migrate_user_model_v2())
