#!/usr/bin/env python3
"""
Database migration script to add admin and booking control columns
"""

import sys
import os
import sqlite3
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def migrate_database():
    """Add new columns to existing database"""
    home_dir = os.path.expanduser("~")
    db_path = os.path.join(home_dir, "biosearch.db")
    
    if not os.path.exists(db_path):
        print("Database not found. Please run the import script first.")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if columns already exist
        cursor.execute("PRAGMA table_info(users)")
        user_columns = [column[1] for column in cursor.fetchall()]
        
        cursor.execute("PRAGMA table_info(salons)")
        salon_columns = [column[1] for column in cursor.fetchall()]
        
        # Add is_admin and is_active to users table
        if 'is_admin' not in user_columns:
            print("Adding is_admin column to users table...")
            cursor.execute("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE")
        
        if 'is_active' not in user_columns:
            print("Adding is_active column to users table...")
            cursor.execute("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE")
        
        # Add booking_enabled and is_active to salons table
        if 'booking_enabled' not in salon_columns:
            print("Adding booking_enabled column to salons table...")
            cursor.execute("ALTER TABLE salons ADD COLUMN booking_enabled BOOLEAN DEFAULT TRUE")
        
        if 'is_active' not in salon_columns:
            print("Adding is_active column to salons table...")
            cursor.execute("ALTER TABLE salons ADD COLUMN is_active BOOLEAN DEFAULT TRUE")
        
        # Update existing records to have default values
        cursor.execute("UPDATE users SET is_admin = FALSE WHERE is_admin IS NULL")
        cursor.execute("UPDATE users SET is_active = TRUE WHERE is_active IS NULL")
        cursor.execute("UPDATE salons SET booking_enabled = TRUE WHERE booking_enabled IS NULL")
        cursor.execute("UPDATE salons SET is_active = TRUE WHERE is_active IS NULL")
        
        conn.commit()
        print("Database migration completed successfully!")
        
    except Exception as e:
        print(f"Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_database()
