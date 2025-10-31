#!/usr/bin/env python3
"""
Migration script to add about field to salons table.
This script adds the about column to the salons table.
"""

import sys
import os

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app import app, db, Salon

def add_about_field():
    """Add about field to salons table"""
    with app.app_context():
        try:
            # Add the about column to the salons table
            with db.engine.connect() as connection:
                connection.execute(db.text('ALTER TABLE salons ADD COLUMN about TEXT'))
                connection.commit()
            print("Successfully added 'about' column to salons table")
        except Exception as e:
            if "already exists" in str(e) or "duplicate column" in str(e).lower():
                print("Column 'about' already exists in salons table")
            else:
                print(f"Error adding about column: {e}")

if __name__ == '__main__':
    add_about_field()
