#!/usr/bin/env python3
"""
Simple migration script from SQLite to PostgreSQL
"""

import sqlite3
import psycopg2
import os

# Database connections
sqlite_path = os.path.expanduser("~/linkuup.db")
postgres_url = "postgresql://carloslarramba@localhost:5432/linkuup_db"

def migrate_salons():
    print("🔄 Migrating salons...")
    
    # Connect to SQLite
    sqlite_conn = sqlite3.connect(sqlite_path)
    sqlite_cursor = sqlite_conn.cursor()
    
    # Connect to PostgreSQL
    postgres_conn = psycopg2.connect(postgres_url)
    postgres_cursor = postgres_conn.cursor()
    
    try:
        # Get salons from SQLite
        sqlite_cursor.execute("SELECT id, codigo, nome, pais, nif, estado, telefone, email, website, instagram, pais_morada, regiao, cidade, rua, porta, cod_postal, latitude, longitude, created_at, owner_id, booking_enabled, is_active, is_bio_diamond, about FROM salons")
        salons = sqlite_cursor.fetchall()
        
        print(f"Found {len(salons)} salons in SQLite")
        
        # Insert into PostgreSQL
        for salon in salons:
            # Convert data types properly
            salon_data = list(salon)
            # owner_id (index 19) should be integer or None
            salon_data[19] = salon_data[19] if salon_data[19] is not None else None
            # booking_enabled (index 20) should be boolean
            salon_data[20] = bool(salon_data[20]) if salon_data[20] is not None else False
            # is_active (index 21) should be boolean  
            salon_data[21] = bool(salon_data[21]) if salon_data[21] is not None else True
            # is_bio_diamond (index 22) should be boolean
            salon_data[22] = bool(salon_data[22]) if salon_data[22] is not None else False
            
            postgres_cursor.execute("""
                INSERT INTO salons (id, codigo, nome, pais, nif, estado, telefone, email, website, 
                                  instagram, pais_morada, regiao, cidade, rua, porta, cod_postal, 
                                  latitude, longitude, created_at, owner_id, booking_enabled, is_active, 
                                  is_bio_diamond, about)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING
            """, salon_data)
        
        postgres_conn.commit()
        print(f"✅ Migrated {len(salons)} salons to PostgreSQL")
        
        # Verify
        postgres_cursor.execute("SELECT COUNT(*) FROM salons")
        count = postgres_cursor.fetchone()[0]
        print(f"📊 PostgreSQL now has {count} salons")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        postgres_conn.rollback()
    finally:
        sqlite_conn.close()
        postgres_conn.close()

if __name__ == "__main__":
    migrate_salons()
