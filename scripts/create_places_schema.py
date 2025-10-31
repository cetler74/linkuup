#!/usr/bin/env python3
"""
Script to create the new places schema in PostgreSQL
"""

import psycopg2
import os

# Database connection
postgres_url = "postgresql://carloslarramba@localhost:5432/linkuup_db"

def create_places_schema():
    print("🔄 Creating new places schema...")
    
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
        
        # Create place_images table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS place_images (
                id SERIAL PRIMARY KEY,
                place_id INTEGER NOT NULL REFERENCES places(id) ON DELETE CASCADE,
                image_url VARCHAR(500) NOT NULL,
                alt_text VARCHAR(200),
                is_primary BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        # Create place_services table (many-to-many)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS place_services (
                id SERIAL PRIMARY KEY,
                place_id INTEGER NOT NULL REFERENCES places(id) ON DELETE CASCADE,
                service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
                price DECIMAL(10,2),
                duration INTEGER, -- in minutes
                is_available BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(place_id, service_id)
            );
        """)
        
        # Create place_managers table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS place_managers (
                id SERIAL PRIMARY KEY,
                place_id INTEGER NOT NULL REFERENCES places(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                role VARCHAR(50) DEFAULT 'manager', -- manager, owner, admin
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(place_id, user_id)
            );
        """)
        
        # Create time_slots table (updated for places)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS time_slots (
                id SERIAL PRIMARY KEY,
                place_id INTEGER NOT NULL REFERENCES places(id) ON DELETE CASCADE,
                day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Monday, 6=Sunday
                start_time TIME NOT NULL,
                end_time TIME NOT NULL,
                is_available BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        # Create bookings table (updated for places)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS bookings (
                id SERIAL PRIMARY KEY,
                place_id INTEGER NOT NULL REFERENCES places(id) ON DELETE CASCADE,
                user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                service_id INTEGER REFERENCES services(id) ON DELETE SET NULL,
                customer_name VARCHAR(100) NOT NULL,
                customer_email VARCHAR(100),
                customer_phone VARCHAR(20),
                booking_date DATE NOT NULL,
                start_time TIME NOT NULL,
                end_time TIME NOT NULL,
                status VARCHAR(20) DEFAULT 'pending', -- pending, confirmed, cancelled, completed
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        # Create reviews table (updated for places)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS reviews (
                id SERIAL PRIMARY KEY,
                place_id INTEGER NOT NULL REFERENCES places(id) ON DELETE CASCADE,
                user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
                comment TEXT,
                is_verified BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        # Create indexes for better performance
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_places_tipo ON places(tipo);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_places_cidade ON places(cidade);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_places_regiao ON places(regiao);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_places_is_bio_diamond ON places(is_bio_diamond);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_places_booking_enabled ON places(booking_enabled);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_place_images_place_id ON place_images(place_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_place_services_place_id ON place_services(place_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_place_managers_place_id ON place_managers(place_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_time_slots_place_id ON time_slots(place_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_bookings_place_id ON bookings(place_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_reviews_place_id ON reviews(place_id);")
        
        conn.commit()
        print("✅ Places schema created successfully!")
        
        # Show created tables
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name LIKE 'place%' OR table_name = 'places'
            ORDER BY table_name;
        """)
        tables = cursor.fetchall()
        print(f"📊 Created tables: {[table[0] for table in tables]}")
        
    except Exception as e:
        print(f"❌ Error creating schema: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    create_places_schema()
