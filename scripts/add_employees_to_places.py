#!/usr/bin/env python3
"""
Script to add employees to places that have booking enabled but no employees
"""

import psycopg2
import json
from datetime import datetime

# Database connection
postgres_url = "postgresql://carloslarramba@localhost:5432/linkuup_db"

def add_employees_to_places():
    print("🔄 Adding employees to places...")
    
    conn = psycopg2.connect(postgres_url)
    cursor = conn.cursor()
    
    try:
        # Get places that have booking enabled but no employees
        cursor.execute("""
            SELECT p.id, p.nome, p.tipo
            FROM places p
            LEFT JOIN place_employees pe ON p.id = pe.place_id AND pe.is_active = true
            WHERE p.booking_enabled = true 
            AND p.is_active = true 
            AND pe.id IS NULL
            ORDER BY p.id;
        """)
        
        places_without_employees = cursor.fetchall()
        print(f"📋 Found {len(places_without_employees)} places without employees")
        
        # Sample employees data
        sample_employees = [
            {
                'name': 'Maria Silva',
                'email': 'maria.silva@example.com',
                'phone': '+351 91 234 5678',
                'role': 'Hair Stylist'
            },
            {
                'name': 'Ana Costa',
                'email': 'ana.costa@example.com',
                'phone': '+351 92 345 6789',
                'role': 'Beauty Therapist'
            },
            {
                'name': 'João Santos',
                'email': 'joao.santos@example.com',
                'phone': '+351 93 456 7890',
                'role': 'Nail Technician'
            },
            {
                'name': 'Sofia Oliveira',
                'email': 'sofia.oliveira@example.com',
                'phone': '+351 94 567 8901',
                'role': 'Esthetician'
            },
            {
                'name': 'Pedro Ferreira',
                'email': 'pedro.ferreira@example.com',
                'phone': '+351 95 678 9012',
                'role': 'Massage Therapist'
            }
        ]
        
        # Working hours template (available Monday to Friday, 9 AM to 6 PM)
        working_hours = {
            "monday": {"available": True, "start": "09:00", "end": "18:00"},
            "tuesday": {"available": True, "start": "09:00", "end": "18:00"},
            "wednesday": {"available": True, "start": "09:00", "end": "18:00"},
            "thursday": {"available": True, "start": "09:00", "end": "18:00"},
            "friday": {"available": True, "start": "09:00", "end": "18:00"},
            "saturday": {"available": False},
            "sunday": {"available": False}
        }
        
        # Add employees to each place
        for i, (place_id, place_name, place_type) in enumerate(places_without_employees):
            # Select employee data (cycle through sample employees)
            employee_data = sample_employees[i % len(sample_employees)]
            
            print(f"👤 Adding employee to {place_name} (ID: {place_id})")
            
            cursor.execute("""
                INSERT INTO place_employees (
                    place_id, name, email, phone, role, is_active, working_hours, created_at, updated_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s
                );
            """, (
                place_id,
                employee_data['name'],
                employee_data['email'],
                employee_data['phone'],
                employee_data['role'],
                True,
                json.dumps(working_hours),
                datetime.now(),
                datetime.now()
            ))
        
        conn.commit()
        print("✅ Employees added successfully!")
        
        # Verify the results
        cursor.execute("""
            SELECT p.id, p.nome, COUNT(pe.id) as employee_count
            FROM places p
            LEFT JOIN place_employees pe ON p.id = pe.place_id AND pe.is_active = true
            WHERE p.booking_enabled = true AND p.is_active = true
            GROUP BY p.id, p.nome
            ORDER BY p.id;
        """)
        
        results = cursor.fetchall()
        print("📊 Places with employees after update:")
        for place_id, place_name, employee_count in results:
            print(f"  - {place_name} (ID: {place_id}): {employee_count} employees")
        
    except Exception as e:
        print(f"❌ Error adding employees: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    add_employees_to_places()
