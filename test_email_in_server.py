#!/usr/bin/env python3
"""
Test email service in server context
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

def test_email_service_in_server_context():
    """Test email service as it would be called in the server"""
    print("Testing Email Service in Server Context...")
    print("=" * 60)
    
    try:
        # Simulate the exact import and usage from the booking endpoint
        print("📦 Importing EmailService...")
        from backend.email_service import EmailService
        
        print("🔧 Creating EmailService instance...")
        email_service = EmailService()
        
        print(f"🔧 EmailService created:")
        print(f"   Brevo service: {email_service.brevo_service is not None}")
        print(f"   Gmail service: {email_service.gmail_service is not None}")
        
        if email_service.brevo_service:
            print(f"   Brevo API key: {'Set' if email_service.brevo_service.api_key else 'Not set'}")
            print(f"   Brevo sender: {email_service.brevo_service.sender_email}")
        
        # Test sending email
        print("\n📧 Testing email sending...")
        email_data = {
            'customer_name': 'Server Context Test',
            'customer_email': 'cetler74@gmail.com',
            'salon_name': 'Test Salon',
            'booking_date': '2024-01-26',
            'booking_time': '14:00',
            'duration': 30,
            'total_price': 30.0,
            'services': [
                {
                    'service_name': 'Test Service',
                    'service_price': 30.0,
                    'service_duration': 30
                }
            ]
        }
        
        result = email_service.send_booking_request_notification(email_data)
        print(f"📧 Email service result: {result}")
        
        if result:
            print("✅ Email sent successfully!")
            return True
        else:
            print("❌ Email sending failed")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_email_service_in_server_context()
    
    if success:
        print("\n🎉 Email service is working in server context!")
        print("The issue might be that the server needs to be restarted to load the changes.")
    else:
        print("\n❌ Email service is not working in server context.")
        print("There's an issue with the email service initialization.")
