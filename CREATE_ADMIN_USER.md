# Create Administrator User

Use this script to create an administrator user for your LinkUup deployment.

## On the Server

SSH to your server and run:

```bash
cd ~/Linkuup/backend
source ../venv/bin/activate

# Create admin user
python3 create_admin_user.py admin@linkuup.com 'YourSecurePassword123' 'Admin User'

# Or with first and last name
python3 create_admin_user.py admin@linkuup.com 'YourSecurePassword123' 'Admin User' 'Admin' 'User'
```

## What the Script Does

1. Checks if a user with the email already exists
2. If exists: Updates the user to be an admin
3. If new: Creates a new admin user with:
   - `is_admin = True`
   - `user_type = "platform_admin"`
   - Hashed password
   - Active status

## Example Usage

```bash
# Basic usage
python3 create_admin_user.py admin@example.com 'MyPassword123' 'Admin Name'

# With first and last name
python3 create_admin_user.py admin@example.com 'MyPassword123' 'John Doe' 'John' 'Doe'
```

## Verify Admin User

After creating, you can verify by logging into the application at:
- http://64.226.117.67
- Use the email and password you created

The admin user will have access to:
- Admin dashboard
- Platform statistics
- User management
- Place management
- Booking overview
- Campaign management
- Admin messaging

## Notes

- Use a strong password (mix of letters, numbers, special characters)
- Keep the password secure
- The user can change their password after logging in
- Multiple admin users can be created

