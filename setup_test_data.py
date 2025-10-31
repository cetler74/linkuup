#!/usr/bin/env python3
"""
Setup test data for booking testing
"""

import requests
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def login_and_get_token():
    """Login and get authentication token"""
    print("Logging in...")
    
    base_url = "http://localhost:5001"
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
            return token
        else:
            print(f"❌ Login failed: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Login error: {e}")
        return None

def create_test_services(token, place_id):
    """Create test services for the place"""
    print(f"\nCreating test services for place {place_id}...")
    
    base_url = "http://localhost:5001"
    headers = {"Authorization": f"Bearer {token}"}
    
    services = [
        {
            "name": "Haircut",
            "description": "Professional haircut service",
            "category": "hair",
            "price": 30.0,
            "duration": 30,
            "is_bookable": True,
            "is_bio_diamond": False
        },
        {
            "name": "Beard Trim",
            "description": "Professional beard trimming",
            "category": "beard",
            "price": 20.0,
            "duration": 20,
            "is_bookable": True,
            "is_bio_diamond": False
        },
        {
            "name": "Haircut + Beard",
            "description": "Complete grooming package",
            "category": "package",
            "price": 45.0,
            "duration": 50,
            "is_bookable": True,
            "is_bio_diamond": False
        }
    ]
    
    created_services = []
    
    for service in services:
        try:
            response = requests.post(
                f"{base_url}/api/v1/owner/places/{place_id}/services",
                json=service,
                headers=headers
            )
            
            if response.status_code == 201:
                service_data = response.json()
                created_services.append(service_data)
                print(f"✅ Created service: {service['name']} (ID: {service_data['id']})")
            else:
                print(f"❌ Failed to create service {service['name']}: {response.text}")
                
        except Exception as e:
            print(f"❌ Error creating service {service['name']}: {e}")
    
    return created_services

def create_test_employees(token, place_id):
    """Create test employees for the place"""
    print(f"\nCreating test employees for place {place_id}...")
    
    base_url = "http://localhost:5001"
    headers = {"Authorization": f"Bearer {token}"}
    
    employees = [
        {
            "name": "John Barber",
            "email": "john@barber.com",
            "phone": "+1234567890",
            "role": "Barber",
            "specialty": "Haircut, Beard Trim",
            "color_code": "#FF5733"
        },
        {
            "name": "Mike Stylist",
            "email": "mike@barber.com",
            "phone": "+1234567891",
            "role": "Stylist",
            "specialty": "Haircut, Styling",
            "color_code": "#33FF57"
        }
    ]
    
    created_employees = []
    
    for employee in employees:
        try:
            response = requests.post(
                f"{base_url}/api/v1/owner/places/{place_id}/employees",
                json=employee,
                headers=headers
            )
            
            if response.status_code == 201:
                employee_data = response.json()
                created_employees.append(employee_data)
                print(f"✅ Created employee: {employee['name']} (ID: {employee_data['id']})")
            else:
                print(f"❌ Failed to create employee {employee['name']}: {response.text}")
                
        except Exception as e:
            print(f"❌ Error creating employee {employee['name']}: {e}")
    
    return created_employees

def test_booking_creation(token, place_id, services, employees):
    """Test booking creation with the new data"""
    print(f"\nTesting booking creation...")
    
    base_url = "http://localhost:5001"
    headers = {"Authorization": f"Bearer {token}"}
    
    if not services or not employees:
        print("❌ No services or employees available for testing")
        return False
    
    # Test booking with first service and employee
    booking_data = {
        "service_ids": [services[0]["id"]],
        "employee_id": employees[0]["id"],
        "customer_name": "Test Customer",
        "customer_email": "cetler74@gmail.com",
        "customer_phone": "+1234567890",
        "booking_date": "2024-01-15",
        "booking_time": "14:00",
        "any_employee_selected": False
    }
    
    try:
        response = requests.post(
            f"{base_url}/api/v1/owner/places/{place_id}/bookings",
            json=booking_data,
            headers=headers
        )
        
        print(f"Booking creation status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 201:
            print("✅ Booking created successfully!")
            print("📧 Check your email (cetler74@gmail.com) for the booking notification!")
            return True
        else:
            print("❌ Booking creation failed")
            return False
            
    except Exception as e:
        print(f"❌ Error creating booking: {e}")
        return False

def main():
    """Main function to setup test data and test booking"""
    print("Setting up test data for booking testing")
    print("=" * 60)
    
    # Login and get token
    token = login_and_get_token()
    if not token:
        print("❌ Cannot proceed without authentication token")
        return
    
    # Get place ID (we know it's 2 from previous test)
    place_id = 2
    print(f"Using place ID: {place_id}")
    
    # Create test services
    services = create_test_services(token, place_id)
    
    # Create test employees
    employees = create_test_employees(token, place_id)
    
    # Test booking creation
    if services and employees:
        success = test_booking_creation(token, place_id, services, employees)
        
        print("\n" + "=" * 60)
        print("SETUP COMPLETE!")
        print(f"✅ Services created: {len(services)}")
        print(f"✅ Employees created: {len(employees)}")
        print(f"📝 Booking test: {'PASS' if success else 'FAIL'}")
        
        if success:
            print("\n🎉 SUCCESS! Booking creation is now working!")
            print("📧 Check your email (cetler74@gmail.com) for the booking notification!")
            print("\nYou can now test booking creation through the frontend UI.")
        else:
            print("\n❌ Booking creation still failing. Check the error messages above.")
    else:
        print("\n❌ Failed to create test data. Cannot test booking creation.")

if __name__ == "__main__":
    main()
