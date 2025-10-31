#!/usr/bin/env python3
"""
Database migration script to add is_business_owner column to users table
"""

import os
import sys
from sqlalchemy import create_engine, text

# Add the current directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def add_business_owner_column():
    """Add is_business_owner column to users table"""
    
    # Get database URL from environment or use default
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        # Fallback to SQLite for development
        home_dir = os.path.expanduser("~")
        db_path = os.path.join(home_dir, "linkuup.db")
        database_url = f'sqlite:///{db_path}'
    
    print(f"Connecting to database: {database_url}")
    
    try:
        # Create engine
        engine = create_engine(database_url)
        
        with engine.connect() as conn:
            # Check if column already exists
            if 'postgresql' in database_url:
                # PostgreSQL
                result = conn.execute(text("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'users' AND column_name = 'is_business_owner'
                """))
                if result.fetchone():
                    print("Column 'is_business_owner' already exists in users table")
                    return
                
                # Add the column
                conn.execute(text("ALTER TABLE users ADD COLUMN is_business_owner BOOLEAN DEFAULT FALSE"))
                conn.commit()
                print("✅ Successfully added 'is_business_owner' column to users table")
                
            else:
                # SQLite
                result = conn.execute(text("PRAGMA table_info(users)"))
                columns = [row[1] for row in result.fetchall()]
                
                if 'is_business_owner' in columns:
                    print("Column 'is_business_owner' already exists in users table")
                    return
                
                # Add the column
                conn.execute(text("ALTER TABLE users ADD COLUMN is_business_owner BOOLEAN DEFAULT 0"))
                conn.commit()
                print("✅ Successfully added 'is_business_owner' column to users table")
                
    except Exception as e:
        print(f"❌ Error adding column: {e}")
        return False
    
    return True

if __name__ == "__main__":
    print("Adding is_business_owner column to users table...")
    success = add_business_owner_column()
    if success:
        print("Migration completed successfully!")
    else:
        print("Migration failed!")
        sys.exit(1)
