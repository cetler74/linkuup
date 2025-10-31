#!/usr/bin/env python3
"""
Check Brevo account status and sender verification
"""

import os
import requests
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def check_brevo_account():
    """Check Brevo account status and sender information"""
    print("Checking Brevo Account Status...")
    print("=" * 50)
    
    # Get API key from environment
    api_key = os.getenv('BREVO_API_KEY')
    if not api_key:
        print("❌ BREVO_API_KEY not found in environment variables")
        return False
    
    print(f"✅ BREVO_API_KEY found: {api_key[:10]}...")
    
    # Check account information
    url = "https://api.brevo.com/v3/account"
    headers = {
        'api-key': api_key,
        'Accept': 'application/json'
    }
    
    try:
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
            account_data = response.json()
            print("✅ Account information retrieved successfully")
            print(f"Email: {account_data.get('email', 'N/A')}")
            print(f"First Name: {account_data.get('firstName', 'N/A')}")
            print(f"Last Name: {account_data.get('lastName', 'N/A')}")
            print(f"Company: {account_data.get('companyName', 'N/A')}")
            print(f"Plan: {account_data.get('plan', {}).get('type', 'N/A')}")
        else:
            print(f"❌ Failed to get account info. Status: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error getting account info: {str(e)}")
        return False
    
    # Check sender information
    print("\n" + "=" * 50)
    print("Checking Sender Information...")
    
    url = "https://api.brevo.com/v3/senders"
    try:
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
            senders = response.json()
            print(f"✅ Found {len(senders.get('senders', []))} verified senders:")
            
            for sender in senders.get('senders', []):
                print(f"  - Email: {sender.get('email', 'N/A')}")
                print(f"    Name: {sender.get('name', 'N/A')}")
                print(f"    Verified: {sender.get('verified', False)}")
                print(f"    Active: {sender.get('active', False)}")
                print()
        else:
            print(f"❌ Failed to get sender info. Status: {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Error getting sender info: {str(e)}")
    
    return True

def test_with_verified_sender():
    """Test sending email with a verified sender"""
    print("\n" + "=" * 50)
    print("Testing with verified sender...")
    
    api_key = os.getenv('BREVO_API_KEY')
    url = "https://api.brevo.com/v3/smtp/email"
    headers = {
        'api-key': api_key,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
    
    # Try with a more generic sender that might be verified
    payload = {
        "sender": {
            "name": "LinkUup",
            "email": "noreply@brevo.com"  # Try with Brevo's own domain
        },
        "to": [
            {
                "email": "cetler74@gmail.com",
                "name": "Test User"
            }
        ],
        "subject": "Test Email from Brevo Integration",
        "htmlContent": """
        <html>
        <body>
            <h2>Test Email from Brevo</h2>
            <p>This is a test email to verify Brevo integration.</p>
            <p>If you receive this, the integration is working!</p>
        </body>
        </html>
        """,
        "textContent": "Test Email from Brevo\n\nThis is a test email to verify Brevo integration.\nIf you receive this, the integration is working!"
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload)
        
        if response.status_code == 201:
            print("✅ Test email sent successfully with Brevo domain!")
            print(f"Response: {response.text}")
            return True
        else:
            print(f"❌ Failed to send email. Status: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error sending email: {str(e)}")
        return False

def check_email_delivery():
    """Check email delivery status"""
    print("\n" + "=" * 50)
    print("Checking Email Delivery...")
    print("Please check the following:")
    print("1. Check your Gmail inbox")
    print("2. Check your Gmail Spam/Junk folder")
    print("3. Check your Gmail Promotions tab")
    print("4. Check if emails are being filtered by Gmail")
    print("\nGmail sometimes filters emails from new senders or domains.")
    print("If you don't see the emails, they might be in spam or filtered.")

if __name__ == "__main__":
    print("Brevo Account and Delivery Check")
    print("=" * 60)
    
    # Check account status
    account_ok = check_brevo_account()
    
    if account_ok:
        # Test with verified sender
        test_with_verified_sender()
        
        # Check delivery
        check_email_delivery()
    
    print("\n" + "=" * 60)
    print("TROUBLESHOOTING TIPS:")
    print("1. Verify your sender email in Brevo dashboard")
    print("2. Check if noreply@linkuup.com is verified in Brevo")
    print("3. Look in Gmail spam folder")
    print("4. Check Gmail filters and blocked senders")
    print("5. Try adding noreply@linkuup.com to your Gmail contacts")
    print("6. Check if your domain has proper SPF/DKIM records")
