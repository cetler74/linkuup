#!/usr/bin/env python3
"""
Debug booking email issue by testing the email service directly
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

def test_email_service_directly():
    """Test the email service directly without API calls"""
    print("Testing EmailService Directly...")
    print("=" * 50)
    
    try:
        # Import the email service
        from brevo_email_service import BrevoEmailService
        
        # Create service instance
        email_service = BrevoEmailService()
        
        print(f"✅ Email service created")
        print(f"📧 Sender email: {email_service.sender_email}")
        print(f"📧 Sender name: {email_service.sender_name}")
        print(f"🔑 API key configured: {'Yes' if email_service.api_key else 'No'}")
        
        # Test booking request notification
        print("\n📧 Testing booking request notification...")
        
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
            print("📧 Check your email (cetler74@gmail.com) for the notification.")
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
        print(f"❌ Error testing email service: {str(e)}")
        import traceback
        traceback.print_exc()

def test_email_service_wrapper():
    """Test the EmailService wrapper"""
    print("\n" + "=" * 50)
    print("Testing EmailService Wrapper...")
    
    try:
        from email_service import EmailService
        
        # Create service instance
        email_service = EmailService()
        
        print(f"✅ EmailService wrapper created")
        print(f"📧 Brevo service available: {'Yes' if email_service.brevo_service else 'No'}")
        print(f"📧 Gmail service available: {'Yes' if email_service.gmail_service else 'No'}")
        
        # Test booking request notification
        print("\n📧 Testing booking request notification via wrapper...")
        
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
                }
            ]
        }
        
        result = email_service.send_booking_request_notification(booking_data)
        
        if result:
            print("✅ Booking request notification sent successfully via wrapper!")
            print("📧 Check your email (cetler74@gmail.com) for the notification.")
        else:
            print("❌ Failed to send booking request notification via wrapper")
            
    except Exception as e:
        print(f"❌ Error testing email service wrapper: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("Debugging Booking Email Issue")
    print("=" * 60)
    
    # Test direct email service
    test_email_service_directly()
    
    # Test email service wrapper
    test_email_service_wrapper()
    
    print("\n" + "=" * 60)
    print("DEBUGGING COMPLETE")
    print("If emails were sent successfully, the issue might be:")
    print("1. API endpoint not calling email service")
    print("2. Database issues preventing booking creation")
    print("3. Frontend not calling the correct API endpoint")
    print("\nNext steps:")
    print("1. Check your email inbox for test messages")
    print("2. Try creating a booking through the frontend UI")
    print("3. Check server logs for any errors")
