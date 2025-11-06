#!/usr/bin/env python3
"""
Run SQL migration directly on the database
"""
import asyncio
import asyncpg
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).parent / '.env'
if env_path.exists():
    load_dotenv(dotenv_path=env_path)

async def run_migration():
    # Get database URL from environment or use default
    database_url = os.getenv('DATABASE_URL', 'postgresql://linkuup_user@localhost:5432/linkuup_db')
    
    # Parse database URL
    # Format: postgresql://user:password@host:port/database
    if 'postgresql://' in database_url or 'postgresql+asyncpg://' in database_url:
        # Remove postgresql+asyncpg:// prefix if present
        db_url = database_url.replace('postgresql+asyncpg://', '').replace('postgresql://', '')
        parts = db_url.split('@')
        if len(parts) == 2:
            user_pass = parts[0].split(':')
            host_db = parts[1].split('/')
            host_port = host_db[0].split(':')
            
            user = user_pass[0] if user_pass else 'linkuup_user'
            password = user_pass[1] if len(user_pass) > 1 else None
            host = host_port[0] if host_port else 'localhost'
            port = int(host_port[1]) if len(host_port) > 1 else 5432
            database = host_db[1] if len(host_db) > 1 else 'linkuup_db'
        else:
            # Simple format without @
            user = 'linkuup_user'
            password = None
            host = 'localhost'
            port = 5432
            database = 'linkuup_db'
    else:
        user = 'linkuup_user'
        password = None
        host = 'localhost'
        port = 5432
        database = 'linkuup_db'
    
    # Read SQL migration file
    migration_file = Path(__file__).parent / 'migrations' / 'add_password_reset_and_language_preference.sql'
    if not migration_file.exists():
        print(f"❌ Migration file not found: {migration_file}")
        return
    
    with open(migration_file, 'r') as f:
        sql = f.read()
    
    print(f"📝 Running migration: {migration_file.name}")
    print(f"🔌 Connecting to database: {database} on {host}:{port} as {user}")
    
    try:
        # Connect to database
        if password:
            conn = await asyncpg.connect(
                host=host,
                port=port,
                user=user,
                password=password,
                database=database
            )
        else:
            conn = await asyncpg.connect(
                host=host,
                port=port,
                user=user,
                database=database
            )
        
        # Execute migration
        await conn.execute(sql)
        await conn.close()
        
        print("✅ Migration completed successfully!")
        
    except Exception as e:
        print(f"❌ Error running migration: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    asyncio.run(run_migration())

