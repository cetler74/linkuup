# Fix Google OAuth Configuration

## The Issue
Your Google Cloud project is in "Testing" mode, which means only approved test users can access the OAuth application.

## Solution Options

### Option 1: Add Test User (Recommended for now)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project: `capable-shape-471814-v0`
3. Go to **APIs & Services** → **OAuth consent screen**
4. Scroll down to **Test users** section
5. Click **+ ADD USERS**
6. Add your email: `cetler74@gmail.com`
7. Click **SAVE**

### Option 2: Publish the App (For production)
1. Go to **APIs & Services** → **OAuth consent screen**
2. Click **PUBLISH APP**
3. Confirm the publishing

## Additional Configuration
Make sure these settings are correct:

### OAuth Consent Screen
- **App name**: BioSearch Email Service
- **User support email**: cetler74@gmail.com
- **Developer contact information**: cetler74@gmail.com
- **Scopes**: `https://www.googleapis.com/auth/gmail.send`

### Credentials
- **Application type**: Desktop application
- **Name**: BioSearch Gmail API

## After Configuration
Once you've added yourself as a test user or published the app, try the authorization URL again.

## Alternative: Use Service Account (Advanced)
If OAuth continues to have issues, we can switch to a Service Account approach, which doesn't require user interaction.
