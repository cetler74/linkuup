#!/usr/bin/env python3
"""
Script to create an admin user for the platform admin dashboard.
"""

import requests
import json
import sys

# Configuration
BASE_URL = "http://localhost:5001/api/v1"
ADMIN_EMAIL = "admin@linkuup.com"
ADMIN_PASSWORD = "admin123"
ADMIN_NAME = "Platform Administrator"

def create_admin_user():
    """Create admin user via registration endpoint"""
    try:
        print("🔧 Setting up admin user...")
        
        # Try to register the admin user
        response = requests.post(f"{BASE_URL}/auth/register", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD,
            "first_name": "Platform",
            "last_name": "Administrator",
            "user_type": "platform_admin",
            "gdpr_data_processing_consent": True,
            "gdpr_marketing_consent": True
        })
        
        if response.status_code == 201:
            print("✅ Admin user created successfully!")
            print(f"   Email: {ADMIN_EMAIL}")
            print(f"   Password: {ADMIN_PASSWORD}")
            print(f"   User Type: platform_admin")
            return True
        elif response.status_code == 400:
            # User might already exist
            data = response.json()
            if "already registered" in str(data) or "already exists" in str(data):
                print("ℹ️  Admin user already exists")
                return True
            else:
                print(f"❌ Registration failed: {data}")
                return False
        else:
            print(f"❌ Registration failed with status: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        return False

def test_admin_login():
    """Test admin login"""
    try:
        print("\n🔐 Testing admin login...")
        
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if response.status_code == 200:
            data = response.json()
            user = data.get("user", {})
            is_admin = user.get("is_admin", False) or user.get("user_type") == "platform_admin"
            
            print("✅ Admin login successful!")
            print(f"   User: {user.get('name', 'Unknown')}")
            print(f"   Email: {user.get('email', 'Unknown')}")
            print(f"   User Type: {user.get('user_type', 'Unknown')}")
            print(f"   Is Admin: {is_admin}")
            return True
        else:
            print(f"❌ Login failed with status: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing login: {e}")
        return False

def main():
    """Main setup function"""
    print("🚀 Platform Admin Dashboard Setup")
    print("=" * 50)
    
    # Create admin user
    if create_admin_user():
        # Test login
        if test_admin_login():
            print("\n🎉 Admin user setup complete!")
            print("\nYou can now:")
            print("1. Log in to the frontend with admin@linkuup.com")
            print("2. Access the Admin Dashboard via the header button")
            print("3. Run the integration tests: python3 scripts/test_admin_dashboard.py")
        else:
            print("\n❌ Admin login test failed")
            sys.exit(1)
    else:
        print("\n❌ Admin user creation failed")
        sys.exit(1)

if __name__ == "__main__":
    main()
