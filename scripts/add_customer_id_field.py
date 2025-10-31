#!/usr/bin/env python3
"""
Migration script to add customer_id field to users table.
This script adds the customer_id column to the users table.
"""

import sys
import os

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app import app, db, User

def add_customer_id_field():
    """Add customer_id field to users table"""
    with app.app_context():
        try:
            # Add the customer_id column to the users table
            with db.engine.connect() as connection:
                connection.execute(db.text('ALTER TABLE users ADD COLUMN customer_id VARCHAR(50)'))
                connection.commit()
            print("Successfully added 'customer_id' column to users table")
        except Exception as e:
            if "already exists" in str(e) or "duplicate column" in str(e).lower():
                print("Column 'customer_id' already exists in users table")
            else:
                print(f"Error adding customer_id column: {e}")

if __name__ == '__main__':
    add_customer_id_field()
