#!/usr/bin/env python3
"""
Test email endpoint to verify email service is working
"""

from fastapi import APIRouter
from email_service import EmailService

router = APIRouter()

@router.get("/test-email")
async def test_email():
    """Test email service endpoint"""
    try:
        print("🔧 DEBUG: Testing email service from endpoint")
        email_service = EmailService()
        print(f"🔧 DEBUG: EmailService created - Brevo: {email_service.brevo_service is not None}")
        
        # Test sending email
        email_data = {
            'customer_name': 'Test Customer',
            'customer_email': 'cetler74@gmail.com',
            'salon_name': 'Test Salon',
            'booking_date': '2024-01-30',
            'booking_time': '18:00',
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
        print(f"🔧 DEBUG: Email result: {result}")
        
        return {
            "status": "success",
            "email_sent": result,
            "brevo_available": email_service.brevo_service is not None,
            "gmail_available": email_service.gmail_service is not None
        }
        
    except Exception as e:
        print(f"❌ DEBUG: Email test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "status": "error",
            "error": str(e)
        }
