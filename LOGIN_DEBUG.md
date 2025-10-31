# Login Debug Guide

## Working Credentials
- **Email:** `demo@example.com`
- **Password:** `demo123`

## Quick Debug Steps

1. **Clear Browser Storage:**
   - Open browser developer tools (F12)
   - Go to Console tab
   - Run: `localStorage.clear(); location.reload();`

2. **Check Network Requests:**
   - Open developer tools (F12)
   - Go to Network tab
   - Try to login
   - Look for POST request to `/api/auth/login`
   - Check if the request payload has correct email/password

3. **Backend Test (Working):**
   ```bash
   curl -X POST "http://localhost:5001/api/auth/login" \
     -H "Content-Type: application/json" \
     -d '{"email": "demo@example.com", "password": "demo123"}'
   ```

## If Still Not Working
Please check:
- Are you using the exact credentials above?
- Any JavaScript errors in browser console?
- What does the network request show in developer tools?
- Is the frontend making a request to `http://localhost:5001/api/auth/login`?

## Test Login in Browser Console
Open browser console and run:
```javascript
fetch('http://localhost:5001/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'demo@example.com', password: 'demo123' })
}).then(r => r.json()).then(console.log).catch(console.error);
```
