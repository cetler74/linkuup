# Google OAuth: Multiple Redirect URIs Setup

## Issue
OAuth works for `localhost` but fails with `invalid_client` error on production domain.

## Cause
Google OAuth requires the redirect URI used in token exchange to match **exactly** with what's registered in Google Cloud Console.

If only `localhost` is registered, but you're using the production domain, Google will reject the token exchange with `invalid_client`.

## Solution: Add Multiple Redirect URIs

You need to add **BOTH** redirect URIs to your Google Cloud Console OAuth credentials.

### Step 1: Go to Google Cloud Console
1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Find your OAuth 2.0 Client ID: `445811034196-ebo079aj7teacpam5b87jqmqo6rg1c63`
4. Click **Edit** (pencil icon)

### Step 2: Add Both Redirect URIs
Under **Authorized redirect URIs**, add **BOTH**:

1. **Development (localhost):**
   ```
   http://localhost:5001/api/v1/auth/google/callback
   ```

2. **Production:**
   ```
   http://linkuup.portugalexpatdirectory.com/api/v1/auth/google/callback
   ```

### Step 3: Save
1. Click **SAVE**
2. Wait a few seconds for Google to process the changes

### Step 4: Verify
After adding both URIs, the OAuth flow should work for both:
- ✅ Local development (`http://localhost:5001`)
- ✅ Production (`http://linkuup.portugalexpatdirectory.com`)

## Why Both URIs?

The redirect URI is determined by the `BASE_URL` environment variable:
- **Development**: `BASE_URL=http://localhost:5001` (default)
- **Production**: `BASE_URL=http://linkuup.portugalexpatdirectory.com` (set in `.env`)

The OAuth flow constructs the redirect URI as:
```
{BASE_URL}/api/v1/auth/google/callback
```

Since `BASE_URL` changes between environments, you need both URIs registered.

## Testing

### Test Development:
1. Ensure `BASE_URL` is not set (or set to `http://localhost:5001`)
2. Visit: `http://localhost:5001/api/v1/auth/google?user_type=customer`
3. Should redirect to Google and back

### Test Production:
1. Ensure `BASE_URL=http://linkuup.portugalexpatdirectory.com` in `.env`
2. Restart backend: `pm2 restart linkuup-backend --update-env`
3. Visit: `http://linkuup.portugalexpatdirectory.com/api/v1/auth/google?user_type=customer`
4. Should redirect to Google and back

## HTTPS Support (Future)

If you switch to HTTPS, add the HTTPS redirect URI as well:
```
https://linkuup.portugalexpatdirectory.com/api/v1/auth/google/callback
```

You can have **multiple** redirect URIs for the same OAuth client.

## Verification

Check your OAuth configuration:
```bash
curl http://linkuup.portugalexpatdirectory.com/api/v1/auth/oauth/status
```

This shows which redirect URI is currently being used.

