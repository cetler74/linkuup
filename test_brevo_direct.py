#!/usr/bin/env python3
"""
Test Brevo API directly to verify email sending works
"""

import os
import requests
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def test_brevo_booking_email():
    """Test Brevo API with booking notification email"""
    print("Testing Brevo API for Booking Email...")
    print("=" * 50)
    
    # Get API key from environment
    api_key = os.getenv('BREVO_API_KEY')
    if not api_key:
        print("❌ BREVO_API_KEY not found in environment variables")
        return False
    
    print(f"✅ BREVO_API_KEY found: {api_key[:10]}...")
    
    # Test booking request notification
    print("\n📧 Testing booking request notification...")
    
    url = "https://api.brevo.com/v3/smtp/email"
    headers = {
        'api-key': api_key,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
    
    # Booking request notification payload
    payload = {
        "sender": {
            "name": "LinkUup",
            "email": "cetler74@gmail.com"  # Verified sender
        },
        "to": [
            {
                "email": "cetler74@gmail.com",
                "name": "Test Customer"
            }
        ],
        "subject": "Booking Request Received - LinkUup",
        "htmlContent": """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Booking Request Received</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #2a2a2e; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                .booking-details { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2a2a2e; }
                .status-pending { color: #f39c12; font-weight: bold; }
                .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Booking Request Received</h1>
                <p>Thank you for choosing LinkUup!</p>
            </div>
            
            <div class="content">
                <p>Dear Test Customer,</p>
                
                <p>Thank you for your booking request! We have received your appointment request and will send you a confirmation shortly.</p>
                
                <div class="booking-details">
                    <h3>Booking Details</h3>
                    <p><strong>Salon:</strong> Test Salon</p>
                    <p><strong>Services:</strong></p>
                    <ul>
                        <li><strong>Haircut</strong> - €30.00 (30 minutes)</li>
                        <li><strong>Styling</strong> - €20.00 (30 minutes)</li>
                    </ul>
                    <p><strong>Date:</strong> 2024-01-15</p>
                    <p><strong>Time:</strong> 14:00</p>
                    <p><strong>Total Duration:</strong> 60 minutes</p>
                    <p><strong>Total Price:</strong> €50.00</p>
                    <p><strong>Status:</strong> <span class="status-pending">Pending Confirmation</span></p>
                </div>
                
                <p>Our salon team will review your request and send you a confirmation email within 24 hours.</p>
                
                <p>If you have any questions, please don't hesitate to contact us.</p>
                
                <p>Best regards,<br>
                The LinkUup Team</p>
            </div>
            
            <div class="footer">
                <p>This is an automated message. Please do not reply to this email.</p>
            </div>
        </body>
        </html>
        """,
        "textContent": """
        Booking Request Received - LinkUup
        
        Dear Test Customer,
        
        Thank you for your booking request! We have received your appointment request and will send you a confirmation shortly.
        
        Booking Details:
        - Salon: Test Salon
        - Services:
          - Haircut - €30.00 (30 minutes)
          - Styling - €20.00 (30 minutes)
        - Date: 2024-01-15
        - Time: 14:00
        - Total Duration: 60 minutes
        - Total Price: €50.00
        - Status: Pending Confirmation
        
        Our salon team will review your request and send you a confirmation email within 24 hours.
        
        If you have any questions, please don't hesitate to contact us.
        
        Best regards,
        The LinkUup Team
        
        This is an automated message. Please do not reply to this email.
        """
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload)
        
        if response.status_code == 201:
            print("✅ Booking request notification sent successfully!")
            print(f"Message ID: {response.text}")
            print("📧 Check your email (cetler74@gmail.com) for the booking notification.")
            return True
        else:
            print(f"❌ Failed to send booking request notification. Status: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error sending booking request notification: {str(e)}")
        return False

def test_booking_confirmation_email():
    """Test booking confirmation email"""
    print("\n" + "=" * 50)
    print("Testing Booking Confirmation Email...")
    
    api_key = os.getenv('BREVO_API_KEY')
    url = "https://api.brevo.com/v3/smtp/email"
    headers = {
        'api-key': api_key,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
    
    # Booking confirmation payload
    payload = {
        "sender": {
            "name": "LinkUup",
            "email": "cetler74@gmail.com"  # Verified sender
        },
        "to": [
            {
                "email": "cetler74@gmail.com",
                "name": "Test Customer"
            }
        ],
        "subject": "Booking Confirmed - LinkUup",
        "htmlContent": """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Booking Confirmed</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #2a2a2e; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                .booking-details { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #27ae60; }
                .status-confirmed { color: #27ae60; font-weight: bold; }
                .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Booking Confirmed</h1>
            </div>
            
            <div class="content">
                <p>Dear Test Customer,</p>
                
                <p>Great news! Your booking has been confirmed. We look forward to seeing you!</p>
                
                <div class="booking-details">
                    <h3>Booking Details</h3>
                    <p><strong>Salon:</strong> Test Salon</p>
                    <p><strong>Service:</strong> Haircut</p>
                    <p><strong>Date:</strong> 2024-01-15</p>
                    <p><strong>Time:</strong> 14:00</p>
                    <p><strong>Duration:</strong> 60 minutes</p>
                    <p><strong>Status:</strong> <span class="status-confirmed">Confirmed</span></p>
                </div>
                
                <p>If you have any questions or need to make changes, please contact us.</p>
                
                <p>Best regards,<br>
                The LinkUup Team</p>
            </div>
            
            <div class="footer">
                <p>This is an automated message. Please do not reply to this email.</p>
            </div>
        </body>
        </html>
        """,
        "textContent": """
        Booking Confirmed - LinkUup
        
        Dear Test Customer,
        
        Great news! Your booking has been confirmed. We look forward to seeing you!
        
        Booking Details:
        - Salon: Test Salon
        - Service: Haircut
        - Date: 2024-01-15
        - Time: 14:00
        - Duration: 60 minutes
        - Status: Confirmed
        
        If you have any questions or need to make changes, please contact us.
        
        Best regards,
        The LinkUup Team
        
        This is an automated message. Please do not reply to this email.
        """
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload)
        
        if response.status_code == 201:
            print("✅ Booking confirmation email sent successfully!")
            print(f"Message ID: {response.text}")
            print("📧 Check your email (cetler74@gmail.com) for the confirmation email.")
            return True
        else:
            print(f"❌ Failed to send booking confirmation email. Status: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error sending booking confirmation email: {str(e)}")
        return False

if __name__ == "__main__":
    print("Testing Brevo Email for Booking Notifications")
    print("=" * 60)
    
    # Test booking request email
    booking_success = test_brevo_booking_email()
    
    # Test booking confirmation email
    confirmation_success = test_booking_confirmation_email()
    
    print("\n" + "=" * 60)
    print("TEST RESULTS:")
    print(f"✅ Booking Request Email: {'PASS' if booking_success else 'FAIL'}")
    print(f"✅ Booking Confirmation Email: {'PASS' if confirmation_success else 'FAIL'}")
    
    if booking_success and confirmation_success:
        print("\n🎉 All email tests passed!")
        print("📧 Check your email (cetler74@gmail.com) for both test messages.")
        print("\nIf you received the emails, the issue is likely in the API integration.")
        print("Next steps:")
        print("1. Check server logs for errors when creating bookings")
        print("2. Verify the API endpoints are calling the email service")
        print("3. Test booking creation through the frontend UI")
    else:
        print("\n❌ Some email tests failed.")
        print("Check the error messages above and verify your Brevo configuration.")
