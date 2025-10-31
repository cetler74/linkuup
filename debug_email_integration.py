#!/usr/bin/env python3
"""
Debug email integration in booking creation
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add backend to path
backend_path = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_path))

def test_email_service_import():
    """Test if we can import the email service"""
    print("Testing Email Service Import...")
    print("=" * 50)
    
    try:
        from email_service import EmailService
        print("✅ EmailService imported successfully")
        
        # Test initialization
        email_service = EmailService()
        print(f"✅ EmailService initialized")
        print(f"   Brevo service: {'Available' if email_service.brevo_service else 'Not available'}")
        print(f"   Gmail service: {'Available' if email_service.gmail_service else 'Not available'}")
        
        return email_service
        
    except Exception as e:
        print(f"❌ Failed to import EmailService: {e}")
        import traceback
        traceback.print_exc()
        return None

def test_brevo_service_direct():
    """Test Brevo service directly"""
    print("\nTesting Brevo Service Directly...")
    print("=" * 50)
    
    try:
        from brevo_email_service import BrevoEmailService
        print("✅ BrevoEmailService imported successfully")
        
        brevo_service = BrevoEmailService()
        print(f"✅ BrevoEmailService initialized")
        print(f"   API Key: {'Set' if brevo_service.api_key else 'Not set'}")
        print(f"   Sender Email: {brevo_service.sender_email}")
        print(f"   Sender Name: {brevo_service.sender_name}")
        
        # Test sending an email
        print("\n📧 Testing email sending...")
        booking_data = {
            'customer_name': 'Debug Test Customer',
            'customer_email': 'cetler74@gmail.com',
            'salon_name': 'Debug Test Salon',
            'booking_date': '2024-01-19',
            'booking_time': '16:00',
            'duration': 30,
            'total_price': 30.0,
            'services': [
                {
                    'service_name': 'Debug Test Service',
                    'service_price': 30.0,
                    'service_duration': 30
                }
            ]
        }
        
        result = brevo_service.send_booking_request_notification(booking_data)
        
        if result:
            print("✅ Email sent successfully via Brevo!")
            print(f"   Response: {result}")
        else:
            print("❌ Email sending failed via Brevo")
            
        return brevo_service
        
    except Exception as e:
        print(f"❌ Failed to test Brevo service: {e}")
        import traceback
        traceback.print_exc()
        return None

def test_email_service_wrapper():
    """Test the email service wrapper"""
    print("\nTesting Email Service Wrapper...")
    print("=" * 50)
    
    try:
        from email_service import EmailService
        
        email_service = EmailService()
        
        # Test sending an email
        print("📧 Testing email sending via wrapper...")
        booking_data = {
            'customer_name': 'Debug Test Customer 2',
            'customer_email': 'cetler74@gmail.com',
            'salon_name': 'Debug Test Salon 2',
            'booking_date': '2024-01-19',
            'booking_time': '17:00',
            'duration': 30,
            'total_price': 30.0,
            'services': [
                {
                    'service_name': 'Debug Test Service 2',
                    'service_price': 30.0,
                    'service_duration': 30
                }
            ]
        }
        
        result = email_service.send_booking_request_notification(booking_data)
        
        if result:
            print("✅ Email sent successfully via wrapper!")
            print(f"   Response: {result}")
        else:
            print("❌ Email sending failed via wrapper")
            
        return email_service
        
    except Exception as e:
        print(f"❌ Failed to test email service wrapper: {e}")
        import traceback
        traceback.print_exc()
        return None

def test_booking_endpoint_email():
    """Test if the booking endpoint is calling email service"""
    print("\nTesting Booking Endpoint Email Integration...")
    print("=" * 50)
    
    import requests
    
    # Create a booking and check if email is sent
    print("📝 Creating test booking...")
    
    booking_data = {
        "salon_id": 2,
        "service_ids": [3],
        "employee_id": 3,
        "customer_name": "Debug Endpoint Test",
        "customer_email": "cetler74@gmail.com",
        "customer_phone": "+1234567890",
        "booking_date": "2024-01-20",
        "booking_time": "18:00",
        "any_employee_selected": False
    }
    
    try:
        response = requests.post(
            "http://localhost:5001/api/v1/places/2/bookings",
            json=booking_data
        )
        
        if response.status_code == 201:
            booking = response.json()
            print(f"✅ Booking created successfully (ID: {booking['id']})")
            print("📧 Check your email for the notification...")
            print("   If no email received, there's an issue with the email integration")
        else:
            print(f"❌ Booking creation failed: {response.status_code}")
            print(f"   Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Failed to create booking: {e}")

def main():
    """Main debug function"""
    print("Email Integration Debug")
    print("=" * 60)
    
    # Test 1: Email service import
    email_service = test_email_service_import()
    
    # Test 2: Brevo service direct
    brevo_service = test_brevo_service_direct()
    
    # Test 3: Email service wrapper
    wrapper_service = test_email_service_wrapper()
    
    # Test 4: Booking endpoint
    test_booking_endpoint_email()
    
    print("\n" + "=" * 60)
    print("DEBUG SUMMARY:")
    print("=" * 60)
    
    if email_service:
        print("✅ EmailService: Working")
    else:
        print("❌ EmailService: Failed")
        
    if brevo_service:
        print("✅ Brevo Service: Working")
    else:
        print("❌ Brevo Service: Failed")
        
    if wrapper_service:
        print("✅ Email Wrapper: Working")
    else:
        print("❌ Email Wrapper: Failed")
    
    print("\n📧 Check your email (cetler74@gmail.com) for test messages")
    print("If you received emails from the direct tests but not from the booking endpoint,")
    print("then the issue is in the booking endpoint email integration.")

if __name__ == "__main__":
    main()
