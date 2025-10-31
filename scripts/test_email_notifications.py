#!/usr/bin/env python3
"""
Test Email Notifications Script
Tests the email notification system for bookings
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from backend.app import app, db
from backend.email_service import email_service
from backend.app import Salon, Service, Booking
from datetime import datetime, date, time

def test_email_notifications():
    """Test email notification functionality"""
    
    print("🧪 Testing Email Notification System")
    print("=" * 50)
    
    with app.app_context():
        # Test 1: Booking Request Notification
        print("\n1. Testing Booking Request Notification...")
        
        booking_data = {
            'customer_name': 'Test Customer',
            'customer_email': 'test@example.com',  # Use a test email
            'salon_name': 'Test Salon',
            'service_name': 'Hair Cut',
            'booking_date': '2025-09-15',
            'booking_time': '14:00',
            'duration': 60
        }
        
        try:
            result = email_service.send_booking_request_notification(booking_data)
            if result:
                print("✅ Booking request notification test passed")
            else:
                print("❌ Booking request notification test failed")
        except Exception as e:
            print(f"❌ Booking request notification test failed: {str(e)}")
        
        # Test 2: Booking Status Notification (Confirmed)
        print("\n2. Testing Booking Status Notification (Confirmed)...")
        
        status_data = {
            'customer_name': 'Test Customer',
            'customer_email': 'test@example.com',
            'salon_name': 'Test Salon',
            'service_name': 'Hair Cut',
            'booking_date': '2025-09-15',
            'booking_time': '14:00',
            'duration': 60,
            'status': 'confirmed'
        }
        
        try:
            result = email_service.send_booking_status_notification(status_data)
            if result:
                print("✅ Booking status notification (confirmed) test passed")
            else:
                print("❌ Booking status notification (confirmed) test failed")
        except Exception as e:
            print(f"❌ Booking status notification (confirmed) test failed: {str(e)}")
        
        # Test 3: Booking Status Notification (Cancelled)
        print("\n3. Testing Booking Status Notification (Cancelled)...")
        
        status_data['status'] = 'cancelled'
        
        try:
            result = email_service.send_booking_status_notification(status_data)
            if result:
                print("✅ Booking status notification (cancelled) test passed")
            else:
                print("❌ Booking status notification (cancelled) test failed")
        except Exception as e:
            print(f"❌ Booking status notification (cancelled) test failed: {str(e)}")
        
        print("\n" + "=" * 50)
        print("📧 Email notification tests completed!")
        print("\nNote: If you see errors above, check your email configuration:")
        print("- MAIL_SERVER, MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD")
        print("- Make sure you're using an app password for Gmail")

if __name__ == "__main__":
    test_email_notifications()
