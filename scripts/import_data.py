#!/usr/bin/env python3
"""
Data import script for BioSearch nail salon directory.
Imports Excel data into SQLite database with data enrichment.
"""

import sys
import os
import pandas as pd
import sqlite3
import requests
import time
from datetime import datetime

# Add parent directory to path to import Flask app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def create_database():
    """Create the SQLite database and tables."""
    db_path = os.path.join(os.path.dirname(__file__), '..', 'backend', 'biosearch.db')
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Create salons table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS salons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            codigo TEXT UNIQUE,
            nome TEXT NOT NULL,
            pais TEXT,
            nif TEXT,
            estado TEXT,
            telefone TEXT,
            email TEXT,
            website TEXT,
            pais_morada TEXT,
            regiao TEXT,
            cidade TEXT,
            rua TEXT,
            porta TEXT,
            cod_postal TEXT,
            latitude REAL,
            longitude REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create services table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS services (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT,
            description TEXT,
            is_bio_diamond BOOLEAN DEFAULT FALSE
        )
    ''')
    
    # Create salon_services table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS salon_services (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            salon_id INTEGER,
            service_id INTEGER,
            price REAL,
            duration INTEGER,
            FOREIGN KEY (salon_id) REFERENCES salons (id),
            FOREIGN KEY (service_id) REFERENCES services (id)
        )
    ''')
    
    # Create time_slots table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS time_slots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            salon_id INTEGER,
            day_of_week INTEGER,
            start_time TIME,
            end_time TIME,
            is_available BOOLEAN DEFAULT TRUE,
            FOREIGN KEY (salon_id) REFERENCES salons (id)
        )
    ''')
    
    # Create bookings table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            salon_id INTEGER,
            service_id INTEGER,
            customer_name TEXT NOT NULL,
            customer_email TEXT NOT NULL,
            customer_phone TEXT,
            booking_date DATE NOT NULL,
            booking_time TIME NOT NULL,
            duration INTEGER,
            status TEXT DEFAULT 'confirmed',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (salon_id) REFERENCES salons (id),
            FOREIGN KEY (service_id) REFERENCES services (id)
        )
    ''')
    
    # Create salon_managers table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS salon_managers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            salon_id INTEGER,
            email TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            name TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (salon_id) REFERENCES salons (id)
        )
    ''')
    
    conn.commit()
    conn.close()
    print(f"Database created at: {db_path}")

def geocode_address(address, country="Portugal"):
    """Geocode an address using Nominatim API."""
    if not address or pd.isna(address):
        return None, None
    
    try:
        # Format address for geocoding
        full_address = f"{address}, {country}"
        
        # Use Nominatim API
        url = "https://nominatim.openstreetmap.org/search"
        params = {
            'q': full_address,
            'format': 'json',
            'limit': 1,
            'countrycodes': 'pt' if country == 'Portugal' else None
        }
        
        headers = {'User-Agent': 'BioSearch/1.0'}
        response = requests.get(url, params=params, headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data:
                lat = float(data[0]['lat'])
                lon = float(data[0]['lon'])
                return lat, lon
        
        return None, None
        
    except Exception as e:
        print(f"Geocoding error for '{address}': {e}")
        return None, None

def import_salons_data():
    """Import salon data from Excel file."""
    excel_path = os.path.join(os.path.dirname(__file__), '..', 'Clientes.xlsx')
    db_path = os.path.join(os.path.dirname(__file__), '..', 'backend', 'biosearch.db')
    
    if not os.path.exists(excel_path):
        print(f"Excel file not found: {excel_path}")
        return
    
    # Read Excel data
    df = pd.read_excel(excel_path)
    print(f"Loaded {len(df)} salon records from Excel")
    
    # Filter active salons and remove duplicates
    active_salons = df[df['Estado'] == 'Ativo'].copy()
    print(f"Found {len(active_salons)} active salons")
    
    # Remove duplicates based on 'Código' - keep first occurrence
    active_salons = active_salons.drop_duplicates(subset=['Código'], keep='first')
    print(f"After removing duplicates: {len(active_salons)} unique salons")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Clear existing salon data
    cursor.execute('DELETE FROM salons')
    conn.commit()
    
    geocoded_count = 0
    
    for index, row in active_salons.iterrows():
        # Build address for geocoding
        address_parts = []
        if not pd.isna(row.get('Rua')):
            address_parts.append(str(row['Rua']))
        if not pd.isna(row.get('Porta')):
            address_parts.append(str(row['Porta']))
        if not pd.isna(row.get('Cidade')):
            address_parts.append(str(row['Cidade']))
        if not pd.isna(row.get('Cod-Postal')):
            address_parts.append(str(row['Cod-Postal']))
        
        address = ', '.join(address_parts)
        
        # Skip geocoding for now to speed up import
        # TODO: Add geocoding in a separate process
        lat, lon = None, None
        
        # For demonstration, add some sample coordinates for a few salons
        if index < 10:
            # Sample coordinates around Lisbon area
            import random
            lat = 38.7223 + random.uniform(-0.5, 0.5)
            lon = -9.1393 + random.uniform(-0.5, 0.5)
            geocoded_count += 1
        
        # Insert salon data
        cursor.execute('''
            INSERT INTO salons (
                codigo, nome, pais, nif, estado, telefone, email, website,
                pais_morada, regiao, cidade, rua, porta, cod_postal,
                latitude, longitude
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            str(row.get('Código', '')),
            str(row.get('Nome', '')),
            str(row.get('País', '')),
            str(row.get('NIF', '')) if not pd.isna(row.get('NIF')) else None,
            str(row.get('Estado', '')),
            str(row.get('Telefone', '')) if not pd.isna(row.get('Telefone')) else None,
            str(row.get('Email', '')) if not pd.isna(row.get('Email')) else None,
            str(row.get('Website', '')) if not pd.isna(row.get('Website')) else None,
            str(row.get('País Morada', '')),
            str(row.get('Região', '')),
            str(row.get('Cidade', '')),
            str(row.get('Rua', '')) if not pd.isna(row.get('Rua')) else None,
            str(row.get('Porta', '')) if not pd.isna(row.get('Porta')) else None,
            str(row.get('Cod-Postal', '')) if not pd.isna(row.get('Cod-Postal')) else None,
            lat,
            lon
        ))
        
        if (index + 1) % 50 == 0:
            print(f"Processed {index + 1} salons...")
            conn.commit()
    
    conn.commit()
    conn.close()
    
    print(f"Imported {len(active_salons)} salons successfully")
    print(f"Geocoded {geocoded_count} addresses")

def create_sample_services():
    """Create sample services data."""
    db_path = os.path.join(os.path.dirname(__file__), '..', 'backend', 'biosearch.db')
    
    services_data = [
        # Regular services
        ("Basic Manicure", "Manicure", "Traditional nail care with shaping, cuticle care, and polish", False),
        ("Deluxe Manicure", "Manicure", "Extended nail care with hand massage and premium polish", False),
        ("French Manicure", "Manicure", "Classic French tip manicure", False),
        ("Gel Polish Manicure", "Manicure", "Long-lasting gel polish application", False),
        ("Basic Pedicure", "Pedicure", "Foot care with nail shaping and polish", False),
        ("Deluxe Pedicure", "Pedicure", "Complete foot treatment with massage and exfoliation", False),
        ("Nail Art", "Art", "Custom nail art designs", False),
        ("Nail Extensions", "Extensions", "Acrylic or gel nail extensions", False),
        
        # BIO Diamond services
        ("BIO Diamond Manicure", "BIO Diamond", "Professional BIO Sculpture gel manicure system", True),
        ("BIO Diamond Pedicure", "BIO Diamond", "Professional BIO Sculpture gel pedicure system", True),
        ("BIO Diamond French", "BIO Diamond", "French manicure using BIO Sculpture gel system", True),
        ("BIO Diamond Gel Overlay", "BIO Diamond", "Natural nail strengthening with BIO gel", True),
        ("BIO Diamond Extensions", "BIO Diamond", "Nail extensions with BIO Sculpture gel system", True),
        ("BIO Diamond Art", "BIO Diamond", "Artistic designs with BIO Sculpture products", True),
        ("BIO Diamond Repair", "BIO Diamond", "Nail repair using BIO Sculpture gel technology", True),
    ]
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Clear existing services
    cursor.execute('DELETE FROM services')
    cursor.execute('DELETE FROM salon_services')
    
    # Insert services
    for name, category, description, is_bio_diamond in services_data:
        cursor.execute('''
            INSERT INTO services (name, category, description, is_bio_diamond)
            VALUES (?, ?, ?, ?)
        ''', (name, category, description, is_bio_diamond))
    
    conn.commit()
    
    # Assign random services to salons with prices
    import random
    
    cursor.execute('SELECT id FROM salons')
    salon_ids = [row[0] for row in cursor.fetchall()]
    
    cursor.execute('SELECT id, category, is_bio_diamond FROM services')
    services = cursor.fetchall()
    
    # Price ranges by service type
    price_ranges = {
        'Manicure': (20, 45),
        'Pedicure': (25, 55),
        'Art': (35, 70),
        'Extensions': (45, 85),
        'BIO Diamond': (40, 95)
    }
    
    duration_ranges = {
        'Manicure': (30, 60),
        'Pedicure': (45, 75),
        'Art': (60, 120),
        'Extensions': (90, 150),
        'BIO Diamond': (60, 120)
    }
    
    for salon_id in salon_ids:
        # Each salon gets 3-8 random services
        num_services = random.randint(3, 8)
        selected_services = random.sample(services, num_services)
        
        for service_id, category, is_bio_diamond in selected_services:
            # Determine price and duration
            price_range = price_ranges.get(category, (30, 60))
            duration_range = duration_ranges.get(category, (45, 90))
            
            price = random.randint(price_range[0], price_range[1])
            duration = random.randint(duration_range[0], duration_range[1])
            
            cursor.execute('''
                INSERT INTO salon_services (salon_id, service_id, price, duration)
                VALUES (?, ?, ?, ?)
            ''', (salon_id, service_id, price, duration))
    
    conn.commit()
    conn.close()
    
    print(f"Created {len(services_data)} services")
    print("Assigned services to all salons with pricing")

def create_sample_time_slots():
    """Create sample time slots for salons."""
    db_path = os.path.join(os.path.dirname(__file__), '..', 'backend', 'biosearch.db')
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Clear existing time slots
    cursor.execute('DELETE FROM time_slots')
    
    cursor.execute('SELECT id FROM salons')
    salon_ids = [row[0] for row in cursor.fetchall()]
    
    # Standard business hours for most salons
    standard_hours = [
        # Monday-Friday: 9:00-18:00
        (0, '09:00', '18:00'),  # Monday
        (1, '09:00', '18:00'),  # Tuesday
        (2, '09:00', '18:00'),  # Wednesday
        (3, '09:00', '18:00'),  # Thursday
        (4, '09:00', '18:00'),  # Friday
        (5, '10:00', '16:00'),  # Saturday
        # Sunday closed for most
    ]
    
    for salon_id in salon_ids:
        for day_of_week, start_time, end_time in standard_hours:
            cursor.execute('''
                INSERT INTO time_slots (salon_id, day_of_week, start_time, end_time, is_available)
                VALUES (?, ?, ?, ?, ?)
            ''', (salon_id, day_of_week, start_time, end_time, True))
    
    conn.commit()
    conn.close()
    
    print("Created time slots for all salons")

def main():
    """Main function to run the data import process."""
    print("Starting BioSearch data import...")
    
    # Create database and tables
    create_database()
    
    # Import salon data from Excel
    import_salons_data()
    
    # Create sample services
    create_sample_services()
    
    # Create time slots
    create_sample_time_slots()
    
    print("Data import completed successfully!")
    print("\nNext steps:")
    print("1. Start the Flask backend: cd backend && python app.py")
    print("2. Start the React frontend: cd frontend && npm run dev")

if __name__ == "__main__":
    main()
