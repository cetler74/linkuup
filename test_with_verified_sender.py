#!/usr/bin/env python3
"""
Test Brevo email with verified sender address
"""

import os
import requests
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def test_with_verified_sender():
    """Test sending email with verified sender address"""
    print("Testing Brevo Email with Verified Sender...")
    print("=" * 60)
    
    # Get API key from environment
    api_key = os.getenv('BREVO_API_KEY')
    if not api_key:
        print("❌ BREVO_API_KEY not found in environment variables")
        return False
    
    print(f"✅ BREVO_API_KEY found: {api_key[:10]}...")
    
    # Use the verified sender email from your account
    sender_email = "cetler74@gmail.com"  # This is verified in your Brevo account
    
    url = "https://api.brevo.com/v3/smtp/email"
    headers = {
        'api-key': api_key,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
    
    # Test email payload with verified sender
    payload = {
        "sender": {
            "name": "LinkUup",
            "email": sender_email
        },
        "to": [
            {
                "email": "cetler74@gmail.com",
                "name": "Test User"
            }
        ],
        "subject": "Test Email from LinkUup (Verified Sender)",
        "htmlContent": """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Test Email from LinkUup</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #2a2a2e; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Test Email from LinkUup</h1>
                <p>Using Verified Sender Address</p>
            </div>
            
            <div class="content">
                <p>Hello!</p>
                
                <p>This is a test email from LinkUup using your verified Brevo sender address.</p>
                
                <p>If you receive this email, it means:</p>
                <ul>
                    <li>✅ Brevo API is working correctly</li>
                    <li>✅ Your sender email is verified</li>
                    <li>✅ Email delivery is functioning</li>
                </ul>
                
                <p>This confirms that the Brevo integration is working properly!</p>
                
                <p>Best regards,<br>
                The LinkUup Team</p>
            </div>
            
            <div class="footer">
                <p>This is a test email from LinkUup's Brevo integration.</p>
            </div>
        </body>
        </html>
        """,
        "textContent": """
        Test Email from LinkUup (Verified Sender)
        
        Hello!
        
        This is a test email from LinkUup using your verified Brevo sender address.
        
        If you receive this email, it means:
        - Brevo API is working correctly
        - Your sender email is verified
        - Email delivery is functioning
        
        This confirms that the Brevo integration is working properly!
        
        Best regards,
        The LinkUup Team
        
        This is a test email from LinkUup's Brevo integration.
        """
    }
    
    print(f"📧 Sending test email from verified sender: {sender_email}")
    print(f"📧 To: cetler74@gmail.com")
    
    try:
        response = requests.post(url, headers=headers, json=payload)
        
        if response.status_code == 201:
            print("✅ Test email sent successfully!")
            print(f"Message ID: {response.text}")
            print("\n📧 Please check your email inbox for the test message.")
            print("   If you don't see it immediately, check your spam folder.")
            return True
        else:
            print(f"❌ Failed to send email. Status: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error sending email: {str(e)}")
        return False

def test_booking_notification_with_verified_sender():
    """Test booking notification with verified sender"""
    print("\n" + "=" * 60)
    print("Testing Booking Notification with Verified Sender...")
    
    api_key = os.getenv('BREVO_API_KEY')
    sender_email = "cetler74@gmail.com"
    
    url = "https://api.brevo.com/v3/smtp/email"
    headers = {
        'api-key': api_key,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
    
    # Booking notification payload with verified sender
    payload = {
        "sender": {
            "name": "LinkUup",
            "email": sender_email
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
    
    print(f"📧 Sending booking notification from verified sender: {sender_email}")
    
    try:
        response = requests.post(url, headers=headers, json=payload)
        
        if response.status_code == 201:
            print("✅ Booking notification sent successfully!")
            print(f"Message ID: {response.text}")
            return True
        else:
            print(f"❌ Failed to send booking notification. Status: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error sending booking notification: {str(e)}")
        return False

if __name__ == "__main__":
    print("Brevo Email Test with Verified Sender")
    print("=" * 60)
    
    # Test with verified sender
    test_success = test_with_verified_sender()
    
    # Test booking notification
    booking_success = test_booking_notification_with_verified_sender()
    
    print("\n" + "=" * 60)
    print("TEST RESULTS:")
    print(f"✅ Test Email: {'PASS' if test_success else 'FAIL'}")
    print(f"✅ Booking Email: {'PASS' if booking_success else 'FAIL'}")
    
    if test_success and booking_success:
        print("\n🎉 All tests passed! Check your email inbox.")
        print("📧 You should receive 2 emails from cetler74@gmail.com")
    else:
        print("\n❌ Some tests failed. Check the error messages above.")
