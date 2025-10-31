#!/usr/bin/env python3
"""
Test the EmailService with the updated configuration
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

def test_email_service():
    """Test the EmailService with booking notification"""
    print("Testing EmailService with Updated Configuration...")
    print("=" * 60)
    
    try:
        from email_service import EmailService
        
        # Create EmailService instance
        email_service = EmailService()
        
        # Test booking request notification
        print("📧 Testing booking request notification...")
        
        booking_data = {
            'customer_name': 'Test Customer',
            'customer_email': 'cetler74@gmail.com',
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
        
        result = email_service.send_booking_request_notification(booking_data)
        
        if result:
            print("✅ Booking request notification sent successfully!")
            print("📧 Check your email (cetler74@gmail.com) for the booking notification.")
        else:
            print("❌ Failed to send booking request notification")
            
        # Test booking status notification
        print("\n📧 Testing booking status notification...")
        
        status_data = {
            'customer_name': 'Test Customer',
            'customer_email': 'cetler74@gmail.com',
            'salon_name': 'Test Salon',
            'service_name': 'Haircut',
            'booking_date': '2024-01-15',
            'booking_time': '14:00',
            'duration': 60,
            'status': 'confirmed'
        }
        
        result = email_service.send_booking_status_notification(status_data)
        
        if result:
            print("✅ Booking status notification sent successfully!")
            print("📧 Check your email (cetler74@gmail.com) for the status notification.")
        else:
            print("❌ Failed to send booking status notification")
            
    except Exception as e:
        print(f"❌ Error testing EmailService: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_email_service()
