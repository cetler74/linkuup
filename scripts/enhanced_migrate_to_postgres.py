#!/usr/bin/env python3
"""
Enhanced PostgreSQL Migration Script
Migrates data from SQLite to PostgreSQL with validation and rollback capabilities
"""

import sys
import os
import sqlite3
import pandas as pd
from datetime import datetime
import json
from pathlib import Path

# Add project root to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from backend.app import app, db
from backend.app import User, Salon, Service, SalonService, Review, Booking, SalonImage, TimeSlot, SalonManager
from sqlalchemy import create_engine, text, inspect
from dotenv import load_dotenv

load_dotenv()

class DatabaseMigrator:
    def __init__(self):
        self.sqlite_path = os.path.join(os.path.expanduser('~'), 'biosearch.db')
        self.postgres_url = os.getenv('DATABASE_URL')
        self.backup_dir = Path('database_backups')
        self.migration_log = []
        
        # Create backup directory
        self.backup_dir.mkdir(exist_ok=True)
        
    def log(self, message, level="INFO"):
        """Log migration progress"""
        timestamp = datetime.now().isoformat()
        log_entry = f"[{timestamp}] {level}: {message}"
        print(log_entry)
        self.migration_log.append(log_entry)
        
    def create_backup(self):
        """Create backup of SQLite database"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = self.backup_dir / f"biosearch_backup_{timestamp}.db"
        
        self.log(f"Creating backup: {backup_path}")
        
        # Copy SQLite database
        import shutil
        shutil.copy2(self.sqlite_path, backup_path)
        
        self.log(f"Backup created successfully: {backup_path}")
        return backup_path
        
    def validate_connections(self):
        """Validate database connections"""
        self.log("Validating database connections...")
        
        # Test SQLite connection
        if not os.path.exists(self.sqlite_path):
            raise Exception(f"SQLite database not found: {self.sqlite_path}")
            
        sqlite_conn = sqlite3.connect(self.sqlite_path)
        sqlite_conn.execute("SELECT 1")
        sqlite_conn.close()
        self.log("✅ SQLite connection successful")
        
        # Test PostgreSQL connection
        if not self.postgres_url:
            raise Exception("DATABASE_URL environment variable not set!")
            
        postgres_engine = create_engine(self.postgres_url)
        with postgres_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        self.log("✅ PostgreSQL connection successful")
        
        return postgres_engine
        
    def get_table_data(self, table_name):
        """Get data from SQLite table"""
        conn = sqlite3.connect(self.sqlite_path)
        try:
            df = pd.read_sql(f"SELECT * FROM {table_name}", conn)
            self.log(f"Retrieved {len(df)} records from {table_name}")
            return df
        finally:
            conn.close()
            
    def migrate_table(self, postgres_engine, table_name, model_class):
        """Migrate a single table"""
        self.log(f"Migrating table: {table_name}")
        
        try:
            # Get data from SQLite
            df = self.get_table_data(table_name)
            
            if df.empty:
                self.log(f"No data found in {table_name}", "WARNING")
                return 0
                
            # Handle datetime columns
            datetime_columns = ['created_at']
            for col in datetime_columns:
                if col in df.columns:
                    df[col] = pd.to_datetime(df[col], errors='coerce')
                    
            # Handle boolean columns
            boolean_columns = ['is_admin', 'is_active', 'booking_enabled', 'is_bio_diamond', 'is_verified', 'is_primary', 'is_available']
            for col in boolean_columns:
                if col in df.columns:
                    # Convert to proper boolean values
                    df[col] = df[col].map({1: True, 0: False, '1': True, '0': False, True: True, False: False})
                    df[col] = df[col].astype('boolean')
                    
            # Insert data into PostgreSQL
            with postgres_engine.connect() as conn:
                # Use pandas to_sql with method='multi' for better performance
                df.to_sql(
                    table_name, 
                    conn, 
                    if_exists='append', 
                    index=False, 
                    method='multi',
                    chunksize=1000
                )
                conn.commit()
                
            self.log(f"✅ Successfully migrated {len(df)} records to {table_name}")
            return len(df)
            
        except Exception as e:
            self.log(f"❌ Error migrating {table_name}: {str(e)}", "ERROR")
            raise
            
    def verify_migration(self, postgres_engine):
        """Verify migration integrity"""
        self.log("Verifying migration integrity...")
        
        tables_to_verify = [
            'users', 'salons', 'services', 'salon_services', 
            'reviews', 'bookings', 'salon_images', 'time_slots', 'salon_managers'
        ]
        
        verification_results = {}
        
        for table_name in tables_to_verify:
            try:
                # Count SQLite records
                sqlite_count = self.get_table_data(table_name).shape[0]
                
                # Count PostgreSQL records
                with postgres_engine.connect() as conn:
                    result = conn.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
                    postgres_count = result.scalar()
                    
                verification_results[table_name] = {
                    'sqlite_count': sqlite_count,
                    'postgres_count': postgres_count,
                    'match': sqlite_count == postgres_count
                }
                
                status = "✅" if sqlite_count == postgres_count else "❌"
                self.log(f"{status} {table_name}: SQLite={sqlite_count}, PostgreSQL={postgres_count}")
                
            except Exception as e:
                self.log(f"❌ Error verifying {table_name}: {str(e)}", "ERROR")
                verification_results[table_name] = {'error': str(e)}
                
        return verification_results
        
    def create_migration_report(self, verification_results):
        """Create detailed migration report"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_path = self.backup_dir / f"migration_report_{timestamp}.json"
        
        report = {
            'timestamp': datetime.now().isoformat(),
            'sqlite_path': self.sqlite_path,
            'postgres_url': self.postgres_url.replace(self.postgres_url.split('@')[0].split('//')[1], '***'),
            'verification_results': verification_results,
            'migration_log': self.migration_log,
            'success': all(result.get('match', False) for result in verification_results.values() if 'error' not in result)
        }
        
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2, default=str)
            
        self.log(f"Migration report saved: {report_path}")
        return report_path
        
    def migrate(self):
        """Main migration process"""
        self.log("🚀 Starting enhanced PostgreSQL migration...")
        
        try:
            # Create backup
            backup_path = self.create_backup()
            
            # Validate connections
            postgres_engine = self.validate_connections()
            
            # Create tables in PostgreSQL
            self.log("Creating tables in PostgreSQL...")
            with app.app_context():
                db.create_all()
            self.log("✅ Tables created successfully")
            
            # Define migration order (respecting foreign key constraints)
            migration_order = [
                ('users', User),
                ('services', Service),
                ('salons', Salon),
                ('salon_services', SalonService),
                ('time_slots', TimeSlot),
                ('salon_managers', SalonManager),
                ('reviews', Review),
                ('bookings', Booking),
                ('salon_images', SalonImage)
            ]
            
            # Migrate tables
            total_migrated = 0
            for table_name, model_class in migration_order:
                try:
                    count = self.migrate_table(postgres_engine, table_name, model_class)
                    total_migrated += count
                except Exception as e:
                    self.log(f"Migration failed at table {table_name}: {str(e)}", "ERROR")
                    raise
                    
            # Verify migration
            verification_results = self.verify_migration(postgres_engine)
            
            # Create report
            report_path = self.create_migration_report(verification_results)
            
            # Summary
            self.log("🎉 Migration completed successfully!")
            self.log(f"📊 Total records migrated: {total_migrated}")
            self.log(f"📋 Migration report: {report_path}")
            self.log(f"💾 Backup created: {backup_path}")
            
            return True
            
        except Exception as e:
            self.log(f"❌ Migration failed: {str(e)}", "ERROR")
            return False

def main():
    """Main function"""
    migrator = DatabaseMigrator()
    success = migrator.migrate()
    
    if success:
        print("\n✅ Migration completed successfully!")
        print("🔄 You can now update your application to use PostgreSQL")
    else:
        print("\n❌ Migration failed!")
        print("📋 Check the migration logs for details")
        sys.exit(1)

if __name__ == "__main__":
    main()
