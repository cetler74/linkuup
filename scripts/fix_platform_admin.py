#!/usr/bin/env python3
"""
Script to fix platform administrator privileges using direct database connection.
"""

import os
import sys
import psycopg2
from datetime import datetime

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'linkuup_db',
    'user': 'carloslarramba',
    'password': ''  # Add password if needed
}

ADMIN_EMAIL = "platform.admin@linkuup.com"
ADMIN_PASSWORD = "PlatformAdmin2025!"

def hash_password(password):
    """Hash password using the same method as the backend (pbkdf2_sha256)"""
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
    return pwd_context.hash(password)

def fix_platform_admin():
    """Fix platform administrator privileges in database"""
    try:
        print("🔧 Fixing Platform Administrator privileges...")
        
        # Connect to database
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        
        # Check if user exists
        cur.execute("SELECT id, email, user_type, is_admin, is_active FROM users WHERE email = %s", (ADMIN_EMAIL,))
        user = cur.fetchone()
        
        if not user:
            print(f"❌ User with email {ADMIN_EMAIL} not found!")
            return False
        
        user_id, email, user_type, is_admin, is_active = user
        print(f"✅ Found user: {email} (ID: {user_id})")
        print(f"   Current user_type: {user_type}")
        print(f"   Current is_admin: {is_admin}")
        print(f"   Current is_active: {is_active}")
        
        # Update user to have platform admin privileges
        cur.execute("""
            UPDATE users 
            SET user_type = 'platform_admin',
                is_admin = true,
                is_active = true,
                password_hash = %s,
                updated_at = %s
            WHERE id = %s
        """, (hash_password(ADMIN_PASSWORD), datetime.utcnow(), user_id))
        
        conn.commit()
        
        # Verify the update
        cur.execute("SELECT email, user_type, is_admin, is_active FROM users WHERE id = %s", (user_id,))
        updated_user = cur.fetchone()
        
        print("✅ Platform Administrator updated successfully!")
        print(f"   Email: {updated_user[0]}")
        print(f"   User Type: {updated_user[1]}")
        print(f"   Is Admin: {updated_user[2]}")
        print(f"   Is Active: {updated_user[3]}")
        
        cur.close()
        conn.close()
        
        return True
        
    except Exception as e:
        print(f"❌ Error fixing platform administrator: {e}")
        return False

def test_admin_access():
    """Test admin access via API"""
    try:
        print("\n🧪 Testing admin access...")
        
        import requests
        
        # Login to get token
        response = requests.post("http://localhost:5001/api/v1/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if response.status_code != 200:
            print(f"❌ Login failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
        
        data = response.json()
        user = data.get("user", {})
        print(f"✅ Login successful!")
        print(f"   User: {user.get('name', 'Unknown')}")
        print(f"   Email: {user.get('email', 'Unknown')}")
        print(f"   User Type: {user.get('user_type', 'Unknown')}")
        print(f"   Is Admin: {user.get('is_admin', False)}")
        
        token = data.get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Test admin stats endpoint
        stats_response = requests.get("http://localhost:5001/api/v1/admin/stats", headers=headers)
        if stats_response.status_code == 200:
            print("✅ Admin stats endpoint accessible")
            stats_data = stats_response.json()
            print(f"   Total Owners: {stats_data.get('total_owners', 0)}")
            print(f"   Total Places: {stats_data.get('total_places', 0)}")
        else:
            print(f"❌ Admin stats endpoint failed: {stats_response.status_code}")
            return False
        
        print("✅ Platform Administrator is fully functional!")
        return True
        
    except Exception as e:
        print(f"❌ Error testing admin access: {e}")
        return False

def main():
    """Main function"""
    print("🚀 LinkUup Platform Administrator Fix")
    print("=" * 50)
    
    # Fix platform admin
    if fix_platform_admin():
        # Test admin access
        if test_admin_access():
            print("\n🎉 Platform Administrator setup complete!")
            print("\nYou can now:")
            print(f"1. Log in to the frontend with {ADMIN_EMAIL}")
            print(f"2. Use password: {ADMIN_PASSWORD}")
            print("3. Access the Admin Dashboard via the header button")
            print("4. Manage all business owners and platform configurations")
            print("\n⚠️  IMPORTANT: Change the password after first login!")
        else:
            print("\n❌ Admin access test failed")
            sys.exit(1)
    else:
        print("\n❌ Platform Administrator fix failed")
        sys.exit(1)

if __name__ == "__main__":
    main()
