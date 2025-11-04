# Google OAuth Setup for Production

## Domain Configuration
- **Production Domain**: `http://linkuup.portugalexpatdirectory.com`
- **Backend BASE_URL**: `http://linkuup.portugalexpatdirectory.com`
- **API Base**: `http://linkuup.portugalexpatdirectory.com/api/v1`

## Google OAuth Redirect URI

The redirect URI that **must be added** to Google Cloud Console:

```
http://linkuup.portugalexpatdirectory.com/api/v1/auth/google/callback
```

## Configuration Steps

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create one)
3. Navigate to **APIs & Services** → **Credentials**
4. Find your OAuth 2.0 Client ID:
   - Client ID: `445811034196-ebo079aj7teacpam5b87jqmqo6rg1c63.apps.googleusercontent.com`
5. Click **Edit** (pencil icon)
6. Under **Authorized redirect URIs**, click **+ ADD URI**
7. Add the redirect URI:
   ```
   http://linkuup.portugalexpatdirectory.com/api/v1/auth/google/callback
   ```
8. Click **SAVE**

### 2. Verify Configuration

After updating the redirect URI in Google Cloud Console, you can test the OAuth flow:

1. Navigate to your login page
2. Click "Sign in with Google"
3. You should be redirected to Google's consent screen
4. After authorization, you should be redirected back to your application

### 3. OAuth Status Endpoint

You can check the OAuth configuration status by calling:
```
http://linkuup.portugalexpatdirectory.com/api/v1/auth/oauth/status
```

This will return:
- Whether Google OAuth is configured
- The redirect URI being used
- The base URL configuration

## Current Configuration

✅ **Backend `.env`**:
- `BASE_URL=http://linkuup.portugalexpatdirectory.com`
- `GOOGLE_CLIENT_ID=445811034196-ebo079aj7teacpam5b87jqmqo6rg1c63.apps.googleusercontent.com`
- `GOOGLE_CLIENT_SECRET=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`

✅ **Frontend `.env.production`**:
- `VITE_API_BASE_URL=/api/v1` (relative path for same-domain deployment)

## Important Notes

1. **Redirect URI Must Match Exactly**: The redirect URI in Google Cloud Console must match exactly (including http/https, domain, and path)
2. **HTTPS vs HTTP**: If your production site uses HTTPS, make sure to:
   - Update `BASE_URL` to use `https://` instead of `http://`
   - Add the HTTPS redirect URI to Google Cloud Console
3. **Testing**: The redirect URI can be added and will work immediately after saving in Google Cloud Console (no need to wait)

## Troubleshooting

If Google OAuth is still not working:

1. **Check the redirect URI**:
   - Visit: `http://linkuup.portugalexpatdirectory.com/api/v1/auth/oauth/status`
   - Verify the redirect URI matches what's in Google Cloud Console

2. **Check backend logs**:
   ```bash
   pm2 logs linkuup-backend
   ```
   Look for error messages with 🔑 or ❌ emojis

3. **Verify Google Cloud Console**:
   - Ensure the redirect URI is added (no typos)
   - Check that the OAuth consent screen is configured
   - Verify the app is published (if not in testing mode)

4. **Test the endpoint directly**:
   ```bash
   curl http://linkuup.portugalexpatdirectory.com/api/v1/auth/google?user_type=customer
   ```
   This should redirect you to Google's OAuth consent screen

