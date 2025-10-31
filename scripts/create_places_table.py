#!/usr/bin/env python3
"""
Simple script to create the places table
"""

import psycopg2

# Database connection
postgres_url = "postgresql://carloslarramba@localhost:5432/linkuup_db"

def create_places_table():
    print("🔄 Creating places table...")
    
    conn = psycopg2.connect(postgres_url)
    cursor = conn.cursor()
    
    try:
        # Create places table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS places (
                id SERIAL PRIMARY KEY,
                codigo VARCHAR(50) UNIQUE,
                nome VARCHAR(200) NOT NULL,
                tipo VARCHAR(50) NOT NULL DEFAULT 'salon', -- salon, clinic, office, etc.
                pais VARCHAR(100),
                nif VARCHAR(50),
                estado VARCHAR(20),
                telefone VARCHAR(20),
                email VARCHAR(100),
                website VARCHAR(200),
                instagram VARCHAR(200),
                pais_morada VARCHAR(100),
                regiao VARCHAR(100),
                cidade VARCHAR(100),
                rua VARCHAR(200),
                porta VARCHAR(20),
                cod_postal VARCHAR(20),
                latitude DOUBLE PRECISION,
                longitude DOUBLE PRECISION,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                owner_id INTEGER REFERENCES users(id),
                booking_enabled BOOLEAN DEFAULT FALSE,
                is_active BOOLEAN DEFAULT TRUE,
                is_bio_diamond BOOLEAN DEFAULT FALSE,
                about TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        # Create basic indexes
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_places_tipo ON places(tipo);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_places_cidade ON places(cidade);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_places_regiao ON places(regiao);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_places_is_bio_diamond ON places(is_bio_diamond);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_places_booking_enabled ON places(booking_enabled);")
        
        conn.commit()
        print("✅ Places table created successfully!")
        
        print("📊 Places table structure created")
        
    except Exception as e:
        print(f"❌ Error creating table: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    create_places_table()
