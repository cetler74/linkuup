#!/usr/bin/env python3
"""
Script to migrate data from SQLite to PostgreSQL
"""

import sqlite3
import psycopg2
import os
from datetime import datetime

# Database connections
sqlite_path = os.path.expanduser("~/linkuup.db")
postgres_url = "postgresql://carloslarramba@localhost:5432/linkuup_db"

def migrate_data():
    print("🔄 Starting migration from SQLite to PostgreSQL...")
    
    # Connect to SQLite
    sqlite_conn = sqlite3.connect(sqlite_path)
    sqlite_cursor = sqlite_conn.cursor()
    
    # Connect to PostgreSQL
    postgres_conn = psycopg2.connect(postgres_url)
    postgres_cursor = postgres_conn.cursor()
    
    try:
        # Migrate salons
        print("📊 Migrating salons...")
        sqlite_cursor.execute("SELECT * FROM salons")
        salons = sqlite_cursor.fetchall()
        
        for salon in salons:
            postgres_cursor.execute("""
                INSERT INTO salons (id, codigo, nome, pais, nif, estado, telefone, email, website, 
                                  pais_morada, regiao, cidade, rua, porta, cod_postal, latitude, longitude, 
                                  created_at, is_bio_diamond, about, instagram)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING
            """, salon)
        
        print(f"✅ Migrated {len(salons)} salons")
        
        # Migrate services
        print("📊 Migrating services...")
        sqlite_cursor.execute("SELECT * FROM services")
        services = sqlite_cursor.fetchall()
        
        for service in services:
            postgres_cursor.execute("""
                INSERT INTO services (id, name, category, description, is_bio_diamond, price, duration)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING
            """, service)
        
        print(f"✅ Migrated {len(services)} services")
        
        # Migrate salon_services
        print("📊 Migrating salon_services...")
        sqlite_cursor.execute("SELECT * FROM salon_services")
        salon_services = sqlite_cursor.fetchall()
        
        for salon_service in salon_services:
            postgres_cursor.execute("""
                INSERT INTO salon_services (id, salon_id, service_id, price, duration)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING
            """, salon_service)
        
        print(f"✅ Migrated {len(salon_services)} salon_services")
        
        # Migrate users
        print("📊 Migrating users...")
        sqlite_cursor.execute("SELECT * FROM users")
        users = sqlite_cursor.fetchall()
        
        for user in users:
            postgres_cursor.execute("""
                INSERT INTO users (id, email, password_hash, name, customer_id, auth_token, is_admin, 
                                 is_active, created_at, refresh_token, token_expires_at, refresh_token_expires_at, 
                                 last_login_at, updated_at, gdpr_data_processing_consent, gdpr_data_processing_consent_date, 
                                 gdpr_marketing_consent, gdpr_marketing_consent_date, gdpr_consent_version)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING
            """, user)
        
        print(f"✅ Migrated {len(users)} users")
        
        # Commit all changes
        postgres_conn.commit()
        print("🎉 Migration completed successfully!")
        
        # Verify migration
        postgres_cursor.execute("SELECT COUNT(*) FROM salons")
        salon_count = postgres_cursor.fetchone()[0]
        print(f"📊 PostgreSQL now has {salon_count} salons")
        
    except Exception as e:
        print(f"❌ Error during migration: {e}")
        postgres_conn.rollback()
        raise
    finally:
        sqlite_conn.close()
        postgres_conn.close()

if __name__ == "__main__":
    migrate_data()