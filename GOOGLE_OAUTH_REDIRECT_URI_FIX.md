# Google OAuth Redirect URI Fix

## Error Message
```
Error 400: redirect_uri_mismatch
```

## Exact Redirect URI to Add

You must add **exactly** this redirect URI to Google Cloud Console:

```
http://linkuup.portugalexpatdirectory.com/api/v1/auth/google/callback
```

**Important Notes:**
- Must start with `http://` (not `https://` unless your site uses HTTPS)
- Must end with `/api/v1/auth/google/callback` (no trailing slash)
- Domain must be exactly: `linkuup.portugalexpatdirectory.com` (no `www.`)
- Path must be exactly: `/api/v1/auth/google/callback` (case-sensitive)

## Step-by-Step Instructions

### 1. Go to Google Cloud Console
1. Visit: https://console.cloud.google.com/
2. Select your project (the one with Client ID: `445811034196-ebo079aj7teacpam5b87jqmqo6rg1c63`)

### 2. Navigate to OAuth Credentials
1. Go to **APIs & Services** → **Credentials**
2. Find your OAuth 2.0 Client ID:
   - Client ID: `445811034196-ebo079aj7teacpam5b87jqmqo6rg1c63.apps.googleusercontent.com`
3. Click on it (or click the **Edit** pencil icon)

### 3. Add the Redirect URI
1. Scroll down to **Authorized redirect URIs**
2. Click **+ ADD URI**
3. Copy and paste **exactly** this URI:
   ```
   http://linkuup.portugalexpatdirectory.com/api/v1/auth/google/callback
   ```
4. **Double-check for:**
   - No trailing slash at the end
   - No `www.` prefix
   - Correct `http://` (or `https://` if your site uses HTTPS)
   - Exact path: `/api/v1/auth/google/callback`

### 4. Save
1. Click **SAVE**
2. Wait a few seconds for Google to process the change

## Verification

### Option 1: Check Backend Status
Visit this URL to verify the redirect URI configuration:
```
http://linkuup.portugalexpatdirectory.com/api/v1/auth/oauth/status
```

You should see:
```json
{
  "google_oauth": {
    "configured": true,
    "redirect_uri": "http://linkuup.portugalexpatdirectory.com/api/v1/auth/google/callback"
  }
}
```

### Option 2: Test OAuth Flow
1. Go to your login page
2. Click "Sign in with Google"
3. You should be redirected to Google's consent screen
4. After authorization, you should be redirected back to your app

## Common Mistakes

❌ **WRONG:**
- `https://linkuup.portugalexpatdirectory.com/api/v1/auth/google/callback` (if site uses HTTP)
- `http://www.linkuup.portugalexpatdirectory.com/api/v1/auth/google/callback` (www prefix)
- `http://linkuup.portugalexpatdirectory.com/api/v1/auth/google/callback/` (trailing slash)
- `http://linkuup.portugalexpatdirectory.com:80/api/v1/auth/google/callback` (port number)
- `http://linkuup.portugalexpatdirectory.com/auth/google/callback` (missing `/api/v1`)

✅ **CORRECT:**
- `http://linkuup.portugalexpatdirectory.com/api/v1/auth/google/callback`

## If Your Site Uses HTTPS

If your production site uses HTTPS (not HTTP), you need to:

1. **Update backend `.env`:**
   ```
   BASE_URL=https://linkuup.portugalexpatdirectory.com
   ```

2. **Restart the backend:**
   ```bash
   pm2 restart linkuup-backend --update-env
   ```

3. **Add HTTPS redirect URI to Google Cloud Console:**
   ```
   https://linkuup.portugalexpatdirectory.com/api/v1/auth/google/callback
   ```

4. **You can add BOTH HTTP and HTTPS** to Google Cloud Console for flexibility

## Troubleshooting

If you still get the error after adding the redirect URI:

1. **Check the exact URI in the error:**
   - Look at the Google error page
   - It should show the redirect_uri that was attempted
   - Compare it character-by-character with what you added

2. **Wait a few minutes:**
   - Google may take 1-2 minutes to propagate the change

3. **Clear browser cache:**
   - Try in an incognito/private window
   - Clear cookies and cache

4. **Check backend logs:**
   ```bash
   pm2 logs linkuup-backend | grep "Starting Google OAuth"
   ```
   Look for the `redirect_uri` being printed - it should match exactly

5. **Verify in Google Cloud Console:**
   - Go back to Credentials
   - Make sure the redirect URI is still there (no typos)
   - Check if there are multiple similar URIs that might cause confusion

