#!/usr/bin/env python3
"""
Script to insert sample places data
"""

import psycopg2

# Database connection
postgres_url = "postgresql://carloslarramba@localhost:5432/linkuup_db"

def insert_sample_places():
    print("🔄 Inserting sample places data...")
    
    conn = psycopg2.connect(postgres_url)
    cursor = conn.cursor()
    
    try:
        # Sample places data
        sample_places = [
            {
                'codigo': 'SALON001',
                'nome': 'Salão de Beleza Elegance',
                'tipo': 'salon',
                'pais': 'Portugal',
                'nif': '123456789',
                'estado': 'active',
                'telefone': '+351 21 123 4567',
                'email': 'info@elegance.pt',
                'website': 'https://elegance.pt',
                'instagram': '@elegance_salon',
                'pais_morada': 'Portugal',
                'regiao': 'Lisboa',
                'cidade': 'Lisboa',
                'rua': 'Rua Augusta',
                'porta': '123',
                'cod_postal': '1100-000',
                'latitude': 38.7223,
                'longitude': -9.1393,
                'booking_enabled': True,
                'is_active': True,
                'is_bio_diamond': True,
                'about': 'Salão de beleza especializado em tratamentos de unhas e estética facial.'
            },
            {
                'codigo': 'CLINIC001',
                'nome': 'Clínica de Estética Moderna',
                'tipo': 'clinic',
                'pais': 'Portugal',
                'nif': '987654321',
                'estado': 'active',
                'telefone': '+351 22 987 6543',
                'email': 'info@moderna.pt',
                'website': 'https://moderna.pt',
                'instagram': '@clinica_moderna',
                'pais_morada': 'Portugal',
                'regiao': 'Porto',
                'cidade': 'Porto',
                'rua': 'Rua de Cedofeita',
                'porta': '456',
                'cod_postal': '4050-180',
                'latitude': 41.1579,
                'longitude': -8.6291,
                'booking_enabled': True,
                'is_active': True,
                'is_bio_diamond': False,
                'about': 'Clínica de estética com tratamentos avançados e equipamentos modernos.'
            },
            {
                'codigo': 'OFFICE001',
                'nome': 'Consultório de Medicina Estética',
                'tipo': 'office',
                'pais': 'Portugal',
                'nif': '456789123',
                'estado': 'active',
                'telefone': '+351 23 456 7890',
                'email': 'info@medestetica.pt',
                'website': 'https://medestetica.pt',
                'instagram': '@med_estetica',
                'pais_morada': 'Portugal',
                'regiao': 'Braga',
                'cidade': 'Braga',
                'rua': 'Avenida da Liberdade',
                'porta': '789',
                'cod_postal': '4710-251',
                'latitude': 41.5518,
                'longitude': -8.4229,
                'booking_enabled': True,
                'is_active': True,
                'is_bio_diamond': False,
                'about': 'Consultório especializado em medicina estética e tratamentos dermatológicos.'
            }
        ]
        
        # Insert sample places
        for place in sample_places:
            cursor.execute("""
                INSERT INTO places (
                    codigo, nome, tipo, pais, nif, estado, telefone, email, website, instagram,
                    pais_morada, regiao, cidade, rua, porta, cod_postal, latitude, longitude,
                    booking_enabled, is_active, is_bio_diamond, about
                ) VALUES (
                    %(codigo)s, %(nome)s, %(tipo)s, %(pais)s, %(nif)s, %(estado)s, %(telefone)s, 
                    %(email)s, %(website)s, %(instagram)s, %(pais_morada)s, %(regiao)s, %(cidade)s, 
                    %(rua)s, %(porta)s, %(cod_postal)s, %(latitude)s, %(longitude)s, 
                    %(booking_enabled)s, %(is_active)s, %(is_bio_diamond)s, %(about)s
                );
            """, place)
        
        conn.commit()
        print("✅ Sample places inserted successfully!")
        
        # Verify insertion
        cursor.execute("SELECT COUNT(*) FROM places;")
        places_count = cursor.fetchone()[0]
        print(f"📊 Places table now has {places_count} records")
        
        # Show inserted data
        cursor.execute("SELECT id, nome, tipo, cidade FROM places ORDER BY id;")
        places = cursor.fetchall()
        print("📋 Inserted places:")
        for place in places:
            print(f"  - ID: {place[0]}, Nome: {place[1]}, Tipo: {place[2]}, Cidade: {place[3]}")
        
    except Exception as e:
        print(f"❌ Error inserting data: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    insert_sample_places()
