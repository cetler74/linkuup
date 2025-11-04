# Fixing Google OAuth "invalid_client" Error

## Error
```
401 Unauthorized
{
  "error": "invalid_client",
  "error_description": "Unauthorized"
}
```

## Common Causes

### 1. OAuth Application Type Mismatch
The most common cause is using **Desktop Application** credentials for a **Web Application**.

**Check in Google Cloud Console:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Find your OAuth 2.0 Client ID: `445811034196-ebo079aj7teacpam5b87jqmqo6rg1c63`
4. Check the **Application type**:
   - Should be: **Web application**
   - NOT: **Desktop application**

### 2. Wrong Client Secret
If you're using a **Web application**, make sure you're using the **Web application client secret**, not the Desktop application secret.

### 3. Client Secret Format
The client secret format should be:
- Web application: Usually starts with `GOCSPX-`
- Desktop application: Different format

### 4. Credentials Don't Match
Make sure the Client ID and Client Secret are from the same OAuth 2.0 credential pair.

## Solution Steps

### Step 1: Check OAuth Application Type

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Click on your OAuth 2.0 Client ID
4. Check the **Application type** field

### Step 2: If Using Desktop Application Type

**Option A: Create a Web Application credential** (Recommended for web apps)
1. In Google Cloud Console, click **+ CREATE CREDENTIALS** → **OAuth 2.0 Client ID**
2. Select **Web application** as the application type
3. Name it (e.g., "Linkuup Web OAuth")
4. Add Authorized redirect URIs:
   - `http://linkuup.portugalexpatdirectory.com/api/v1/auth/google/callback`
5. Click **CREATE**
6. Copy the new **Client ID** and **Client secret**
7. Update your `.env` file with the new credentials

**Option B: Switch existing credential to Web application**
- Some Google Cloud Console interfaces allow changing the application type
- If available, change from "Desktop application" to "Web application"

### Step 3: Update Backend Configuration

If you created new Web application credentials:

1. Update `/home/linkuup/Linkuup/backend/.env`:
   ```env
   GOOGLE_CLIENT_ID=YOUR_NEW_WEB_CLIENT_ID
   GOOGLE_CLIENT_SECRET=YOUR_NEW_WEB_CLIENT_SECRET
   ```

2. Restart the backend:
   ```bash
   pm2 restart linkuup-backend --update-env
   ```

3. Verify configuration:
   ```bash
   curl http://linkuup.portugalexpatdirectory.com/api/v1/auth/oauth/status
   ```

### Step 4: Verify Redirect URI

Make sure the redirect URI is added to the **Web application** credential (not the Desktop one):

1. In Google Cloud Console → Credentials
2. Click your **Web application** OAuth client ID
3. Under **Authorized redirect URIs**, verify:
   ```
   http://linkuup.portugalexpatdirectory.com/api/v1/auth/google/callback
   ```

## Testing

After updating credentials:

1. Try the OAuth flow again
2. Check backend logs:
   ```bash
   pm2 logs linkuup-backend | grep "Token exchange"
   ```
3. You should see:
   - `✅ Google user info retrieved - email: ...`
   - Instead of `❌ Failed to obtain Google access token: 401`

## Current Configuration Check

You can verify your current configuration:
```bash
curl http://linkuup.portugalexpatdirectory.com/api/v1/auth/oauth/status
```

This shows:
- Whether credentials are configured
- The redirect URI being used
- Base URL configuration

## Important Notes

- **Desktop Application** credentials are typically for installed apps (Electron, mobile apps, etc.)
- **Web Application** credentials are for server-side web apps (like this FastAPI backend)
- The credentials must match the OAuth flow you're using
- Never commit `.env` files with credentials to git

