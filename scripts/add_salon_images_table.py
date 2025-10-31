#!/usr/bin/env python3
"""
Script to add salon images table to the database
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app import app, db
from sqlalchemy import text

def add_salon_images_table():
    """Add salon_images table to the database"""
    
    with app.app_context():
        try:
            # Create salon_images table
            create_table_sql = """
            CREATE TABLE IF NOT EXISTS salon_images (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                salon_id INTEGER NOT NULL,
                image_url VARCHAR(500) NOT NULL,
                image_alt VARCHAR(200),
                is_primary BOOLEAN DEFAULT FALSE,
                display_order INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE
            );
            """
            
            db.session.execute(text(create_table_sql))
            
            # Create index for better performance
            index_sql = "CREATE INDEX IF NOT EXISTS idx_salon_images_salon_id ON salon_images(salon_id);"
            db.session.execute(text(index_sql))
            
            # Create index for primary image lookup
            primary_index_sql = "CREATE INDEX IF NOT EXISTS idx_salon_images_primary ON salon_images(salon_id, is_primary);"
            db.session.execute(text(primary_index_sql))
            
            db.session.commit()
            print("✅ Salon images table created successfully!")
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error creating salon images table: {e}")
            raise

if __name__ == "__main__":
    add_salon_images_table()
