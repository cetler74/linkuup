# User Management Guide

## Checking User: info.biosculptureportugal@gmail.com

### Option 1: Check if User Exists

```bash
cd "/Volumes/OWC Volume/Projects2025/BioSearch2"
python3 scripts/check_user_info.py
```

This will show you if the user exists and display their information (except password).

### Option 2: Reset Password

If the user exists, reset their password:

```bash
cd "/Volumes/OWC Volume/Projects2025/BioSearch2"
python3 scripts/reset_user_password.py info.biosculptureportugal@gmail.com NewPassword123
```

Replace `NewPassword123` with your desired password.

### Option 3: Create Admin User

If the user doesn't exist and you want to create them as an admin:

```bash
cd "/Volumes/OWC Volume/Projects2025/BioSearch2"
python3 scripts/create_admin_user.py
```

**Note**: This creates a default admin user:
- Email: `admin@biosearch.pt`
- Password: `admin123`

### Option 4: Query Database Directly (On Server)

If you need to check on the production server:

```bash
# SSH to server
ssh root@147.93.89.178

# Connect to PostgreSQL
psql linkuup_db

# Check if user exists
SELECT email, name, is_admin, is_active, created_at 
FROM users 
WHERE email = 'info.biosculptureportugal@gmail.com';

# List all users
SELECT email, name, is_admin, is_active 
FROM users 
ORDER BY created_at DESC;

# Exit PostgreSQL
\q
```

### Option 5: Create New User Manually

If you need to create this specific user with specific credentials:

```python
#!/usr/bin/env python3
import os
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from app import app, db, User, hash_password
import secrets
from datetime import datetime

with app.app_context():
    # Check if user exists
    existing = User.query.filter_by(email='info.biosculptureportugal@gmail.com').first()
    
    if existing:
        print(f"User already exists: {existing.email}")
        print(f"Name: {existing.name}")
        print(f"Admin: {existing.is_admin}")
    else:
        # Create new user
        new_user = User(
            email='info.biosculptureportugal@gmail.com',
            password_hash=hash_password('YourPasswordHere'),  # CHANGE THIS
            name='Bio Sculpture Portugal',
            customer_id='BSP001',  # CHANGE THIS
            auth_token=secrets.token_hex(32),
            is_admin=True,  # Set to False if not admin
            is_active=True,
            gdpr_data_processing_consent=True,
            gdpr_data_processing_consent_date=datetime.utcnow(),
            gdpr_marketing_consent=False,
            gdpr_consent_version='1.0'
        )
        
        db.session.add(new_user)
        db.session.commit()
        
        print(f"✅ User created successfully!")
        print(f"   Email: {new_user.email}")
        print(f"   Password: YourPasswordHere")  # CHANGE THIS
        print(f"   Admin: {new_user.is_admin}")
```

## Common Scenarios

### Scenario 1: User Forgot Password
```bash
# Reset password to something temporary
python3 scripts/reset_user_password.py info.biosculptureportugal@gmail.com TempPass123

# Then tell them to change it after logging in
```

### Scenario 2: Need to Test Login After CORS Fix
```bash
# Option A: Use existing admin user
Email: admin@biosearch.pt
Password: admin123

# Option B: Create a test user
python3 scripts/reset_user_password.py info.biosculptureportugal@gmail.com TestPassword123
```

### Scenario 3: Check All Admin Users
```bash
# On server
ssh root@147.93.89.178
psql linkuup_db -c "SELECT email, name, is_admin FROM users WHERE is_admin = true;"
```

## Quick Reference

### Default Admin Credentials (if created)
- **Email**: `admin@biosearch.pt`
- **Password**: `admin123`
- **Location**: Created by `scripts/create_admin_user.py`

### Common Commands

```bash
# Check user info
python3 scripts/check_user_info.py info.biosculptureportugal@gmail.com

# Reset password
python3 scripts/reset_user_password.py EMAIL NEW_PASSWORD

# Create admin
python3 scripts/create_admin_user.py

# List all users (on server)
ssh root@147.93.89.178 'psql linkuup_db -c "SELECT email, name, is_admin FROM users;"'
```

## Security Notes

1. **Never commit passwords** to version control
2. **Change default passwords** immediately after deployment
3. **Use strong passwords** for production
4. **Rotate passwords regularly** for admin accounts
5. **Audit admin users** periodically

## Testing the Login After CORS Fix

Once you have credentials, test the login:

1. **Open**: `http://findursalon.biosculpture.pt`
2. **Click**: "Login" or "Manager Login"
3. **Enter**:
   - Email: `info.biosculptureportugal@gmail.com` (or your test user)
   - Password: (the password you set)
4. **Check**: Browser console (F12) should show no CORS errors
5. **Verify**: Successfully logged in and redirected to dashboard

---

**Need Help?** Run the check script first to see if the user exists:
```bash
python3 scripts/check_user_info.py
```

