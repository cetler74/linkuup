# Google OAuth `invalid_client` Error Debugging Checklist

## Error
```
401 Unauthorized
{
  "error": "invalid_client",
  "error_description": "Unauthorized"
}
```

## Current Status
- ✅ Works for `localhost`
- ❌ Fails for production (`linkuup.portugalexpatdirectory.com`)
- ✅ Both redirect URIs are configured in Google Cloud Console
- ✅ Client ID and Secret are loaded from `.env`

## Debugging Steps

### 1. Verify Redirect URI Match
The redirect_uri used in the **authorization request** must match exactly with the one used in the **token exchange**.

**Authorization request (line 422):**
```
redirect_uri = f"{_get_base_api_url()}/auth/google/callback"
```

**Token exchange (line 494):**
```
redirect_uri = f"{scheme}://{host}{path}"
```

**Check if they match:**
```bash
pm2 logs linkuup-backend | grep "Starting Google OAuth\|redirect_uri from request"
```

They should both show:
```
http://linkuup.portugalexpatdirectory.com/api/v1/auth/google/callback
```

### 2. Verify Client Secret
The `invalid_client` error often means the client secret is incorrect or doesn't match the client ID.

**Check in Google Cloud Console:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Find Client ID: `445811034196-ebo079aj7teacpam5b87jqmqo6rg1c63`
4. Click **Edit**
5. Check if there's a **different** client secret listed there
6. Compare with what's in `.env`:
   ```
   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
   ```

**Important:** The client secret in Google Cloud Console might be different from what's in your `.env` file. If it was regenerated, you need to update `.env`.

### 3. Check OAuth Application Type
The OAuth application type must be **Web application** (not Desktop application).

**In Google Cloud Console:**
1. Check the **Application type** field
2. Should be: **Web application**
3. If it's "Desktop application", you need to:
   - Create a new Web application credential
   - Or check if you can change the type

### 4. Verify Redirect URI in Google Console
Even though you added both URIs, verify they match **exactly**:

**Should be in Google Console:**
```
http://localhost:5001/api/v1/auth/google/callback
http://linkuup.portugalexpatdirectory.com/api/v1/auth/google/callback
```

**Check for:**
- No trailing slashes
- No port numbers (unless using localhost)
- Exact case matching
- `http://` not `https://` (unless using HTTPS)

### 5. Check if Client Secret Was Regenerated
If the client secret was regenerated in Google Cloud Console, the old one in `.env` won't work.

**To fix:**
1. Generate a new client secret in Google Cloud Console
2. Update `.env` file with the new secret
3. Restart backend: `pm2 restart linkuup-backend --update-env`

### 6. Verify Credentials Are Loaded Correctly
Check backend logs after restart:
```bash
pm2 logs linkuup-backend | grep "Token exchange\|Client Secret"
```

Look for:
- Client Secret length: should be 35 characters
- Client Secret starts with: `GOCSPX-`
- Client ID matches: `445811034196-ebo079aj7teacpam5b87jqmqo6rg1c63`

## Next Steps

1. **Check Google Cloud Console:**
   - Verify the client secret matches what's in `.env`
   - If different, update `.env` with the correct secret
   - Restart backend

2. **Check Application Type:**
   - Ensure it's "Web application"
   - If not, create a new Web application credential

3. **Verify Redirect URIs:**
   - Check both are listed exactly as above
   - No extra characters, trailing slashes, or ports

4. **Try Again:**
   - Test the OAuth flow
   - Check logs for the new detailed debug output

## Common Solutions

### Solution 1: Regenerate Client Secret
1. In Google Cloud Console, go to your OAuth client
2. Click **Reset Secret** or generate a new one
3. Copy the new secret
4. Update `.env` file
5. Restart backend

### Solution 2: Create New Web Application Credential
If the current credential is a Desktop application:
1. Create a new OAuth 2.0 Client ID
2. Select **Web application**
3. Add redirect URIs
4. Use the new Client ID and Secret
5. Update `.env` file

### Solution 3: Verify Secret Format
The secret should:
- Start with `GOCSPX-` (for Web application)
- Be exactly 35 characters
- Not have quotes or extra spaces

