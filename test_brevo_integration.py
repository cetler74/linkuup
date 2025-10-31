#!/usr/bin/env python3
"""
Test script for Brevo email integration
Run this to test if Brevo email service is working correctly
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Add backend to path
backend_path = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_path))

from brevo_email_service import brevo_email_service

def test_brevo_integration():
    """Test Brevo email service integration"""
    print("Testing Brevo Email Integration...")
    print("=" * 50)
    
    # Check if API key is configured
    api_key = os.getenv('BREVO_API_KEY')
    if not api_key:
        print("❌ BREVO_API_KEY not found in environment variables")
        print("Please set BREVO_API_KEY in your .env file")
        return False
    
    print(f"✅ BREVO_API_KEY found: {api_key[:10]}...")
    
    # Test booking request notification
    print("\nTesting booking request notification...")
    booking_data = {
        'customer_name': 'Test Customer',
        'customer_email': 'cetler74@gmail.com',  # Change this to a real email for testing
        'salon_name': 'Test Salon',
        'booking_date': '2024-01-15',
        'booking_time': '14:00',
        'duration': 60,
        'total_price': 50.0,
        'services': [
            {
                'service_name': 'Haircut',
                'service_price': 30.0,
                'service_duration': 30
            },
            {
                'service_name': 'Styling',
                'service_price': 20.0,
                'service_duration': 30
            }
        ]
    }
    
    try:
        result = brevo_email_service.send_booking_request_notification(booking_data)
        if result:
            print("✅ Booking request notification sent successfully")
        else:
            print("❌ Failed to send booking request notification")
    except Exception as e:
        print(f"❌ Error sending booking request notification: {str(e)}")
    
    # Test booking status notification
    print("\nTesting booking status notification...")
    status_data = {
        'customer_name': 'Test Customer',
        'customer_email': 'test@example.com',  # Change this to a real email for testing
        'salon_name': 'Test Salon',
        'service_name': 'Haircut',
        'booking_date': '2024-01-15',
        'booking_time': '14:00',
        'duration': 60,
        'status': 'confirmed'
    }
    
    try:
        result = brevo_email_service.send_booking_status_notification(status_data)
        if result:
            print("✅ Booking status notification sent successfully")
        else:
            print("❌ Failed to send booking status notification")
    except Exception as e:
        print(f"❌ Error sending booking status notification: {str(e)}")
    
    print("\n" + "=" * 50)
    print("Brevo integration test completed!")
    print("\nNote: If you want to test with real emails, update the email addresses in this script")
    print("and make sure your Brevo API key has the correct permissions.")

if __name__ == "__main__":
    test_brevo_integration()
