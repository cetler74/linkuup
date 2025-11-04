#!/usr/bin/env python3
"""
Run the slug migration to add slug column to places table
"""
import asyncio
import asyncpg
import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from Linkuup.backend.core.config import settings

async def run_migration():
    """Run the slug migration"""
    # Parse DATABASE_URL to get connection details
    # Format: postgresql+asyncpg://user@host:port/dbname
    db_url = settings.DATABASE_URL.replace('postgresql+asyncpg://', 'postgresql://')
    
    # Read the migration SQL file
    migration_file = os.path.join(os.path.dirname(__file__), 'migrations', 'add_slug_to_places.sql')
    
    if not os.path.exists(migration_file):
        print(f"❌ Migration file not found: {migration_file}")
        return False
    
    with open(migration_file, 'r') as f:
        migration_sql = f.read()
    
    try:
        # Connect to database
        print(f"🔌 Connecting to database: {settings.DATABASE_URL.split('@')[1] if '@' in settings.DATABASE_URL else 'unknown'}")
        conn = await asyncpg.connect(db_url)
        
        try:
            # Execute migration
            print("📝 Running migration: add_slug_to_places.sql")
            await conn.execute(migration_sql)
            
            # Verify migration
            result = await conn.fetchval("""
                SELECT COUNT(*) 
                FROM information_schema.columns 
                WHERE table_name = 'places' AND column_name = 'slug'
            """)
            
            if result > 0:
                print("✅ Migration completed successfully!")
                print(f"✅ Slug column exists in places table")
                
                # Check how many places have slugs
                count = await conn.fetchval("SELECT COUNT(*) FROM places WHERE slug IS NOT NULL")
                total = await conn.fetchval("SELECT COUNT(*) FROM places")
                print(f"✅ {count} out of {total} places have slugs assigned")
                
                return True
            else:
                print("❌ Migration completed but slug column not found")
                return False
                
        finally:
            await conn.close()
            
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(run_migration())
    sys.exit(0 if success else 1)

