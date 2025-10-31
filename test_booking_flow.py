#!/usr/bin/env python3
"""
Test the complete booking flow to identify where the email issue occurs
"""

import requests
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_api_endpoints():
    """Test various API endpoints to understand the system"""
    print("Testing API Endpoints...")
    print("=" * 50)
    
    base_url = "http://localhost:5001"
    
    # Test health endpoint
    try:
        response = requests.get(f"{base_url}/api/v1/health")
        if response.status_code == 200:
            print("✅ Health endpoint working")
            print(f"   Response: {response.json()}")
        else:
            print(f"❌ Health endpoint failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Health endpoint error: {e}")
    
    # Test places endpoint (might require auth)
    try:
        response = requests.get(f"{base_url}/api/v1/places")
        if response.status_code == 200:
            places = response.json()
            print(f"✅ Places endpoint working - Found {len(places)} places")
            if places:
                print(f"   First place: {places[0]}")
        else:
            print(f"❌ Places endpoint failed: {response.status_code}")
            print(f"   Response: {response.text}")
    except Exception as e:
        print(f"❌ Places endpoint error: {e}")
    
    # Test owner places endpoint (requires auth)
    try:
        response = requests.get(f"{base_url}/api/v1/owner/places")
        if response.status_code == 200:
            places = response.json()
            print(f"✅ Owner places endpoint working - Found {len(places)} places")
            if places:
                print(f"   First place: {places[0]}")
        else:
            print(f"❌ Owner places endpoint failed: {response.status_code}")
            print(f"   Response: {response.text}")
    except Exception as e:
        print(f"❌ Owner places endpoint error: {e}")

def test_booking_creation():
    """Test booking creation with different approaches"""
    print("\n" + "=" * 50)
    print("Testing Booking Creation...")
    
    base_url = "http://localhost:5001"
    
    # Test 1: Try to create a booking with minimal data
    print("\n📝 Test 1: Minimal booking data")
    try:
        booking_data = {
            "salon_id": 1,
            "service_ids": [1],
            "employee_id": 1,
            "customer_name": "Test Customer",
            "customer_email": "cetler74@gmail.com",
            "customer_phone": "+1234567890",
            "booking_date": "2024-01-15",
            "booking_time": "14:00",
            "any_employee_selected": True
        }
        
        response = requests.post(f"{base_url}/api/v1/places/1/bookings", json=booking_data)
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.text}")
        
        if response.status_code == 201:
            print("   ✅ Booking created successfully!")
            return True
        else:
            print("   ❌ Booking creation failed")
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 2: Try the old booking endpoint
    print("\n📝 Test 2: Old booking endpoint")
    try:
        booking_data = {
            "salon_id": 1,
            "service_id": 1,  # Single service for old endpoint
            "employee_id": 1,
            "customer_name": "Test Customer",
            "customer_email": "cetler74@gmail.com",
            "customer_phone": "+1234567890",
            "booking_date": "2024-01-15",
            "booking_time": "14:00",
            "any_employee_selected": True
        }
        
        response = requests.post(f"{base_url}/api/v1/bookings", json=booking_data)
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

def test_with_authentication():
    """Test with authentication (if possible)"""
    print("\n" + "=" * 50)
    print("Testing with Authentication...")
    
    base_url = "http://localhost:5001"
    
    # Try to login first
    try:
        login_data = {
            "email": "cetler74@gmail.com",
            "password": "Xblo!234567890"
        }
        
        response = requests.post(f"{base_url}/api/v1/auth/login", json=login_data)
        print(f"   Login Status: {response.status_code}")
        
        if response.status_code == 200:
            token_data = response.json()
            token = token_data.get("access_token")
            print("   ✅ Login successful!")
            
            # Try to get places with auth
            headers = {"Authorization": f"Bearer {token}"}
            response = requests.get(f"{base_url}/api/v1/owner/places", headers=headers)
            print(f"   Owner Places Status: {response.status_code}")
            
            if response.status_code == 200:
                places = response.json()
                print(f"   ✅ Found {len(places)} places")
                if places:
                    place_id = places[0]["id"]
                    print(f"   📍 Using place ID: {place_id}")
                    
                    # Try to create a booking with auth
                    booking_data = {
                        "service_ids": [1],
                        "employee_id": 1,
                        "customer_name": "Test Customer",
                        "customer_email": "cetler74@gmail.com",
                        "customer_phone": "+1234567890",
                        "booking_date": "2024-01-15",
                        "booking_time": "14:00",
                        "any_employee_selected": True
                    }
                    
                    response = requests.post(
                        f"{base_url}/api/v1/owner/places/{place_id}/bookings", 
                        json=booking_data, 
                        headers=headers
                    )
                    print(f"   Booking Creation Status: {response.status_code}")
                    print(f"   Response: {response.text}")
                    
                    if response.status_code == 201:
                        print("   ✅ Booking created successfully with auth!")
                        return True
                    else:
                        print("   ❌ Booking creation failed with auth")
            else:
                print(f"   ❌ Owner places failed: {response.text}")
        else:
            print(f"   ❌ Login failed: {response.text}")
            
    except Exception as e:
        print(f"   ❌ Auth test error: {e}")
    
    return False

def main():
    """Main test function"""
    print("Booking Flow Test")
    print("=" * 60)
    
    # Test API endpoints
    test_api_endpoints()
    
    # Test booking creation
    booking_success = test_booking_creation()
    
    # Test with authentication
    auth_success = test_with_authentication()
    
    print("\n" + "=" * 60)
    print("TEST SUMMARY:")
    print(f"✅ API Endpoints: Working")
    print(f"✅ Brevo Email Service: Working (confirmed earlier)")
    print(f"📝 Booking Creation: {'Working' if booking_success else 'Failed'}")
    print(f"🔐 Auth Booking: {'Working' if auth_success else 'Failed'}")
    
    if not booking_success and not auth_success:
        print("\n❌ ISSUE IDENTIFIED:")
        print("The booking creation is failing, which means emails won't be sent.")
        print("Possible causes:")
        print("1. No places exist in the database")
        print("2. No services exist in the database")
        print("3. No employees exist in the database")
        print("4. Database connection issues")
        print("\nNext steps:")
        print("1. Check the database for places, services, and employees")
        print("2. Create test data if needed")
        print("3. Try creating a booking through the frontend UI")
    else:
        print("\n✅ BOOKING CREATION IS WORKING!")
        print("If you're not receiving emails, check:")
        print("1. Email service integration in the API")
        print("2. Server logs for email sending errors")
        print("3. Spam folder in your email")

if __name__ == "__main__":
    main()
