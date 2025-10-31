#!/usr/bin/env python3
"""
Manual Gmail API Authentication Script
This script generates an authorization URL for manual authentication
"""

import os
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from google_auth_oauthlib.flow import InstalledAppFlow
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request

# Gmail API scopes
SCOPES = ['https://www.googleapis.com/auth/gmail.send']

def manual_auth():
    """Generate authorization URL for manual authentication"""
    
    credentials_path = backend_dir / 'credentials.json'
    token_path = backend_dir / 'token.json'
    
    if not credentials_path.exists():
        print("❌ credentials.json not found!")
        return
    
    try:
        # Create flow
        flow = InstalledAppFlow.from_client_secrets_file(
            str(credentials_path), SCOPES)
        
        # Get authorization URL
        auth_url, _ = flow.authorization_url(prompt='consent')
        
        print("🔗 Please visit this URL to authorize the application:")
        print(f"\n{auth_url}\n")
        
        print("📋 After authorization:")
        print("1. You'll be redirected to a page that may show 'This site can't be reached'")
        print("2. Copy the ENTIRE URL from your browser's address bar")
        print("3. Paste it below when prompted")
        
        # Get authorization code from user
        auth_code = input("\n📝 Paste the full redirect URL here: ").strip()
        
        if not auth_code:
            print("❌ No URL provided")
            return
        
        # Extract authorization code from URL
        if 'code=' in auth_code:
            auth_code = auth_code.split('code=')[1].split('&')[0]
        
        # Exchange code for token
        flow.fetch_token(code=auth_code)
        creds = flow.credentials
        
        # Save credentials
        with open(token_path, 'w') as token:
            token.write(creds.to_json())
        
        print(f"✅ Authentication successful!")
        print(f"📁 Token saved to: {token_path}")
        
        # Test the credentials
        from gmail_api_service import GmailAPIService
        from flask import Flask
        
        app = Flask(__name__)
        os.environ['GMAIL_CREDENTIALS_PATH'] = str(credentials_path)
        os.environ['GMAIL_TOKEN_PATH'] = str(token_path)
        os.environ['GMAIL_SENDER_EMAIL'] = 'cetler74@gmail.com'
        
        gmail_service = GmailAPIService(app)
        
        # Send test email
        test_result = gmail_service.send_email(
            to='cetler74@gmail.com',
            subject='Gmail API Test - BioSearch',
            body_text='This is a test email sent via Gmail API.',
            body_html='<h1>Gmail API Test</h1><p>This is a test email sent via Gmail API.</p>'
        )
        
        if test_result:
            print("✅ Test email sent successfully!")
            print("📧 Check your inbox at cetler74@gmail.com")
        else:
            print("❌ Test email failed")
            
    except Exception as e:
        print(f"❌ Authentication failed: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    manual_auth()
