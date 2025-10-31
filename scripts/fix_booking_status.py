#!/usr/bin/env python3
"""
Migration script to fix booking status defaults.
This script updates existing bookings that were created with 'confirmed' status
to 'pending' status if they were created recently (within the last 30 days).
"""

import sys
import os
from datetime import datetime, timedelta

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app import app, db, Booking

def fix_booking_status():
    """Fix booking status for recent bookings"""
    with app.app_context():
        # Get bookings created in the last 30 days with 'confirmed' status
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        
        recent_confirmed_bookings = Booking.query.filter(
            Booking.status == 'confirmed',
            Booking.created_at >= thirty_days_ago
        ).all()
        
        print(f"Found {len(recent_confirmed_bookings)} recent bookings with 'confirmed' status")
        
        # Update them to 'pending' status
        updated_count = 0
        for booking in recent_confirmed_bookings:
            booking.status = 'pending'
            updated_count += 1
        
        if updated_count > 0:
            db.session.commit()
            print(f"Updated {updated_count} bookings to 'pending' status")
        else:
            print("No bookings needed to be updated")

if __name__ == '__main__':
    fix_booking_status()
