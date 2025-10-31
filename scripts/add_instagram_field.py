#!/usr/bin/env python3
"""
Script to add Instagram field to the salons table
"""

import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def add_instagram_field():
    """Add Instagram field to salons table"""
    
    # Database configuration
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("Error: DATABASE_URL not found in environment variables")
        return False
    
    try:
        # Create database engine
        engine = create_engine(database_url)
        
        with engine.connect() as conn:
            # Check if Instagram column already exists
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'salons' AND column_name = 'instagram'
            """))
            
            if result.fetchone():
                print("Instagram column already exists in salons table")
                return True
            
            # Add Instagram column
            conn.execute(text("""
                ALTER TABLE salons 
                ADD COLUMN instagram VARCHAR(200)
            """))
            
            conn.commit()
            print("Successfully added Instagram column to salons table")
            return True
            
    except Exception as e:
        print(f"Error adding Instagram field: {str(e)}")
        return False

if __name__ == "__main__":
    success = add_instagram_field()
    if success:
        print("Database migration completed successfully")
    else:
        print("Database migration failed")
        sys.exit(1)
