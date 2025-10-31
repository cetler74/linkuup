#!/usr/bin/env python3
"""
Gmail API Authentication Script
This script handles the OAuth flow to get the token.json file
"""

import os
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from gmail_api_service import GmailAPIService
from flask import Flask

def authenticate_gmail():
    """Run Gmail API authentication"""
    
    app = Flask(__name__)
    
    # Set environment variables
    os.environ['GMAIL_CREDENTIALS_PATH'] = str(backend_dir / 'credentials.json')
    os.environ['GMAIL_TOKEN_PATH'] = str(backend_dir / 'token.json')
    os.environ['GMAIL_SENDER_EMAIL'] = 'cetler74@gmail.com'
    
    try:
        # Initialize Gmail API service
        gmail_service = GmailAPIService(app)
        
        print("✅ Gmail API authentication successful!")
        print(f"📁 Token saved to: {backend_dir / 'token.json'}")
        print("📧 You can now send emails using Gmail API")
        
        # Test sending an email
        test_result = gmail_service.send_email(
            to='cetler74@gmail.com',
            subject='Gmail API Test - BioSearch',
            body_text='This is a test email sent via Gmail API.',
            body_html='<h1>Gmail API Test</h1><p>This is a test email sent via Gmail API.</p>'
        )
        
        if test_result:
            print("✅ Test email sent successfully!")
        else:
            print("❌ Test email failed")
            
    except Exception as e:
        print(f"❌ Authentication failed: {str(e)}")
        print("\n🔧 Troubleshooting:")
        print("1. Make sure credentials.json exists and has valid values")
        print("2. Check that Gmail API is enabled in Google Cloud Console")
        print("3. Verify the OAuth 2.0 credentials are correct")

if __name__ == "__main__":
    authenticate_gmail()
