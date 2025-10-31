#!/usr/bin/env python3
"""
Test script for the customers API
"""
import requests
import json
from jose import jwt
from datetime import datetime, timedelta

# Configuration
API_BASE_URL = "http://localhost:5001/api/v1"
USER_ID = 15  # Carlos Manuel - business owner
SECRET_KEY = "your-secret-key-here-change-in-production"  # This should match the backend secret key
ALGORITHM = "HS256"

def create_test_token(user_id: int) -> str:
    """Create a test JWT token"""
    payload = {
        "sub": str(user_id),
        "exp": datetime.utcnow() + timedelta(hours=1),
        "iat": datetime.utcnow()
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def test_customers_api():
    """Test the customers API endpoint"""
    # Create token
    token = create_test_token(USER_ID)
    print(f"🔑 Generated token: {token[:50]}...")
    
    # Test the customers endpoint
    url = f"{API_BASE_URL}/owner/places/11/customers"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    params = {
        "search_term": "",
        "tier_filter": "",
        "booking_status_filter": "",
        "page": 1,
        "page_size": 100
    }
    
    print(f"🌐 Testing URL: {url}")
    print(f"📋 Params: {params}")
    
    try:
        response = requests.get(url, headers=headers, params=params)
        print(f"📊 Status Code: {response.status_code}")
        print(f"📄 Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Success! Found {len(data.get('customers', []))} customers")
            print(f"📊 Total Count: {data.get('total_count', 0)}")
            
            # Show first customer if any
            customers = data.get('customers', [])
            if customers:
                print(f"👤 First Customer: {customers[0].get('user_name', 'N/A')} ({customers[0].get('user_email', 'N/A')})")
                print(f"📅 Last Booking: {customers[0].get('last_booking_date', 'N/A')}")
                print(f"🎯 Last Service: {customers[0].get('last_service_name', 'N/A')}")
                print(f"🎁 Last Campaign: {customers[0].get('last_campaign_name', 'N/A')}")
        else:
            print(f"❌ Error: {response.text}")
            
    except Exception as e:
        print(f"💥 Exception: {e}")

if __name__ == "__main__":
    test_customers_api()
