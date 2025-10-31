#!/usr/bin/env python3
"""
Setup script for Gmail API credentials
This script helps create the necessary credentials.json file for Gmail API
"""

import os
import json
from pathlib import Path

def create_credentials_template():
    """Create a template for Gmail API credentials"""
    
    credentials_template = {
        "installed": {
            "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
            "project_id": "your-project-id",
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_secret": "YOUR_CLIENT_SECRET",
            "redirect_uris": ["http://localhost"]
        }
    }
    
    # Save template to backend directory
    backend_dir = Path(__file__).parent.parent / "backend"
    credentials_path = backend_dir / "credentials.json"
    
    with open(credentials_path, 'w') as f:
        json.dump(credentials_template, f, indent=2)
    
    print(f"✅ Created credentials template at: {credentials_path}")
    print("\n📋 Next steps:")
    print("1. Go to Google Cloud Console: https://console.cloud.google.com/")
    print("2. Create a new project or select existing one")
    print("3. Enable Gmail API")
    print("4. Create OAuth 2.0 credentials (Desktop application)")
    print("5. Download the credentials.json file")
    print("6. Replace the template values in credentials.json with your actual values")
    print("7. Run the authentication script to get the token.json file")

if __name__ == "__main__":
    create_credentials_template()
