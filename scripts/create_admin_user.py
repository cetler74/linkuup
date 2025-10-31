#!/usr/bin/env python3
"""
Script to create an admin user for the BioSearch application.
This script can be run on the droplet to create an admin user.
"""

import os
import sys
import hashlib
import secrets
from datetime import datetime

# Add the backend directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app import app, db, User, hash_password

def create_admin_user():
    """Create an admin user"""
    with app.app_context():
        # Check if admin user already exists
        existing_admin = User.query.filter_by(is_admin=True).first()
        if existing_admin:
            print(f"Admin user already exists: {existing_admin.email}")
            return existing_admin
        
        # Create admin user
        admin_email = "admin@biosearch.pt"
        admin_password = "admin123"  # Change this to a secure password
        admin_name = "BioSearch Admin"
        
        # Check if user with this email already exists
        existing_user = User.query.filter_by(email=admin_email).first()
        if existing_user:
            # Update existing user to be admin
            existing_user.is_admin = True
            existing_user.password_hash = hash_password(admin_password)
            db.session.commit()
            print(f"Updated existing user {admin_email} to admin")
            return existing_user
        
        # Create new admin user
        admin_user = User(
            email=admin_email,
            password_hash=hash_password(admin_password),
            name=admin_name,
            customer_id="ADMIN",  # Special customer ID for admin
            auth_token=secrets.token_hex(32),
            is_admin=True,
            is_active=True,
            gdpr_data_processing_consent=True,
            gdpr_data_processing_consent_date=datetime.utcnow(),
            gdpr_marketing_consent=False,
            gdpr_consent_version='1.0'
        )
        
        db.session.add(admin_user)
        db.session.commit()
        
        print(f"✅ Admin user created successfully!")
        print(f"   Email: {admin_email}")
        print(f"   Password: {admin_password}")
        print(f"   Name: {admin_name}")
        print(f"   Admin: {admin_user.is_admin}")
        
        return admin_user

if __name__ == "__main__":
    print("Creating admin user for BioSearch...")
    admin_user = create_admin_user()
    print("Admin user setup complete!")
