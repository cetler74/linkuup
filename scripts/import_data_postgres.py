#!/usr/bin/env python3
"""
Import salon data into PostgreSQL database
"""

import sys
import os
import pandas as pd

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app import app, db, Salon, Service, SalonService, create_default_time_slots
from datetime import datetime

def import_salons():
    """Import salons from Excel file"""
    print("Starting BioSearch data import to PostgreSQL...")
    
    # Path to Excel file
    excel_path = os.path.join(os.path.dirname(__file__), '..', 'Clientes.xlsx')
    
    if not os.path.exists(excel_path):
        print(f"Error: Excel file not found at {excel_path}")
        return False
    
    # Read Excel file
    df = pd.read_excel(excel_path)
    print(f"Loaded {len(df)} salon records from Excel")
    
    # Filter active salons
    active_salons = df[df['Estado'] == 'Ativo']
    print(f"Found {len(active_salons)} active salons")
    
    # Remove duplicates based on name
    active_salons = active_salons.drop_duplicates(subset=['Nome'], keep='first')
    print(f"After removing duplicates: {len(active_salons)} unique salons")
    
    with app.app_context():
        # Import salons
        imported_count = 0
        skipped_count = 0
        for idx, row in active_salons.iterrows():
            # Helper to truncate and clean string values
            def clean_str(val, max_len=None):
                if pd.notna(val):
                    s = str(val).strip()
                    if s and max_len:
                        return s[:max_len]
                    return s if s else None
                return None
            
            # Skip salons without a name (required field)
            nome = clean_str(row.get('Nome', ''), 200)
            if not nome:
                skipped_count += 1
                continue
            
            # Handle empty codigo - set to None instead of empty string to avoid unique constraint violations
            codigo_val = str(row.get('Codigo', '')) if pd.notna(row.get('Codigo')) and str(row.get('Codigo', '')).strip() else None
            
            salon = Salon(
                codigo=codigo_val,
                nome=nome,
                pais=clean_str(row.get('Pais', 'Portugal'), 100),
                nif=clean_str(row.get('NIF'), 50),
                estado='Ativo',
                telefone=clean_str(row.get('Telefone'), 20),
                email=clean_str(row.get('Email'), 100),
                website=clean_str(row.get('Website'), 200),
                pais_morada=clean_str(row.get('Pais (Morada)', 'Portugal'), 100),
                regiao=clean_str(row.get('Regiao'), 100),
                cidade=clean_str(row.get('Cidade'), 100),
                rua=clean_str(row.get('Rua'), 200),
                porta=clean_str(row.get('Porta'), 20),
                cod_postal=clean_str(row.get('Cod. Postal'), 20),
                booking_enabled=False,
                is_active=True,
                is_bio_diamond=False
            )
            
            db.session.add(salon)
            imported_count += 1
            
            if imported_count % 50 == 0:
                print(f"Processed {imported_count} salons...")
                db.session.commit()
        
        db.session.commit()
        print(f"✓ Imported {imported_count} salons successfully")
        if skipped_count > 0:
            print(f"  Skipped {skipped_count} salons without names")
        
        # Create services
        services_data = [
            {'name': 'Manicure', 'category': 'Manicure', 'description': 'Basic manicure service', 'is_bio_diamond': False},
            {'name': 'Pedicure', 'category': 'Pedicure', 'description': 'Basic pedicure service', 'is_bio_diamond': False},
            {'name': 'Gel Polish', 'category': 'Manicure', 'description': 'Gel polish application', 'is_bio_diamond': False},
            {'name': 'Acrylic Nails', 'category': 'Manicure', 'description': 'Acrylic nail extensions', 'is_bio_diamond': False},
            {'name': 'Nail Art', 'category': 'Manicure', 'description': 'Nail art design', 'is_bio_diamond': False},
            {'name': 'Bio Sculpture Manicure', 'category': 'Manicure', 'description': 'Bio Sculpture gel manicure', 'is_bio_diamond': True},
            {'name': 'Bio Sculpture Pedicure', 'category': 'Pedicure', 'description': 'Bio Sculpture gel pedicure', 'is_bio_diamond': True},
        ]
        
        for service_data in services_data:
            service = Service(**service_data)
            db.session.add(service)
        
        db.session.commit()
        print(f"✓ Created {len(services_data)} services")
        
        # Assign services to salons
        services = Service.query.all()
        salons = Salon.query.all()
        
        for salon in salons:
            for service in services:
                # Default pricing
                price = 20.0 if 'Manicure' in service.name else 30.0
                if 'Bio Sculpture' in service.name:
                    price += 10.0
                
                salon_service = SalonService(
                    salon_id=salon.id,
                    service_id=service.id,
                    price=price,
                    duration=45  # 45 minutes default
                )
                db.session.add(salon_service)
            
            # Create time slots for each salon
            create_default_time_slots(salon.id)
        
        db.session.commit()
        print("✓ Assigned services to all salons with pricing")
        print("✓ Created time slots for all salons")
        
    print("\n✓ Data import completed successfully!")
    print("\nNext steps:")
    print("1. Create an admin user: python scripts/create_admin.py")
    print("2. Start the backend server: cd backend && python app.py")
    print("3. Start the frontend server: cd frontend && npm run dev")
    
    return True

if __name__ == '__main__':
    try:
        import_salons()
    except Exception as e:
        print(f"✗ Error importing data: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

