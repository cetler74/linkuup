#!/usr/bin/env python3
"""
Script to update service duration for BIO Diamond Gel service.
"""

import sys
import os

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app import app, db, SalonService

def update_service_duration():
    """Update BIO Diamond Gel service duration to 90 minutes"""
    with app.app_context():
        try:
            # Find the BIO Diamond Gel service for salon 2
            salon_service = SalonService.query.filter(
                SalonService.salon_id == 2,
                SalonService.service_id == 1
            ).first()
            
            if salon_service:
                print(f"Current duration: {salon_service.duration} minutes")
                salon_service.duration = 90
                salon_service.price = 45.0  # Also update price to match frontend
                db.session.commit()
                print(f"Updated BIO Diamond Gel service duration to 90 minutes and price to €45")
            else:
                print("BIO Diamond Gel service not found for salon 2")
                
        except Exception as e:
            print(f"Error updating service: {e}")

if __name__ == '__main__':
    update_service_duration()
