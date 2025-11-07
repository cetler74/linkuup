#!/usr/bin/env python3
"""
Run SQL migration to create notifications table using the project's database connection
"""
import asyncio
import sys
from pathlib import Path

# Add the backend directory to the Python path
sys.path.append(str(Path(__file__).parent))

from core.database import AsyncSessionLocal
from sqlalchemy import text

async def run_migration():
    """Run the notifications table migration"""
    migration_file = Path(__file__).parent / 'migrations' / 'create_notifications_table.sql'
    
    if not migration_file.exists():
        print(f"❌ Migration file not found: {migration_file}")
        return False
    
    # Read SQL migration file
    with open(migration_file, 'r') as f:
        sql = f.read()
    
    print(f"📝 Running migration: {migration_file.name}")
    print("🔌 Connecting to database...")
    
    try:
        async with AsyncSessionLocal() as session:
            # Split SQL into individual statements (separated by semicolons)
            # Remove comments and empty lines, then split by semicolon
            statements = []
            current_statement = []
            
            for line in sql.split('\n'):
                line = line.strip()
                # Skip empty lines and comments
                if not line or line.startswith('--'):
                    continue
                current_statement.append(line)
                # If line ends with semicolon, it's the end of a statement
                if line.endswith(';'):
                    statement = ' '.join(current_statement)
                    if statement.strip():
                        statements.append(statement)
                    current_statement = []
            
            # Execute each statement separately
            for i, statement in enumerate(statements, 1):
                print(f"  Executing statement {i}/{len(statements)}...")
                await session.execute(text(statement))
            
            await session.commit()
            
            print("✅ Migration completed successfully!")
            print("✅ Notifications table created!")
            return True
            
    except Exception as e:
        print(f"❌ Error running migration: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = asyncio.run(run_migration())
    sys.exit(0 if success else 1)
