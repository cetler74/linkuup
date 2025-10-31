#!/usr/bin/env python3
"""
Script to update existing salons to have booking disabled by default.
This script should be run after changing the default value in the database model.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app import app, db, Salon

def update_existing_salons():
    """Update existing salons to have booking disabled by default"""
    with app.app_context():
        # Get all salons that currently have booking enabled
        salons_with_booking = Salon.query.filter_by(booking_enabled=True).all()
        
        print(f"Found {len(salons_with_booking)} salons with booking currently enabled")
        
        if len(salons_with_booking) > 0:
            # Ask for confirmation
            response = input("Do you want to disable booking for all existing salons? (y/N): ")
            if response.lower() == 'y':
                for salon in salons_with_booking:
                    salon.booking_enabled = False
                    print(f"Disabled booking for salon: {salon.nome}")
                
                db.session.commit()
                print(f"Successfully disabled booking for {len(salons_with_booking)} salons")
            else:
                print("No changes made to existing salons")
        else:
            print("No salons found with booking enabled")

if __name__ == "__main__":
    update_existing_salons()
