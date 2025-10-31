#!/usr/bin/env python3
"""
Script to update Regular Manicure service to 45 minutes.
"""

import sys
import os

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app import app, db, SalonService

def update_45min_service():
    """Update Regular Manicure service duration to 45 minutes"""
    with app.app_context():
        try:
            # Find the Regular Manicure service for salon 2
            salon_service = SalonService.query.filter(
                SalonService.salon_id == 2,
                SalonService.service_id == 4
            ).first()
            
            if salon_service:
                print(f"Current duration: {salon_service.duration} minutes")
                salon_service.duration = 45
                db.session.commit()
                print(f"Updated Regular Manicure service duration to 45 minutes")
            else:
                print("Regular Manicure service not found for salon 2")
                
        except Exception as e:
            print(f"Error updating service: {e}")

if __name__ == '__main__':
    update_45min_service()
