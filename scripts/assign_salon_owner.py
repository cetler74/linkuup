#!/usr/bin/env python3
"""
Script to assign an owner to a salon for testing image upload functionality
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from backend.app import app, db
from backend.app import Salon, User

def assign_salon_owner():
    with app.app_context():
        # Get the first user (assuming there's at least one user)
        user = User.query.first()
        if not user:
            print("❌ No users found in the database. Please create a user first.")
            return
        
        # Get the first salon
        salon = Salon.query.first()
        if not salon:
            print("❌ No salons found in the database.")
            return
        
        # Assign the user as the owner of the salon
        salon.owner_id = user.id
        db.session.commit()
        
        print(f"✅ Successfully assigned user '{user.name}' (ID: {user.id}) as owner of salon '{salon.nome}' (ID: {salon.id})")
        print(f"   User email: {user.email}")
        print(f"   Salon: {salon.nome}")

if __name__ == "__main__":
    assign_salon_owner()
