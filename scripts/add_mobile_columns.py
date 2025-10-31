#!/usr/bin/env python3
"""
Migration script to add mobile API support columns to existing database
Run this script to add the new columns needed for mobile features
"""
import os
import sys
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

# Check if we're using PostgreSQL or SQLite
database_url = os.getenv('DATABASE_URL')
if database_url and database_url.startswith('postgresql'):
    import psycopg2
    from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
    
    def run_postgres_migration():
        """Run migration for PostgreSQL database"""
        print("Running PostgreSQL migration...")
        
        conn = psycopg2.connect(database_url)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        migrations = [
            # User table extensions
            """
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS refresh_token VARCHAR(200) UNIQUE,
            ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS refresh_token_expires_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()
            """,
            
            # Salon table extensions
            """
            ALTER TABLE salons 
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()
            """,
            
            # Service table extensions
            """
            ALTER TABLE services 
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()
            """,
            
            # Booking table extensions
            """
            ALTER TABLE bookings 
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW(),
            ADD COLUMN IF NOT EXISTS sync_version INTEGER DEFAULT 1
            """,
            
            # Create device_tokens table
            """
            CREATE TABLE IF NOT EXISTS device_tokens (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                device_id VARCHAR(200) UNIQUE NOT NULL,
                token VARCHAR(500) NOT NULL,
                platform VARCHAR(20),
                app_version VARCHAR(20),
                created_at TIMESTAMP DEFAULT NOW(),
                last_used_at TIMESTAMP DEFAULT NOW(),
                is_active BOOLEAN DEFAULT TRUE
            )
            """,
            
            # Create triggers to auto-update updated_at columns
            """
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = NOW();
                RETURN NEW;
            END;
            $$ language 'plpgsql'
            """,
            
            """
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
                    CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
                    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
                END IF;
            END $$
            """,
            
            """
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_salons_updated_at') THEN
                    CREATE TRIGGER update_salons_updated_at BEFORE UPDATE ON salons
                    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
                END IF;
            END $$
            """,
            
            """
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_services_updated_at') THEN
                    CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
                    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
                END IF;
            END $$
            """,
            
            """
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_bookings_updated_at') THEN
                    CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
                    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
                END IF;
            END $$
            """
        ]
        
        for migration in migrations:
            try:
                cursor.execute(migration)
                print(f"✓ Migration executed successfully")
            except Exception as e:
                print(f"✗ Migration error: {e}")
                print(f"  SQL: {migration[:100]}...")
        
        cursor.close()
        conn.close()
        print("PostgreSQL migration completed!")
    
    run_postgres_migration()

else:
    # SQLite migration
    import sqlite3
    
    def run_sqlite_migration():
        """Run migration for SQLite database"""
        print("Running SQLite migration...")
        
        home_dir = os.path.expanduser("~")
        db_path = os.path.join(home_dir, "biosearch.db")
        
        if not os.path.exists(db_path):
            print(f"Database not found at {db_path}")
            return
        
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        migrations = [
            # User table extensions (no DEFAULT for SQLite compatibility)
            "ALTER TABLE users ADD COLUMN refresh_token VARCHAR(200)",
            "ALTER TABLE users ADD COLUMN token_expires_at TIMESTAMP",
            "ALTER TABLE users ADD COLUMN refresh_token_expires_at TIMESTAMP",
            "ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP",
            "ALTER TABLE users ADD COLUMN updated_at TIMESTAMP",
            
            # Salon table extensions
            "ALTER TABLE salons ADD COLUMN updated_at TIMESTAMP",
            
            # Service table extensions
            "ALTER TABLE services ADD COLUMN updated_at TIMESTAMP",
            
            # Booking table extensions
            "ALTER TABLE bookings ADD COLUMN updated_at TIMESTAMP",
            "ALTER TABLE bookings ADD COLUMN sync_version INTEGER DEFAULT 1",
            
            # Create device_tokens table
            """
            CREATE TABLE IF NOT EXISTS device_tokens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                device_id VARCHAR(200) UNIQUE NOT NULL,
                token VARCHAR(500) NOT NULL,
                platform VARCHAR(20),
                app_version VARCHAR(20),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT 1,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
            """
        ]
        
        for migration in migrations:
            try:
                cursor.execute(migration)
                print(f"✓ Migration executed: {migration[:60]}...")
            except sqlite3.OperationalError as e:
                if "duplicate column name" in str(e).lower():
                    print(f"⊘ Column already exists: {migration[:60]}...")
                else:
                    print(f"✗ Migration error: {e}")
        
        conn.commit()
        cursor.close()
        conn.close()
        print("SQLite migration completed!")
    
    run_sqlite_migration()

print("\n" + "="*60)
print("Mobile API columns migration completed!")
print("="*60)
print("\nNew columns added:")
print("  Users: refresh_token, token_expires_at, refresh_token_expires_at, last_login_at, updated_at")
print("  Salons: updated_at")
print("  Services: updated_at")
print("  Bookings: updated_at, sync_version")
print("\nNew table created:")
print("  device_tokens - for future push notification support")
print("\nYou can now use the mobile API endpoints!")

