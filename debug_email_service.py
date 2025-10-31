#!/usr/bin/env python3
"""
Debug email service initialization and sending
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

def test_brevo_service_direct():
    """Test Brevo service directly without dependencies"""
    print("Testing Brevo Service Directly...")
    print("=" * 50)
    
    try:
        import requests
        
        api_key = os.getenv('BREVO_API_KEY')
        if not api_key:
            print("❌ BREVO_API_KEY not found")
            return False
        
        print(f"✅ BREVO_API_KEY found: {api_key[:10]}...")
        
        # Test sending an email
        url = "https://api.brevo.com/v3/smtp/email"
        headers = {
            'api-key': api_key,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
        
        payload = {
            "sender": {
                "name": "LinkUup Debug",
                "email": "cetler74@gmail.com"
            },
            "to": [
                {
                    "email": "cetler74@gmail.com",
                    "name": "Debug Test"
                }
            ],
            "subject": "Debug Test - Email Service Working",
            "htmlContent": "<p>This is a debug test to confirm the Brevo API is working.</p>",
            "textContent": "This is a debug test to confirm the Brevo API is working."
        }
        
        response = requests.post(url, headers=headers, json=payload)
        
        if response.status_code == 201:
            print("✅ Brevo API is working!")
            print(f"   Message ID: {response.text}")
            return True
        else:
            print(f"❌ Brevo API failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Brevo service error: {e}")
        return False

def test_email_service_initialization():
    """Test email service initialization"""
    print("\nTesting Email Service Initialization...")
    print("=" * 50)
    
    try:
        # Test if we can import the modules
        print("📦 Testing imports...")
        
        # Test BrevoEmailService import
        try:
            from brevo_email_service import BrevoEmailService
            print("✅ BrevoEmailService imported successfully")
            
            # Test initialization
            brevo_service = BrevoEmailService()
            print(f"✅ BrevoEmailService initialized")
            print(f"   API Key: {'Set' if brevo_service.api_key else 'Not set'}")
            print(f"   Sender Email: {brevo_service.sender_email}")
            
            # Test sending email
            print("\n📧 Testing email sending...")
            booking_data = {
                'customer_name': 'Debug Test Customer',
                'customer_email': 'cetler74@gmail.com',
                'salon_name': 'Debug Test Salon',
                'booking_date': '2024-01-24',
                'booking_time': '12:00',
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
                print("✅ Email sent successfully via BrevoEmailService!")
                return True
            else:
                print("❌ Email sending failed via BrevoEmailService")
                return False
                
        except Exception as e:
            print(f"❌ BrevoEmailService error: {e}")
            import traceback
            traceback.print_exc()
            return False
            
    except Exception as e:
        print(f"❌ Email service initialization error: {e}")
        return False

def test_booking_endpoint_with_logging():
    """Test booking endpoint with detailed logging"""
    print("\nTesting Booking Endpoint with Logging...")
    print("=" * 50)
    
    import requests
    
    print("📝 Creating test booking...")
    
    booking_data = {
        "salon_id": 2,
        "service_ids": [3],
        "employee_id": 3,
        "customer_name": "Debug Logging Test",
        "customer_email": "cetler74@gmail.com",
        "customer_phone": "+1234567890",
        "booking_date": "2024-01-25",
        "booking_time": "13:00",
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
            print(f"   Customer: {booking['customer_name']}")
            print(f"   Email: {booking['customer_email']}")
            print(f"   Date: {booking['booking_date']} at {booking['booking_time']}")
            print("\n📧 If no email is received, the issue is in the booking endpoint")
            return True
        else:
            print(f"❌ Booking creation failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Booking endpoint error: {e}")
        return False

def main():
    """Main debug function"""
    print("Email Service Debug")
    print("=" * 60)
    
    # Test 1: Direct Brevo API
    brevo_working = test_brevo_service_direct()
    
    # Test 2: Email service initialization
    email_service_working = test_email_service_initialization()
    
    # Test 3: Booking endpoint
    booking_working = test_booking_endpoint_with_logging()
    
    print("\n" + "=" * 60)
    print("DEBUG SUMMARY:")
    print("=" * 60)
    
    print(f"✅ Brevo API Direct: {'Working' if brevo_working else 'Failed'}")
    print(f"✅ Email Service Init: {'Working' if email_service_working else 'Failed'}")
    print(f"✅ Booking Endpoint: {'Working' if booking_working else 'Failed'}")
    
    if brevo_working and email_service_working and booking_working:
        print("\n🎉 All components are working!")
        print("📧 Check your email for test messages")
        print("If you still don't receive emails, there might be a server restart needed")
    else:
        print("\n❌ Some components are failing")
        print("Check the error messages above to identify the issue")

if __name__ == "__main__":
    main()
