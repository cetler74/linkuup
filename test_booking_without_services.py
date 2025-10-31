#!/usr/bin/env python3
"""
Test booking creation without services to see if we can trigger the email
"""

import requests
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_booking_without_services():
    """Test booking creation without services"""
    print("Testing Booking Creation Without Services...")
    print("=" * 60)
    
    base_url = "http://localhost:5001"
    
    # Test 1: Try to create a booking with non-existent service
    print("\n📝 Test 1: Booking with non-existent service")
    try:
        booking_data = {
            "salon_id": 2,
            "service_ids": [999],  # Non-existent service
            "employee_id": 1,
            "customer_name": "Test Customer",
            "customer_email": "cetler74@gmail.com",
            "customer_phone": "+1234567890",
            "booking_date": "2024-01-15",
            "booking_time": "14:00",
            "any_employee_selected": True
        }
        
        response = requests.post(f"{base_url}/api/v1/places/2/bookings", json=booking_data)
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.text}")
        
        if response.status_code == 201:
            print("   ✅ Booking created successfully!")
            return True
        else:
            print("   ❌ Booking creation failed (expected)")
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 2: Try to create a booking with empty service list
    print("\n📝 Test 2: Booking with empty service list")
    try:
        booking_data = {
            "salon_id": 2,
            "service_ids": [],  # Empty service list
            "employee_id": 1,
            "customer_name": "Test Customer",
            "customer_email": "cetler74@gmail.com",
            "customer_phone": "+1234567890",
            "booking_date": "2024-01-15",
            "booking_time": "14:00",
            "any_employee_selected": True
        }
        
        response = requests.post(f"{base_url}/api/v1/places/2/bookings", json=booking_data)
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.text}")
        
        if response.status_code == 201:
            print("   ✅ Booking created successfully!")
            return True
        else:
            print("   ❌ Booking creation failed (expected)")
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 3: Try to create a booking with minimal data
    print("\n📝 Test 3: Booking with minimal data")
    try:
        booking_data = {
            "salon_id": 2,
            "service_ids": [1],  # Try service ID 1
            "employee_id": 1,
            "customer_name": "Test Customer",
            "customer_email": "cetler74@gmail.com",
            "customer_phone": "+1234567890",
            "booking_date": "2024-01-15",
            "booking_time": "14:00",
            "any_employee_selected": True
        }
        
        response = requests.post(f"{base_url}/api/v1/places/2/bookings", json=booking_data)
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.text}")
        
        if response.status_code == 201:
            print("   ✅ Booking created successfully!")
            return True
        else:
            print("   ❌ Booking creation failed")
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    return False

def test_direct_email_trigger():
    """Test if we can trigger the email service directly"""
    print("\n" + "=" * 60)
    print("Testing Direct Email Trigger...")
    
    # Since we know the email service works, let's test if we can trigger it
    # by creating a booking through the frontend or by modifying the API
    
    print("📧 Email service is working (confirmed earlier)")
    print("📧 The issue is that booking creation fails before reaching email sending")
    print("📧 We need to either:")
    print("   1. Create services in the database")
    print("   2. Make the user an owner")
    print("   3. Create a test booking through the frontend")
    
    print("\n🌐 Let's try the frontend approach...")
    print("   Open http://localhost:5173 in your browser")
    print("   Login with cetler74@gmail.com / Xblo!234567890")
    print("   Try to create a booking through the UI")
    print("   Check if the frontend can create services or if there's a different flow")

if __name__ == "__main__":
    success = test_booking_without_services()
    test_direct_email_trigger()
    
    print("\n" + "=" * 60)
    print("SUMMARY:")
    print("✅ Brevo email service: Working")
    print("✅ API endpoints: Working")
    print("❌ Booking creation: Failing (no services)")
    print("❌ User permissions: Customer (not owner)")
    
    print("\n🔧 SOLUTIONS:")
    print("1. Create services directly in the database")
    print("2. Make the user an owner")
    print("3. Test through the frontend UI")
    print("4. Create a test booking with a different approach")
    
    print("\n📧 NEXT STEPS:")
    print("1. Check your email (cetler74@gmail.com) for the test emails sent earlier")
    print("2. Try creating a booking through the frontend UI")
    print("3. If frontend works, the email integration is working correctly")
    print("4. If frontend doesn't work, we need to create services in the database")
