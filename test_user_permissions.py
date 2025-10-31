#!/usr/bin/env python3
"""
Test user permissions and place ownership
"""

import requests
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_user_permissions():
    """Test user permissions and place ownership"""
    print("Testing User Permissions...")
    print("=" * 50)
    
    base_url = "http://localhost:5001"
    
    # Login
    login_data = {
        "email": "cetler74@gmail.com",
        "password": "Xblo!234567890"
    }
    
    try:
        response = requests.post(f"{base_url}/api/v1/auth/login", json=login_data)
        if response.status_code == 200:
            token_data = response.json()
            token = token_data.get("access_token")
            print("✅ Login successful!")
            
            headers = {"Authorization": f"Bearer {token}"}
            
            # Test user info
            print("\n📋 Testing user info...")
            try:
                response = requests.get(f"{base_url}/api/v1/auth/me", headers=headers)
                if response.status_code == 200:
                    user_data = response.json()
                    print(f"✅ User info retrieved: {user_data}")
                    print(f"   User ID: {user_data.get('id')}")
                    print(f"   Email: {user_data.get('email')}")
                    print(f"   Role: {user_data.get('role')}")
                else:
                    print(f"❌ User info failed: {response.status_code} - {response.text}")
            except Exception as e:
                print(f"❌ User info error: {e}")
            
            # Test owner places
            print("\n🏢 Testing owner places...")
            try:
                response = requests.get(f"{base_url}/api/v1/owner/places", headers=headers)
                if response.status_code == 200:
                    places = response.json()
                    print(f"✅ Owner places retrieved: {len(places)} places")
                    for place in places:
                        print(f"   Place ID: {place.get('id')}, Name: {place.get('nome')}, Owner ID: {place.get('owner_id')}")
                else:
                    print(f"❌ Owner places failed: {response.status_code} - {response.text}")
            except Exception as e:
                print(f"❌ Owner places error: {e}")
            
            # Test specific place access
            print("\n🏢 Testing specific place access...")
            try:
                response = requests.get(f"{base_url}/api/v1/owner/places/2", headers=headers)
                if response.status_code == 200:
                    place_data = response.json()
                    print(f"✅ Place 2 access successful!")
                    print(f"   Place Name: {place_data.get('nome')}")
                    print(f"   Owner ID: {place_data.get('owner_id')}")
                    print(f"   Booking Enabled: {place_data.get('booking_enabled')}")
                else:
                    print(f"❌ Place 2 access failed: {response.status_code} - {response.text}")
            except Exception as e:
                print(f"❌ Place 2 access error: {e}")
            
            # Test services endpoint
            print("\n🔧 Testing services endpoint...")
            try:
                response = requests.get(f"{base_url}/api/v1/owner/places/2/services", headers=headers)
                if response.status_code == 200:
                    services = response.json()
                    print(f"✅ Services endpoint working: {len(services)} services")
                else:
                    print(f"❌ Services endpoint failed: {response.status_code} - {response.text}")
            except Exception as e:
                print(f"❌ Services endpoint error: {e}")
            
            # Test employees endpoint
            print("\n👥 Testing employees endpoint...")
            try:
                response = requests.get(f"{base_url}/api/v1/owner/places/2/employees", headers=headers)
                if response.status_code == 200:
                    employees = response.json()
                    print(f"✅ Employees endpoint working: {len(employees)} employees")
                else:
                    print(f"❌ Employees endpoint failed: {response.status_code} - {response.text}")
            except Exception as e:
                print(f"❌ Employees endpoint error: {e}")
            
            # Test creating a service
            print("\n🔧 Testing service creation...")
            try:
                service_data = {
                    "name": "Test Service",
                    "description": "Test service description",
                    "category": "test",
                    "price": 25.0,
                    "duration": 30,
                    "is_bookable": True,
                    "is_bio_diamond": False
                }
                
                response = requests.post(
                    f"{base_url}/api/v1/owner/places/2/services",
                    json=service_data,
                    headers=headers
                )
                print(f"   Service creation status: {response.status_code}")
                print(f"   Response: {response.text}")
                
                if response.status_code == 201:
                    print("   ✅ Service creation successful!")
                else:
                    print("   ❌ Service creation failed")
                    
            except Exception as e:
                print(f"   ❌ Service creation error: {e}")
            
            # Test creating an employee
            print("\n👥 Testing employee creation...")
            try:
                employee_data = {
                    "name": "Test Employee",
                    "email": "test@employee.com",
                    "phone": "+1234567890",
                    "role": "Test Role",
                    "specialty": "Test Specialty",
                    "color_code": "#FF0000"
                }
                
                response = requests.post(
                    f"{base_url}/api/v1/owner/places/2/employees",
                    json=employee_data,
                    headers=headers
                )
                print(f"   Employee creation status: {response.status_code}")
                print(f"   Response: {response.text}")
                
                if response.status_code == 201:
                    print("   ✅ Employee creation successful!")
                else:
                    print("   ❌ Employee creation failed")
                    
            except Exception as e:
                print(f"   ❌ Employee creation error: {e}")
                
        else:
            print(f"❌ Login failed: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Login error: {e}")

if __name__ == "__main__":
    test_user_permissions()
