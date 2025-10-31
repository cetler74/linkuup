#!/usr/bin/env python3
"""
Database migration script to add missing columns for mobile API support
This script adds updated_at and other missing columns to existing tables
"""

import sys
import os
from datetime import datetime

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app import app, db
from sqlalchemy import text

def check_column_exists(table_name, column_name):
    """Check if a column exists in a table"""
    with app.app_context():
        # Get database type
        engine = db.engine
        dialect_name = engine.dialect.name
        
        if dialect_name == 'sqlite':
            result = db.session.execute(text(f"PRAGMA table_info({table_name})"))
            columns = [row[1] for row in result]
            return column_name in columns
        elif dialect_name == 'postgresql':
            result = db.session.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = :table_name AND column_name = :column_name
            """), {'table_name': table_name, 'column_name': column_name})
            return result.fetchone() is not None
        else:
            raise Exception(f"Unsupported database type: {dialect_name}")

def add_column_if_missing(table_name, column_name, column_definition):
    """Add a column to a table if it doesn't exist"""
    if check_column_exists(table_name, column_name):
        print(f"✓ Column '{column_name}' already exists in '{table_name}' table")
        return False
    
    try:
        with app.app_context():
            db.session.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_definition}"))
            db.session.commit()
            print(f"✓ Added column '{column_name}' to '{table_name}' table")
            return True
    except Exception as e:
        print(f"✗ Error adding column '{column_name}' to '{table_name}': {e}")
        db.session.rollback()
        return False

def migrate_database():
    """Run all migrations"""
    print("Starting database migration...")
    print(f"Database: {app.config['SQLALCHEMY_DATABASE_URI']}")
    print("-" * 60)
    
    with app.app_context():
        engine = db.engine
        dialect_name = engine.dialect.name
        
        # Define column types based on database
        if dialect_name == 'sqlite':
            datetime_type = 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
            int_type = 'INTEGER DEFAULT 1'
            string_200_type = 'VARCHAR(200)'
            boolean_type = 'BOOLEAN DEFAULT 0'
            string_10_type = 'VARCHAR(10) DEFAULT "1.0"'
        elif dialect_name == 'postgresql':
            datetime_type = 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
            int_type = 'INTEGER DEFAULT 1'
            string_200_type = 'VARCHAR(200)'
            boolean_type = 'BOOLEAN DEFAULT FALSE'
            string_10_type = 'VARCHAR(10) DEFAULT \'1.0\''
        else:
            raise Exception(f"Unsupported database type: {dialect_name}")
        
        changes_made = 0
        
        # Add updated_at to salons table
        print("\n1. Updating 'salons' table...")
        if add_column_if_missing('salons', 'updated_at', datetime_type):
            changes_made += 1
        
        # Add updated_at to services table
        print("\n2. Updating 'services' table...")
        if add_column_if_missing('services', 'updated_at', datetime_type):
            changes_made += 1
        
        # Add updated_at and sync_version to bookings table
        print("\n3. Updating 'bookings' table...")
        if add_column_if_missing('bookings', 'updated_at', datetime_type):
            changes_made += 1
        if add_column_if_missing('bookings', 'sync_version', int_type):
            changes_made += 1
        
        # Add mobile API columns to users table
        print("\n4. Updating 'users' table...")
        if add_column_if_missing('users', 'updated_at', datetime_type):
            changes_made += 1
        if add_column_if_missing('users', 'refresh_token', string_200_type):
            changes_made += 1
        if add_column_if_missing('users', 'token_expires_at', 'TIMESTAMP'):
            changes_made += 1
        if add_column_if_missing('users', 'refresh_token_expires_at', 'TIMESTAMP'):
            changes_made += 1
        if add_column_if_missing('users', 'last_login_at', 'TIMESTAMP'):
            changes_made += 1
        
        # Add GDPR columns to users table
        if add_column_if_missing('users', 'gdpr_data_processing_consent', boolean_type):
            changes_made += 1
        if add_column_if_missing('users', 'gdpr_data_processing_consent_date', 'TIMESTAMP'):
            changes_made += 1
        if add_column_if_missing('users', 'gdpr_marketing_consent', boolean_type):
            changes_made += 1
        if add_column_if_missing('users', 'gdpr_marketing_consent_date', 'TIMESTAMP'):
            changes_made += 1
        if add_column_if_missing('users', 'gdpr_consent_version', string_10_type):
            changes_made += 1
        
        print("\n" + "=" * 60)
        if changes_made > 0:
            print(f"✓ Migration completed successfully!")
            print(f"  {changes_made} column(s) added")
        else:
            print("✓ Database is already up to date - no changes needed")
        print("=" * 60)
        
        return changes_made > 0

if __name__ == '__main__':
    try:
        migrate_database()
        print("\nDatabase migration completed successfully! ✓")
        sys.exit(0)
    except Exception as e:
        print(f"\n✗ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

