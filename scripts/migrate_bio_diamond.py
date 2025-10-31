#!/usr/bin/env python3
"""
Database migration script to add is_bio_diamond column to salons table
"""

import sys
import os
import sqlite3
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def migrate_bio_diamond():
    """Add is_bio_diamond column to salons table"""
    home_dir = os.path.expanduser("~")
    db_path = os.path.join(home_dir, "biosearch.db")
    
    if not os.path.exists(db_path):
        print("Database not found. Please run the import script first.")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if column already exists
        cursor.execute("PRAGMA table_info(salons)")
        salon_columns = [column[1] for column in cursor.fetchall()]
        
        # Add is_bio_diamond to salons table
        if 'is_bio_diamond' not in salon_columns:
            print("Adding is_bio_diamond column to salons table...")
            cursor.execute("ALTER TABLE salons ADD COLUMN is_bio_diamond BOOLEAN DEFAULT FALSE")
        
        # Update existing records to have default value
        cursor.execute("UPDATE salons SET is_bio_diamond = FALSE WHERE is_bio_diamond IS NULL")
        
        conn.commit()
        print("BIO Diamond migration completed successfully!")
        
    except Exception as e:
        print(f"Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_bio_diamond()
