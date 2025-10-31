#!/usr/bin/env python3
"""
Test booking email functionality with the updated EmailService
"""

import os
import requests
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def test_booking_email():
    """Test booking email by making a real API call"""
    print("Testing Booking Email with Updated EmailService...")
    print("=" * 60)
    
    # Test data
    booking_data = {
        "customer_name": "Test Customer",
        "customer_email": "cetler74@gmail.com",
        "customer_phone": "+1234567890",
        "service_ids": [1],  # Assuming service ID 1 exists
        "booking_date": "2024-01-15",
        "booking_time": "14:00",
        "any_employee_selected": True
    }
    
    # API endpoint (adjust port if needed)
    api_url = "http://localhost:5001/api/v1/places/1/bookings"  # Assuming place ID 1 exists
    
    print(f"📧 Testing booking creation with email notification...")
    print(f"📧 Customer: {booking_data['customer_name']} ({booking_data['customer_email']})")
    print(f"📧 Date: {booking_data['booking_date']} at {booking_data['booking_time']}")
    
    try:
        response = requests.post(api_url, json=booking_data)
        
        if response.status_code == 201:
            print("✅ Booking created successfully!")
            print(f"Response: {response.json()}")
            print("\n📧 Check your email (cetler74@gmail.com) for the booking notification.")
            print("   The email should be sent from cetler74@gmail.com (verified sender)")
        else:
            print(f"❌ Failed to create booking. Status: {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Error creating booking: {str(e)}")
        print("Make sure the backend server is running on port 5001")

if __name__ == "__main__":
    test_booking_email()
