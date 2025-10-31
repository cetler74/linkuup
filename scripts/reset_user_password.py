#!/usr/bin/env python3
"""
Script to reset a user's password in the BioSearch application.
"""

import os
import sys

# Add the backend directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app import app, db, User, hash_password

def reset_user_password(email, new_password):
    """Reset a user's password"""
    with app.app_context():
        user = User.query.filter_by(email=email).first()
        if not user:
            print(f"❌ User with email {email} not found")
            return False
        
        # Update the password
        user.password_hash = hash_password(new_password)
        db.session.commit()
        
        print(f"✅ Password reset successfully for {email}")
        print(f"   New password: {new_password}")
        print(f"   User: {user.name}")
        print(f"   Admin: {user.is_admin}")
        
        return True

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python3 reset_user_password.py <email> <new_password>")
        print("Example: python3 reset_user_password.py cetler74@gmail.com newpassword123")
        sys.exit(1)
    
    email = sys.argv[1]
    new_password = sys.argv[2]
    
    print(f"Resetting password for {email}...")
    success = reset_user_password(email, new_password)
    
    if success:
        print("Password reset complete!")
    else:
        print("Password reset failed!")
        sys.exit(1)
