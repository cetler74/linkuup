#!/usr/bin/env python3
"""
Production Database Setup Script for BioSearch2
This script sets up the production PostgreSQL database with proper configuration
"""

import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import secrets
import string

def generate_secure_password(length=32):
    """Generate a secure random password"""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    password = ''.join(secrets.choice(alphabet) for i in range(length))
    return password

def create_database_and_user():
    """Create database and user with secure configuration"""
    
    # Database configuration
    db_name = "biosearch_db"
    db_user = "biosearch_user"
    db_password = generate_secure_password()
    
    print(f"Creating database: {db_name}")
    print(f"Creating user: {db_user}")
    print(f"Generated password: {db_password}")
    
    try:
        # Connect to PostgreSQL as superuser
        conn = psycopg2.connect(
            host="localhost",
            database="postgres",
            user="postgres"
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        # Create database
        cursor.execute(f"SELECT 1 FROM pg_database WHERE datname = '{db_name}'")
        if cursor.fetchone():
            print(f"Database {db_name} already exists")
        else:
            cursor.execute(f"CREATE DATABASE {db_name}")
            print(f"Database {db_name} created successfully")
        
        # Create user
        cursor.execute(f"SELECT 1 FROM pg_roles WHERE rolname = '{db_user}'")
        if cursor.fetchone():
            print(f"User {db_user} already exists")
            # Update password
            cursor.execute(f"ALTER USER {db_user} WITH PASSWORD '{db_password}'")
            print(f"Password updated for user {db_user}")
        else:
            cursor.execute(f"CREATE USER {db_user} WITH PASSWORD '{db_password}'")
            print(f"User {db_user} created successfully")
        
        # Grant privileges
        cursor.execute(f"GRANT ALL PRIVILEGES ON DATABASE {db_name} TO {db_user}")
        cursor.execute(f"ALTER USER {db_user} CREATEDB")
        cursor.execute(f"ALTER USER {db_user} WITH SUPERUSER")
        
        print("Database privileges granted successfully")
        
        cursor.close()
        conn.close()
        
        return db_password
        
    except psycopg2.Error as e:
        print(f"Database error: {e}")
        sys.exit(1)

def configure_postgresql_security():
    """Configure PostgreSQL for production security"""
    
    print("Configuring PostgreSQL security settings...")
    
    # PostgreSQL configuration file paths
    config_file = "/etc/postgresql/14/main/postgresql.conf"
    hba_file = "/etc/postgresql/14/main/pg_hba.conf"
    
    # Backup original files
    os.system(f"sudo cp {config_file} {config_file}.backup")
    os.system(f"sudo cp {hba_file} {hba_file}.backup")
    
    # Update postgresql.conf for production
    postgresql_conf_updates = [
        "listen_addresses = 'localhost'",
        "port = 5432",
        "max_connections = 100",
        "shared_buffers = 256MB",
        "effective_cache_size = 1GB",
        "maintenance_work_mem = 64MB",
        "checkpoint_completion_target = 0.9",
        "wal_buffers = 16MB",
        "default_statistics_target = 100",
        "random_page_cost = 1.1",
        "effective_io_concurrency = 200",
        "work_mem = 4MB",
        "min_wal_size = 1GB",
        "max_wal_size = 4GB",
        "log_destination = 'stderr'",
        "logging_collector = on",
        "log_directory = 'pg_log'",
        "log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'",
        "log_rotation_age = 1d",
        "log_rotation_size = 100MB",
        "log_min_duration_statement = 1000",
        "log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '",
        "log_checkpoints = on",
        "log_connections = on",
        "log_disconnections = on",
        "log_lock_waits = on",
        "log_temp_files = 0",
        "log_autovacuum_min_duration = 0",
        "log_error_verbosity = default",
        "log_statement = 'none'",
        "log_timezone = 'UTC'",
        "timezone = 'UTC'"
    ]
    
    # Apply configuration updates
    for setting in postgresql_conf_updates:
        key, value = setting.split(' = ', 1)
        os.system(f"sudo sed -i \"s/^#*{key}.*/{setting}/\" {config_file}")
    
    # Update pg_hba.conf for security
    hba_entries = [
        "# TYPE  DATABASE        USER            ADDRESS                 METHOD",
        "local   all             postgres                                peer",
        "local   all             all                                     md5",
        "host    all             all             127.0.0.1/32            md5",
        "host    all             all             ::1/128                 md5"
    ]
    
    # Write new pg_hba.conf
    with open('/tmp/pg_hba.conf', 'w') as f:
        f.write('\n'.join(hba_entries))
    
    os.system(f"sudo cp /tmp/pg_hba.conf {hba_file}")
    os.system("rm /tmp/pg_hba.conf")
    
    print("PostgreSQL security configuration updated")

def create_database_indexes():
    """Create performance indexes for the database"""
    
    print("Creating database indexes for performance...")
    
    # Add the backend directory to Python path
    sys.path.append('/home/biosearch/BioSearch2/backend')
    
    try:
        from app import app, db
        
        with app.app_context():
            # Create indexes for better performance
            indexes = [
                "CREATE INDEX IF NOT EXISTS idx_salons_nome ON salons(nome);",
                "CREATE INDEX IF NOT EXISTS idx_salons_cidade ON salons(cidade);",
                "CREATE INDEX IF NOT EXISTS idx_salons_estado ON salons(estado);",
                "CREATE INDEX IF NOT EXISTS idx_salons_booking_enabled ON salons(booking_enabled);",
                "CREATE INDEX IF NOT EXISTS idx_services_nome ON services(nome);",
                "CREATE INDEX IF NOT EXISTS idx_services_categoria ON services(categoria);",
                "CREATE INDEX IF NOT EXISTS idx_salon_services_salon_id ON salon_services(salon_id);",
                "CREATE INDEX IF NOT EXISTS idx_salon_services_service_id ON salon_services(service_id);",
                "CREATE INDEX IF NOT EXISTS idx_bookings_salon_id ON bookings(salon_id);",
                "CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);",
                "CREATE INDEX IF NOT EXISTS idx_bookings_service_id ON bookings(service_id);",
                "CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date);",
                "CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);",
                "CREATE INDEX IF NOT EXISTS idx_reviews_salon_id ON reviews(salon_id);",
                "CREATE INDEX IF NOT EXISTS idx_reviews_customer_id ON reviews(customer_id);",
                "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);",
                "CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);"
            ]
            
            for index_sql in indexes:
                try:
                    db.engine.execute(index_sql)
                    print(f"Created index: {index_sql.split('idx_')[1].split(' ')[0]}")
                except Exception as e:
                    print(f"Index creation warning: {e}")
            
            print("Database indexes created successfully")
            
    except Exception as e:
        print(f"Error creating indexes: {e}")

def setup_database_backup():
    """Set up automated database backup"""
    
    print("Setting up database backup...")
    
    backup_script = '''#!/bin/bash
# Database backup script for BioSearch2

BACKUP_DIR="/home/biosearch/backups"
DB_NAME="biosearch_db"
DB_USER="biosearch_user"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/biosearch_backup_$DATE.sql"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create backup
pg_dump -h localhost -U $DB_USER $DB_NAME > $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

# Remove backups older than 30 days
find $BACKUP_DIR -name "biosearch_backup_*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE.gz"
'''
    
    # Write backup script
    with open('/tmp/backup_database.sh', 'w') as f:
        f.write(backup_script)
    
    os.system("sudo cp /tmp/backup_database.sh /home/biosearch/backup_database.sh")
    os.system("sudo chmod +x /home/biosearch/backup_database.sh")
    os.system("sudo chown biosearch:biosearch /home/biosearch/backup_database.sh")
    os.system("rm /tmp/backup_database.sh")
    
    # Add to crontab for daily backups at 2 AM
    os.system("(crontab -l 2>/dev/null; echo '0 2 * * * /home/biosearch/backup_database.sh') | crontab -")
    
    print("Database backup configured (daily at 2 AM)")

def main():
    """Main function"""
    print("BioSearch2 Production Database Setup")
    print("=" * 40)
    
    # Check if running as root or with sudo
    if os.geteuid() != 0:
        print("This script needs to be run with sudo privileges")
        sys.exit(1)
    
    # Create database and user
    db_password = create_database_and_user()
    
    # Configure PostgreSQL security
    configure_postgresql_security()
    
    # Restart PostgreSQL
    print("Restarting PostgreSQL...")
    os.system("systemctl restart postgresql")
    
    # Create database indexes
    create_database_indexes()
    
    # Setup backup
    setup_database_backup()
    
    print("\n" + "=" * 40)
    print("Database setup completed successfully!")
    print(f"Database: biosearch_db")
    print(f"User: biosearch_user")
    print(f"Password: {db_password}")
    print("\nPlease update your .env file with the database password:")
    print(f"DATABASE_URL=postgresql://biosearch_user:{db_password}@localhost:5432/biosearch_db")
    print("\nNext steps:")
    print("1. Update your .env file with the database password")
    print("2. Run the application to create tables")
    print("3. Import your data if needed")

if __name__ == "__main__":
    main()
