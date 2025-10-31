#!/usr/bin/env python3
"""
Create BioSearch2 database tables in PostgreSQL
This script creates all the necessary tables for the BioSearch2 application
"""

import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app import app, db

def create_all_tables():
    """Create all database tables"""
    print("Creating BioSearch2 database tables...")
    print(f"Database: {app.config['SQLALCHEMY_DATABASE_URI']}")
    print("-" * 60)
    
    with app.app_context():
        try:
            # Create all tables defined in the models
            db.create_all()
            print("✓ All BioSearch2 tables created successfully!")
            
            # List the tables that were created
            from sqlalchemy import inspect
            inspector = inspect(db.engine)
            tables = inspector.get_table_names()
            
            biosearch_tables = [
                'salons', 'salon_images', 'services', 'salon_services',
                'time_slots', 'bookings', 'users', 'salon_managers', 'reviews'
            ]
            
            print("\nBioSearch2 tables status:")
            for table in biosearch_tables:
                if table in tables:
                    print(f"  ✓ {table}")
                else:
                    print(f"  ✗ {table} (missing)")
            
            return True
            
        except Exception as e:
            print(f"✗ Error creating tables: {e}")
            import traceback
            traceback.print_exc()
            return False

if __name__ == '__main__':
    try:
        success = create_all_tables()
        if success:
            print("\n✓ Database initialization completed successfully!")
            sys.exit(0)
        else:
            print("\n✗ Database initialization failed!")
            sys.exit(1)
    except Exception as e:
        print(f"\n✗ Fatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


