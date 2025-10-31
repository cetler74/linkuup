#!/usr/bin/env python3
"""
Database initialization script for LinkUup backend.
Creates all necessary tables in the PostgreSQL database.
"""
import asyncio
import sys
from sqlalchemy.ext.asyncio import create_async_engine
from core.database import Base
from core.config import settings

# Import all models to ensure they are registered with Base
from models import *

async def init_db():
    """Initialize the database by creating all tables."""
    print("🚀 Initializing LinkUup database...")
    print(f"📊 Database URL: {settings.DATABASE_URL}")
    
    try:
        # Create async engine
        engine = create_async_engine(
            settings.DATABASE_URL,
            echo=True,
            future=True,
            pool_pre_ping=True,
        )
        
        # Create all tables
        print("📋 Creating database tables...")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        
        print("✅ Database initialization completed successfully!")
        print("📊 Tables created:")
        
        # List all tables
        for table_name in Base.metadata.tables.keys():
            print(f"  - {table_name}")
        
        await engine.dispose()
        
    except Exception as e:
        print(f"❌ Error initializing database: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(init_db())
