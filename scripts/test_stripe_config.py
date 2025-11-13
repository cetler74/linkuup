#!/usr/bin/env python3
"""
Test script to validate Stripe configuration scenarios for Pro plan registration.
This script checks the configuration state and provides guidance for testing.
"""

import os
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

def check_stripe_config():
    """Check current Stripe configuration state"""
    from core.config import settings
    
    print("=" * 60)
    print("STRIPE CONFIGURATION CHECK")
    print("=" * 60)
    print()
    
    stripe_secret = getattr(settings, 'STRIPE_SECRET_KEY', None) or os.getenv('STRIPE_SECRET_KEY')
    stripe_webhook = getattr(settings, 'STRIPE_WEBHOOK_SECRET', None) or os.getenv('STRIPE_WEBHOOK_SECRET')
    stripe_price_pro = getattr(settings, 'STRIPE_PRICE_ID_PRO', None) or os.getenv('STRIPE_PRICE_ID_PRO')
    app_url = getattr(settings, 'APP_URL', None) or os.getenv('APP_URL')
    
    print("Configuration Status:")
    print("-" * 60)
    
    # Check STRIPE_SECRET_KEY
    if not stripe_secret:
        print("❌ STRIPE_SECRET_KEY: NOT SET")
        print("   → Scenario 1: No credentials (Expected behavior)")
    elif stripe_secret.startswith('sk_test_') or stripe_secret.startswith('sk_live_'):
        # Check if it looks valid (has proper length)
        if len(stripe_secret) > 50:
            print(f"✅ STRIPE_SECRET_KEY: SET (length: {len(stripe_secret)})")
            print(f"   → Value: {stripe_secret[:20]}...{stripe_secret[-10:]}")
            print("   → Scenario 2 or 3: Credentials configured")
        else:
            print(f"⚠️  STRIPE_SECRET_KEY: SET but looks INVALID (too short)")
            print(f"   → Value: {stripe_secret}")
            print("   → Scenario 2: Invalid credentials (Expected behavior)")
    else:
        print(f"⚠️  STRIPE_SECRET_KEY: SET but looks INVALID")
        print(f"   → Value: {stripe_secret[:30]}...")
        print("   → Scenario 2: Invalid credentials (Expected behavior)")
    
    print()
    
    # Check STRIPE_WEBHOOK_SECRET
    if not stripe_webhook:
        print("❌ STRIPE_WEBHOOK_SECRET: NOT SET")
    else:
        print(f"✅ STRIPE_WEBHOOK_SECRET: SET (length: {len(stripe_webhook)})")
    
    print()
    
    # Check STRIPE_PRICE_ID_PRO
    if not stripe_price_pro:
        print("❌ STRIPE_PRICE_ID_PRO: NOT SET")
    else:
        print(f"✅ STRIPE_PRICE_ID_PRO: SET")
        print(f"   → Value: {stripe_price_pro}")
    
    print()
    
    # Check APP_URL
    if not app_url:
        print("❌ APP_URL: NOT SET")
        print("   → Required for Stripe checkout redirects")
    else:
        print(f"✅ APP_URL: SET")
        print(f"   → Value: {app_url}")
    
    print()
    print("=" * 60)
    print("TESTING SCENARIOS")
    print("=" * 60)
    print()
    
    # Determine current scenario
    if not stripe_secret:
        print("📋 CURRENT SCENARIO: Scenario 1 - No Stripe Credentials")
        print()
        print("Expected Behavior:")
        print("  ✅ Pro plan registration should show error")
        print("  ✅ No user account should be created")
        print("  ✅ Error: 'Payment system is not configured...'")
        print()
        print("To test Scenario 2:")
        print("  1. Set STRIPE_SECRET_KEY=sk_test_invalid_key_12345 in .env")
        print("  2. Restart backend server")
        print("  3. Test Pro plan registration")
        print()
    elif len(stripe_secret) < 50 or not (stripe_secret.startswith('sk_test_') or stripe_secret.startswith('sk_live_')):
        print("📋 CURRENT SCENARIO: Scenario 2 - Invalid Stripe Credentials")
        print()
        print("Expected Behavior:")
        print("  ✅ Pro plan registration should attempt Stripe checkout")
        print("  ✅ Stripe API should return error (invalid key)")
        print("  ✅ No user account should be created")
        print("  ✅ Error: 'Payment setup failed...'")
        print()
        print("To test Scenario 3:")
        print("  1. Set valid STRIPE_SECRET_KEY in .env")
        print("  2. Set valid STRIPE_PRICE_ID_PRO in .env")
        print("  3. Restart backend server")
        print("  4. Test Pro plan registration")
        print()
    else:
        print("📋 CURRENT SCENARIO: Scenario 3 - Valid Stripe Credentials")
        print()
        print("Expected Behavior:")
        print("  ✅ Pro plan registration should redirect to Stripe")
        print("  ✅ User completes payment")
        print("  ✅ User account created after payment")
        print("  ✅ Welcome email sent")
        print()
        print("⚠️  NOTE: This requires actual Stripe test credentials")
        print("   Make sure you have:")
        print("   - Valid test API key (sk_test_...)")
        print("   - Valid Pro plan price ID")
        print("   - Webhook configured (for production)")
        print()
    
    print("=" * 60)
    print("QUICK TEST COMMANDS")
    print("=" * 60)
    print()
    print("1. Check backend logs for Pro plan registration:")
    print("   tail -f /path/to/backend/logs/app.log | grep -i 'pro plan\\|payment\\|stripe'")
    print()
    print("2. Check database for test user:")
    print("   psql linkuup_db -c \"SELECT id, email, user_type FROM users WHERE email = 'test@example.com';\"")
    print()
    print("3. Test with curl (if API is accessible):")
    print("   curl -X GET 'http://localhost:5001/api/v1/auth/google?user_type=business_owner&selected_plan_code=pro&action=register'")
    print()
    
    return {
        'stripe_secret': stripe_secret,
        'stripe_webhook': stripe_webhook,
        'stripe_price_pro': stripe_price_pro,
        'app_url': app_url
    }


def test_stripe_service():
    """Test if Stripe service can be initialized"""
    print()
    print("=" * 60)
    print("STRIPE SERVICE TEST")
    print("=" * 60)
    print()
    
    try:
        from services import stripe_service
        from core.config import settings
        
        if not settings.STRIPE_SECRET_KEY:
            print("❌ Cannot test: STRIPE_SECRET_KEY not configured")
            return False
        
        print("Attempting to initialize Stripe...")
        stripe_service._init_stripe()
        print("✅ Stripe initialized successfully")
        
        # Try to get price ID for Pro plan
        try:
            price_id = stripe_service.get_price_id_for_plan("pro")
            if price_id:
                print(f"✅ Pro plan price ID found: {price_id}")
            else:
                print("⚠️  Pro plan price ID not found in configuration")
        except Exception as e:
            print(f"⚠️  Error getting price ID: {e}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error initializing Stripe: {e}")
        import traceback
        print(traceback.format_exc())
        return False


if __name__ == "__main__":
    print()
    print("🔍 Testing Stripe Configuration for Pro Plan Registration")
    print()
    
    config = check_stripe_config()
    
    # Only test Stripe service if credentials are configured
    if config['stripe_secret']:
        test_stripe_service()
    
    print()
    print("=" * 60)
    print("TEST COMPLETE")
    print("=" * 60)
    print()
    print("Next steps:")
    print("1. Review the configuration status above")
    print("2. Test Pro plan registration in the frontend")
    print("3. Check backend logs for detailed flow information")
    print("4. Verify database state after each test")
    print()

