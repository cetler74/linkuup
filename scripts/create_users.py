#!/usr/bin/env python3
"""
Script to create sample users in the database
"""

import psycopg2
import hashlib
import secrets
from datetime import datetime

# Database connection
postgres_url = "postgresql://carloslarramba@localhost:5432/linkuup_db"

def hash_password(password):
    """Hash a password using SHA-256 with salt"""
    salt = secrets.token_hex(16)
    password_hash = hashlib.sha256((password + salt).encode()).hexdigest()
    return f"{salt}:{password_hash}"

def create_users():
    print("🔄 Creating sample users...")
    
    conn = psycopg2.connect(postgres_url)
    cursor = conn.cursor()
    
    try:
        # Create admin user
        admin_password = "admin123"
        admin_hash = hash_password(admin_password)
        admin_token = secrets.token_urlsafe(32)
        
        cursor.execute("""
            INSERT INTO users (
                email, password_hash, name, customer_id, auth_token, is_admin, is_active,
                created_at, gdpr_data_processing_consent, gdpr_marketing_consent, gdpr_consent_version
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            ) ON CONFLICT (email) DO NOTHING
        """, (
            "admin@linkuup.com",
            admin_hash,
            "Admin User",
            "ADMIN001",
            admin_token,
            True,  # is_admin
            True,  # is_active
            datetime.utcnow(),
            True,  # gdpr_data_processing_consent
            False, # gdpr_marketing_consent
            "1.0"  # gdpr_consent_version
        ))
        
        # Create regular user
        user_password = "user123"
        user_hash = hash_password(user_password)
        user_token = secrets.token_urlsafe(32)
        
        cursor.execute("""
            INSERT INTO users (
                email, password_hash, name, customer_id, auth_token, is_admin, is_active,
                created_at, gdpr_data_processing_consent, gdpr_marketing_consent, gdpr_consent_version
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            ) ON CONFLICT (email) DO NOTHING
        """, (
            "user@linkuup.com",
            user_hash,
            "Regular User",
            "USER001",
            user_token,
            False, # is_admin
            True,  # is_active
            datetime.utcnow(),
            True,  # gdpr_data_processing_consent
            False, # gdpr_marketing_consent
            "1.0"  # gdpr_consent_version
        ))
        
        # Create salon owner user
        owner_password = "owner123"
        owner_hash = hash_password(owner_password)
        owner_token = secrets.token_urlsafe(32)
        
        cursor.execute("""
            INSERT INTO users (
                email, password_hash, name, customer_id, auth_token, is_admin, is_active,
                created_at, gdpr_data_processing_consent, gdpr_marketing_consent, gdpr_consent_version
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            ) ON CONFLICT (email) DO NOTHING
        """, (
            "owner@linkuup.com",
            owner_hash,
            "Salon Owner",
            "OWNER001",
            owner_token,
            False, # is_admin
            True,  # is_active
            datetime.utcnow(),
            True,  # gdpr_data_processing_consent
            False, # gdpr_marketing_consent
            "1.0"  # gdpr_consent_version
        ))
        
        conn.commit()
        print("✅ Users created successfully!")
        
        # Show created users
        cursor.execute("SELECT id, email, name, is_admin, is_active FROM users ORDER BY id;")
        users = cursor.fetchall()
        print(f"📊 Created {len(users)} users:")
        for user in users:
            print(f"  - ID: {user[0]}, Email: {user[1]}, Name: {user[2]}, Admin: {user[3]}, Active: {user[4]}")
        
        print("\n🔑 Login Credentials:")
        print("  Admin: admin@linkuup.com / admin123")
        print("  User: user@linkuup.com / user123")
        print("  Owner: owner@linkuup.com / owner123")
        
    except Exception as e:
        print(f"❌ Error creating users: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    create_users()
