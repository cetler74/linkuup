#!/usr/bin/env python3
"""
Complete Email Notification System Test
Tests both booking request and status update emails
"""

import requests
import json
import time
from datetime import datetime, timedelta

# Configuration
BASE_URL = "http://localhost:5001"
TEST_EMAIL = "test@example.com"  # Change this to your email for testing

def test_booking_request_email():
    """Test booking request email notification"""
    print("🧪 Testing Booking Request Email...")
    
    # Create a booking for tomorrow
    tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
    
    booking_data = {
        "salon_id": 1,
        "service_id": 1,
        "customer_name": "Email Test Customer",
        "customer_email": TEST_EMAIL,
        "customer_phone": "123456789",
        "booking_date": tomorrow,
        "booking_time": "14:00"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/bookings", json=booking_data)
        if response.status_code == 201:
            data = response.json()
            print(f"✅ Booking created successfully (ID: {data['id']})")
            print(f"📧 Booking request email should be sent to: {TEST_EMAIL}")
            return data['id']
        else:
            print(f"❌ Booking creation failed: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error creating booking: {str(e)}")
        return None

def test_status_update_emails(booking_id):
    """Test status update email notifications"""
    if not booking_id:
        print("❌ No booking ID provided for status update test")
        return
    
    print(f"\n🧪 Testing Status Update Emails for Booking ID: {booking_id}")
    
    # Login as salon manager
    login_data = {
        "email": "demo@example.com",
        "password": "demo123"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
        if response.status_code == 200:
            token = response.json()['token']
            print("✅ Salon manager login successful")
        else:
            print(f"❌ Login failed: {response.text}")
            return
    except Exception as e:
        print(f"❌ Login error: {str(e)}")
        return
    
    # Test different status updates
    statuses = [
        ("confirmed", "✅ Booking Confirmed"),
        ("cancelled", "❌ Booking Cancelled"),
        ("completed", "✅ Booking Completed")
    ]
    
    for status, description in statuses:
        print(f"\n📧 Testing {description} email...")
        
        try:
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
            
            response = requests.put(
                f"{BASE_URL}/api/manager/bookings/{booking_id}/status",
                json={"status": status},
                headers=headers
            )
            
            if response.status_code == 200:
                print(f"✅ Status updated to '{status}' successfully")
                print(f"📧 {description} email should be sent to: {TEST_EMAIL}")
            else:
                print(f"❌ Status update failed: {response.text}")
                
        except Exception as e:
            print(f"❌ Error updating status: {str(e)}")
        
        time.sleep(1)  # Small delay between status updates

def main():
    """Run complete email system test"""
    print("🚀 Complete Email Notification System Test")
    print("=" * 50)
    
    # Test server health
    try:
        response = requests.get(f"{BASE_URL}/api/health")
        if response.status_code == 200:
            print("✅ Server is running and healthy")
        else:
            print("❌ Server health check failed")
            return
    except Exception as e:
        print(f"❌ Cannot connect to server: {str(e)}")
        return
    
    print(f"\n📧 Test emails will be sent to: {TEST_EMAIL}")
    print("💡 Check your email inbox for the notifications!")
    
    # Test booking request email
    booking_id = test_booking_request_email()
    
    # Test status update emails
    test_status_update_emails(booking_id)
    
    print("\n" + "=" * 50)
    print("🎉 Email notification system test completed!")
    print("\n📋 What to check:")
    print("1. Check your email inbox for booking request notification")
    print("2. Check for status update notifications (confirmed, cancelled, completed)")
    print("3. Verify email content includes all booking details")
    print("4. Check that emails are properly formatted (HTML + plain text)")

if __name__ == "__main__":
    main()
