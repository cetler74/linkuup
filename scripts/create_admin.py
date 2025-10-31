#!/usr/bin/env python3
"""
Script to create the default admin user for BioSearch
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app import app, db, User, hash_password
import secrets

def create_admin_user():
    """Create the default admin user"""
    with app.app_context():
        # Create tables if they don't exist
        db.create_all()
        
        # Check if admin already exists
        admin = User.query.filter_by(email='admin@biosearch.pt').first()
        if admin:
            print("Admin user already exists!")
            print(f"Email: {admin.email}")
            print(f"Name: {admin.name}")
            print(f"Is Admin: {admin.is_admin}")
            return
        
        # Create admin user
        admin = User(
            name="System Administrator",
            email="admin@biosearch.pt",
            password_hash=hash_password("admin123"),
            auth_token=secrets.token_hex(32),
            is_admin=True,
            is_active=True
        )
        
        db.session.add(admin)
        db.session.commit()
        
        print("Admin user created successfully!")
        print("=" * 50)
        print("ADMIN CREDENTIALS:")
        print("Email: admin@biosearch.pt")
        print("Password: admin123")
        print("=" * 50)
        print("⚠️  IMPORTANT: Change the password after first login!")

if __name__ == "__main__":
    create_admin_user()
