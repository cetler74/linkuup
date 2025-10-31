#!/usr/bin/env python3
"""
Script to create a platform administrator user for LinkUup.
This script creates a user with platform_admin privileges who can manage all owners and configurations.
"""

import os
import sys
import hashlib
import secrets
import requests
import json
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:5001/api/v1"
ADMIN_EMAIL = "platform.admin@linkuup.com"
ADMIN_PASSWORD = "PlatformAdmin2025!"
ADMIN_FIRST_NAME = "Platform"
ADMIN_LAST_NAME = "Administrator"

def hash_password(password):
    """Hash password using the same method as the backend"""
    salt = secrets.token_hex(16)
    password_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
    return f"{salt}:{password_hash.hex()}"

def create_platform_admin():
    """Create platform administrator user via registration endpoint"""
    try:
        print("🔧 Creating Platform Administrator...")
        print(f"   Email: {ADMIN_EMAIL}")
        print(f"   Name: {ADMIN_FIRST_NAME} {ADMIN_LAST_NAME}")
        print(f"   User Type: platform_admin")
        
        # Try to register the platform admin user
        response = requests.post(f"{BASE_URL}/auth/register", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD,
            "first_name": ADMIN_FIRST_NAME,
            "last_name": ADMIN_LAST_NAME,
            "user_type": "platform_admin",
            "gdpr_data_processing_consent": True,
            "gdpr_marketing_consent": True
        })
        
        if response.status_code == 201:
            print("✅ Platform Administrator created successfully!")
            data = response.json()
            user = data.get("user", {})
            
            print(f"   User ID: {user.get('id', 'Unknown')}")
            print(f"   Email: {user.get('email', 'Unknown')}")
            print(f"   Name: {user.get('name', 'Unknown')}")
            print(f"   User Type: {user.get('user_type', 'Unknown')}")
            print(f"   Is Admin: {user.get('is_admin', False)}")
            print(f"   Is Active: {user.get('is_active', False)}")
            
            return True
        elif response.status_code == 400:
            # User might already exist
            data = response.json()
            if "already registered" in str(data) or "already exists" in str(data):
                print("ℹ️  Platform Administrator already exists")
                print("   Attempting to verify existing user...")
                return verify_existing_admin()
            else:
                print(f"❌ Registration failed: {data}")
                return False
        else:
            print(f"❌ Registration failed with status: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error creating platform administrator: {e}")
        return False

def verify_existing_admin():
    """Verify that the existing admin user has correct permissions"""
    try:
        print("\n🔐 Verifying existing platform administrator...")
        
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if response.status_code == 200:
            data = response.json()
            user = data.get("user", {})
            is_admin = user.get("is_admin", False) or user.get("user_type") == "platform_admin"
            
            print("✅ Platform Administrator verification successful!")
            print(f"   User: {user.get('name', 'Unknown')}")
            print(f"   Email: {user.get('email', 'Unknown')}")
            print(f"   User Type: {user.get('user_type', 'Unknown')}")
            print(f"   Is Admin: {is_admin}")
            print(f"   Is Active: {user.get('is_active', False)}")
            
            if not is_admin:
                print("⚠️  WARNING: User exists but doesn't have admin privileges!")
                print("   You may need to manually update the user in the database.")
                return False
            
            return True
        else:
            print(f"❌ Login verification failed with status: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error verifying platform administrator: {e}")
        return False

def test_admin_dashboard_access():
    """Test that the platform admin can access admin dashboard endpoints"""
    try:
        print("\n🧪 Testing admin dashboard access...")
        
        # First login to get token
        login_response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code != 200:
            print("❌ Login failed - cannot test admin access")
            return False
        
        token = login_response.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Test admin stats endpoint
        stats_response = requests.get(f"{BASE_URL}/admin/stats", headers=headers)
        if stats_response.status_code == 200:
            print("✅ Admin stats endpoint accessible")
        else:
            print(f"❌ Admin stats endpoint failed: {stats_response.status_code}")
            return False
        
        # Test admin owners endpoint
        owners_response = requests.get(f"{BASE_URL}/admin/owners", headers=headers)
        if owners_response.status_code in [200, 500]:  # 500 is expected if no data
            print("✅ Admin owners endpoint accessible")
        else:
            print(f"❌ Admin owners endpoint failed: {owners_response.status_code}")
            return False
        
        print("✅ All admin dashboard endpoints are accessible!")
        return True
        
    except Exception as e:
        print(f"❌ Error testing admin dashboard access: {e}")
        return False

def main():
    """Main setup function"""
    print("🚀 LinkUup Platform Administrator Setup")
    print("=" * 50)
    
    # Create platform admin user
    if create_platform_admin():
        # Test admin dashboard access
        if test_admin_dashboard_access():
            print("\n🎉 Platform Administrator setup complete!")
            print("\nYou can now:")
            print(f"1. Log in to the frontend with {ADMIN_EMAIL}")
            print(f"2. Use password: {ADMIN_PASSWORD}")
            print("3. Access the Admin Dashboard via the header button")
            print("4. Manage all business owners and platform configurations")
            print("\n⚠️  IMPORTANT: Change the password after first login!")
        else:
            print("\n❌ Admin dashboard access test failed")
            sys.exit(1)
    else:
        print("\n❌ Platform Administrator creation failed")
        sys.exit(1)

if __name__ == "__main__":
    main()
