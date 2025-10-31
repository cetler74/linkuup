#!/usr/bin/env python3
"""
Script to migrate salon data to places table
"""

import psycopg2

# Database connection
postgres_url = "postgresql://carloslarramba@localhost:5432/linkuup_db"

def migrate_salons_to_places():
    print("🔄 Migrating salons to places...")
    
    conn = psycopg2.connect(postgres_url)
    cursor = conn.cursor()
    
    try:
        # Check if salons table exists and has data
        cursor.execute("SELECT COUNT(*) FROM salons;")
        salon_count = cursor.fetchone()[0]
        print(f"📊 Found {salon_count} salons to migrate")
        
        if salon_count == 0:
            print("⚠️ No salons found to migrate")
            return
        
        # Migrate salons to places
        cursor.execute("""
            INSERT INTO places (
                id, codigo, nome, tipo, pais, nif, estado, telefone, email, website, instagram,
                pais_morada, regiao, cidade, rua, porta, cod_postal, latitude, longitude,
                created_at, owner_id, booking_enabled, is_active, is_bio_diamond, about, updated_at
            )
            SELECT 
                id, codigo, nome, 'salon' as tipo, pais, nif, estado, telefone, email, website, instagram,
                pais_morada, regiao, cidade, rua, porta, cod_postal, latitude, longitude,
                created_at, owner_id, booking_enabled, is_active, is_bio_diamond, about, updated_at
            FROM salons;
        """)
        
        # Update the sequence for places table
        cursor.execute("SELECT setval('places_id_seq', (SELECT MAX(id) FROM places));")
        
        conn.commit()
        print("✅ Salons migrated to places successfully!")
        
        # Verify migration
        cursor.execute("SELECT COUNT(*) FROM places;")
        places_count = cursor.fetchone()[0]
        print(f"📊 Places table now has {places_count} records")
        
        # Show sample data
        cursor.execute("SELECT id, nome, tipo, cidade FROM places LIMIT 5;")
        samples = cursor.fetchall()
        print("📋 Sample places:")
        for sample in samples:
            print(f"  - ID: {sample[0]}, Nome: {sample[1]}, Tipo: {sample[2]}, Cidade: {sample[3]}")
        
    except Exception as e:
        print(f"❌ Error migrating data: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_salons_to_places()
