#!/usr/bin/env python3
"""
PostgreSQL Database Setup Script
Creates database, user, and sets up permissions
"""

import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import os
from dotenv import load_dotenv

load_dotenv()

def setup_postgres_database():
    """Set up PostgreSQL database and user"""
    
    # Database configuration
    DB_NAME = os.getenv('POSTGRES_DB', 'biosearch_db')
    DB_USER = os.getenv('POSTGRES_USER', 'biosearch_user')
    DB_PASSWORD = os.getenv('POSTGRES_PASSWORD', 'biosearch_password')
    DB_HOST = os.getenv('POSTGRES_HOST', 'localhost')
    DB_PORT = os.getenv('POSTGRES_PORT', '5432')
    
    # Admin connection (to create database and user)
    ADMIN_USER = os.getenv('POSTGRES_ADMIN_USER', 'postgres')
    ADMIN_PASSWORD = os.getenv('POSTGRES_ADMIN_PASSWORD', '')
    
    print("🔄 Setting up PostgreSQL database...")
    
    try:
        # Connect as admin to create database and user
        admin_conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=ADMIN_USER,
            password=ADMIN_PASSWORD
        )
        admin_conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        admin_cursor = admin_conn.cursor()
        
        # Create user if it doesn't exist
        print(f"👤 Creating user '{DB_USER}'...")
        admin_cursor.execute(f"""
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '{DB_USER}') THEN
                    CREATE USER {DB_USER} WITH PASSWORD '{DB_PASSWORD}';
                END IF;
            END
            $$;
        """)
        
        # Create database if it doesn't exist
        print(f"🗄️  Creating database '{DB_NAME}'...")
        admin_cursor.execute(f"""
            SELECT 'CREATE DATABASE {DB_NAME} OWNER {DB_USER}'
            WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '{DB_NAME}')\\gexec
        """)
        
        # Grant privileges
        print("🔐 Setting up permissions...")
        admin_cursor.execute(f"GRANT ALL PRIVILEGES ON DATABASE {DB_NAME} TO {DB_USER};")
        admin_cursor.execute(f"ALTER USER {DB_USER} CREATEDB;")
        
        admin_cursor.close()
        admin_conn.close()
        
        # Test connection with new user
        print("🧪 Testing connection...")
        test_conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        test_cursor = test_conn.cursor()
        test_cursor.execute("SELECT version();")
        version = test_cursor.fetchone()
        print(f"✅ PostgreSQL version: {version[0]}")
        
        test_cursor.close()
        test_conn.close()
        
        # Generate DATABASE_URL
        database_url = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
        print(f"\n🎉 PostgreSQL setup completed successfully!")
        print(f"📋 Database URL: {database_url}")
        print(f"\n📝 Add this to your .env file:")
        print(f"DATABASE_URL={database_url}")
        
        return database_url
        
    except Exception as e:
        print(f"❌ PostgreSQL setup failed: {e}")
        return None

if __name__ == "__main__":
    setup_postgres_database()
