#!/usr/bin/env python3
"""
Test script to verify password reset email functionality
"""
import sys
import os
from pathlib import Path

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))

# Load environment variables
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).parent / '.env'
    if env_path.exists():
        load_dotenv(dotenv_path=env_path)
except ImportError:
    pass

# Test email service
try:
    from email_service import email_service
    
    print("Testing password reset email...")
    print(f"Brevo service initialized: {email_service.brevo_service is not None}")
    print(f"Gmail service initialized: {email_service.gmail_service is not None}")
    
    if email_service.brevo_service:
        print(f"Brevo API key configured: {bool(email_service.brevo_service.api_key)}")
        print(f"Brevo sender email: {email_service.brevo_service.sender_email}")
        print(f"Brevo sender name: {email_service.brevo_service.sender_name}")
    
    # Test sending email
    test_email = "cetler74+owner1@gmail.com"
    test_name = "Test User"
    test_token = "test_token_123"
    test_url = "http://linkuup.portugalexpatdirectory.com/reset-password?token=test_token_123"
    
    print(f"\nAttempting to send test email to {test_email}...")
    result = email_service.send_password_reset_email(
        to_email=test_email,
        to_name=test_name,
        reset_token=test_token,
        reset_url=test_url,
        language='en'
    )
    
    if result:
        print(f"✅ Test email sent successfully!")
    else:
        print(f"❌ Test email failed to send")
        
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()

