#!/usr/bin/env python3
"""
Migration script to update the User model schema
This script adds new columns and removes old ones to match the new User model
"""

import asyncio
import os
from sqlalchemy import text
from core.database import AsyncSessionLocal

async def migrate_user_model():
    """Migrate the users table to match the new User model"""
    
    # Get database session
    async with AsyncSessionLocal() as session:
        try:
            # Add new columns
            await session.execute(text("""
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS first_name VARCHAR(50),
                ADD COLUMN IF NOT EXISTS last_name VARCHAR(50),
                ADD COLUMN IF NOT EXISTS is_owner BOOLEAN DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS gdpr_consent_given BOOLEAN DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS gdpr_consent_timestamp TIMESTAMP WITH TIME ZONE
            """))
            
            # Update existing records to set default values
            await session.execute(text("""
                UPDATE users 
                SET is_owner = is_business_owner,
                    gdpr_consent_given = gdpr_data_processing_consent,
                    gdpr_consent_timestamp = gdpr_data_processing_consent_date
                WHERE first_name IS NULL
            """))
            
            # Drop old columns (commented out for safety - uncomment when ready)
            # await session.execute(text("""
            #     ALTER TABLE users 
            #     DROP COLUMN IF EXISTS name,
            #     DROP COLUMN IF EXISTS customer_id,
            #     DROP COLUMN IF EXISTS is_business_owner,
            #     DROP COLUMN IF EXISTS user_type,
            #     DROP COLUMN IF EXISTS gdpr_data_processing_consent,
            #     DROP COLUMN IF EXISTS gdpr_data_processing_consent_date,
            #     DROP COLUMN IF EXISTS gdpr_marketing_consent,
            #     DROP COLUMN IF EXISTS gdpr_marketing_consent_date,
            #     DROP COLUMN IF EXISTS gdpr_consent_version
            # """))
            
            await session.commit()
            print("✅ User model migration completed successfully!")
            
        except Exception as e:
            print(f"❌ Migration failed: {e}")
            await session.rollback()
            raise

if __name__ == "__main__":
    asyncio.run(migrate_user_model())
