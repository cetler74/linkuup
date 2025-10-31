#!/usr/bin/env python3
"""
Script to check user information and optionally reset password.
"""

import os
import sys

# Add the backend directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app import app, db, User, hash_password

def check_user_info(email):
    """Check if a user exists and display their information"""
    with app.app_context():
        user = User.query.filter_by(email=email).first()
        if not user:
            print(f"❌ User with email {email} not found in database")
            print("\nWould you like to create this user?")
            return None
        
        print(f"✅ User found!")
        print(f"   Email: {user.email}")
        print(f"   Name: {user.name}")
        print(f"   Customer ID: {user.customer_id}")
        print(f"   Is Admin: {user.is_admin}")
        print(f"   Is Active: {user.is_active}")
        print(f"   Created: {user.created_at}")
        print(f"\nNote: Password is hashed and cannot be displayed.")
        print(f"      Use reset_user_password.py to set a new password.")
        
        return user

if __name__ == "__main__":
    email = "info.biosculptureportugal@gmail.com"
    
    if len(sys.argv) > 1:
        email = sys.argv[1]
    
    print(f"Checking user information for: {email}")
    print("=" * 60)
    check_user_info(email)

