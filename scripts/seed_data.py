#!/usr/bin/env python3
"""
Script to seed the database with sample data for testing
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app import app, db, Service, Salon, SalonService, TimeSlot, User, hash_password
from datetime import time
import secrets

def seed_data():
    with app.app_context():
        # Create tables if they don't exist
        db.create_all()
        
        # Check if data already exists
        if Service.query.first():
            print("Data already exists, skipping seed...")
            return
        
        print("Seeding database with sample data...")
        
        # Create a sample user first
        user = User(
            name="Demo Manager",
            email="demo@example.com",
            password_hash=hash_password("demo123"),
            auth_token=secrets.token_hex(32)
        )
        db.session.add(user)
        db.session.commit()
        print(f"Created user: {user.name}")
        
        # Create sample services
        services = [
            Service(
                name="BIO Diamond Gel",
                category="Manicure",
                description="Premium gel nail treatment with BIO Diamond technology",
                is_bio_diamond=True
            ),
            Service(
                name="French Manicure",
                category="Manicure", 
                description="Classic French style manicure",
                is_bio_diamond=False
            ),
            Service(
                name="BIO Diamond Pedicure",
                category="Pedicure",
                description="Premium foot treatment with BIO Diamond technology",
                is_bio_diamond=True
            ),
            Service(
                name="Regular Manicure",
                category="Manicure",
                description="Standard manicure service",
                is_bio_diamond=False
            ),
            Service(
                name="Regular Pedicure",
                category="Pedicure",
                description="Standard pedicure service",
                is_bio_diamond=False
            ),
            Service(
                name="Nail Art",
                category="Art",
                description="Custom nail art and design",
                is_bio_diamond=False
            )
        ]
        
        for service in services:
            db.session.add(service)
        
        db.session.commit()
        print(f"Created {len(services)} services")
        
        # Create sample salon with owner
        salon = Salon(
            nome="Bio Beauty Salon",
            cidade="Lisboa",
            regiao="Lisboa",
            telefone="+351 211 234 567",
            email="info@biobeauty.pt",
            website="www.biobeauty.pt",
            rua="Rua das Flores",
            porta="123",
            cod_postal="1200-001",
            pais="Portugal",
            estado="Ativo",
            owner_id=user.id
        )
        
        db.session.add(salon)
        db.session.commit()
        print(f"Created salon: {salon.nome}")
        
        # Add services to salon
        salon_services = [
            SalonService(salon_id=salon.id, service_id=1, price=45.00, duration=90),  # BIO Diamond Gel
            SalonService(salon_id=salon.id, service_id=2, price=25.00, duration=60),  # French Manicure
            SalonService(salon_id=salon.id, service_id=3, price=55.00, duration=120), # BIO Diamond Pedicure
            SalonService(salon_id=salon.id, service_id=4, price=20.00, duration=45),  # Regular Manicure
            SalonService(salon_id=salon.id, service_id=5, price=30.00, duration=75),  # Regular Pedicure
        ]
        
        for salon_service in salon_services:
            db.session.add(salon_service)
        
        db.session.commit()
        print(f"Added {len(salon_services)} services to salon")
        
        # Create time slots for all salons (Monday to Friday, 9 AM to 6 PM)
        all_salons = Salon.query.all()
        total_time_slots = 0
        
        for salon in all_salons:
            time_slots = []
            for day in range(5):  # Monday to Friday (0-4)
                time_slots.append(TimeSlot(
                    salon_id=salon.id,
                    day_of_week=day,
                    start_time=time(9, 0),
                    end_time=time(18, 0),
                    is_available=True
                ))
            
            # Saturday (10 AM to 4 PM)
            time_slots.append(TimeSlot(
                salon_id=salon.id,
                day_of_week=5,  # Saturday
                start_time=time(10, 0),
                end_time=time(16, 0),
                is_available=True
            ))
            
            # Sunday is closed (no time slots)
            
            for time_slot in time_slots:
                db.session.add(time_slot)
            
            total_time_slots += len(time_slots)
        
        db.session.commit()
        print(f"Created {total_time_slots} time slots for {len(all_salons)} salons")
        
        print("Database seeded successfully!")

if __name__ == "__main__":
    seed_data()
