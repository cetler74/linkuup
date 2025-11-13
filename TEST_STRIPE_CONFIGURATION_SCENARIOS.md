# Stripe Configuration Test Scenarios

This document outlines the test scenarios for Pro plan registration with different Stripe configuration states.

## Test Scenarios

### Scenario 1: No Stripe Credentials Configured
**Expected Behavior:**
- User selects Pro plan
- User authenticates with Google
- System detects Pro plan requires payment
- System checks for Stripe credentials → **NOT FOUND**
- System returns error: "Payment system is not configured. Pro plan registration requires payment setup. Please contact support."
- **NO user account is created**
- User is redirected to registration page with error

**Test Steps:**
1. Ensure `STRIPE_SECRET_KEY` is not set in `.env` or is empty
2. Restart backend server
3. Go to registration page
4. Select **Pro plan**
5. Click "Sign in with Google"
6. Authenticate with Google
7. Verify error message appears
8. Verify no user account was created in database

**Backend Logs to Check:**
```
🔍 Checking payment requirements - action: register, selected_plan_code: pro, user_type: business_owner
🔍 ✅ Pro plan registration detected - requires payment before account creation
🔍 Final payment requirement check: requires_payment=True
🔍 Redirecting Pro plan OAuth registration to payment checkout
❌ Payment system is not configured. Pro plan registration requires payment setup. Please contact support.
```

**Database Verification:**
```sql
-- This should return NO rows
SELECT * FROM users WHERE email = 'test@example.com';
```

---

### Scenario 2: Incorrect Stripe Credentials Configured
**Expected Behavior:**
- User selects Pro plan
- User authenticates with Google
- System detects Pro plan requires payment
- System checks for Stripe credentials → **FOUND but INVALID**
- System attempts to create Stripe checkout session
- Stripe API returns error (invalid API key)
- System catches exception and returns error
- **NO user account is created**
- User sees error: "Payment setup failed. Please try again or contact support."

**Test Steps:**
1. Set `STRIPE_SECRET_KEY=sk_test_invalid_key_12345` in `.env`
2. Set `STRIPE_WEBHOOK_SECRET=whsec_invalid` in `.env`
3. Set `APP_URL=http://localhost:5173` in `.env`
4. Restart backend server
5. Go to registration page
6. Select **Pro plan**
7. Click "Sign in with Google"
8. Authenticate with Google
9. Verify error message appears
10. Verify no user account was created in database

**Backend Logs to Check:**
```
🔍 Checking payment requirements - action: register, selected_plan_code: pro, user_type: business_owner
🔍 ✅ Pro plan registration detected - requires payment before account creation
🔍 Final payment requirement check: requires_payment=True
🔍 Redirecting Pro plan OAuth registration to payment checkout
❌ Failed to create payment checkout session: Stripe error: Invalid API Key
❌ Traceback: ...
```

**Database Verification:**
```sql
-- This should return NO rows
SELECT * FROM users WHERE email = 'test@example.com';
```

---

### Scenario 3: Correct Stripe Credentials Configured
**Expected Behavior:**
- User selects Pro plan
- User authenticates with Google
- System detects Pro plan requires payment
- System checks for Stripe credentials → **FOUND and VALID**
- System creates Stripe checkout session successfully
- User is redirected to Stripe payment page
- User completes payment
- Stripe webhook receives payment confirmation
- User account is created with Pro plan features
- Welcome email is sent
- User is redirected to dashboard

**Test Steps:**
1. Set valid Stripe credentials in `.env`:
   ```bash
   STRIPE_SECRET_KEY=sk_test_... (valid test key)
   STRIPE_WEBHOOK_SECRET=whsec_... (valid webhook secret)
   STRIPE_PRICE_ID_PRO=price_... (valid Pro plan price ID)
   APP_URL=http://localhost:5173
   ```
2. Restart backend server
3. Go to registration page
4. Select **Pro plan**
5. Click "Sign in with Google"
6. Authenticate with Google
7. Verify redirect to Stripe checkout page
8. Complete payment with test card: `4242 4242 4242 4242`
9. Verify user account is created
10. Verify welcome email is sent
11. Verify user is redirected to dashboard

**Backend Logs to Check:**
```
🔍 Checking payment requirements - action: register, selected_plan_code: pro, user_type: business_owner
🔍 ✅ Pro plan registration detected - requires payment before account creation
🔍 Final payment requirement check: requires_payment=True
🔍 Redirecting Pro plan OAuth registration to payment checkout
✅ Payment checkout session created, redirecting to: https://checkout.stripe.com/...
📥 Received Stripe webhook: checkout.session.completed
✅ Invoice is paid, creating user account for test@example.com
✅ Successfully created user account for test@example.com
📧 Attempting to send welcome email to test@example.com
✅ Welcome email sent successfully to test@example.com
```

**Database Verification:**
```sql
-- This should return the user
SELECT id, email, user_type, trial_status FROM users WHERE email = 'test@example.com';

-- This should return the subscription
SELECT * FROM subscriptions WHERE user_id = (SELECT id FROM users WHERE email = 'test@example.com');
```

---

## Test Script

Use the following script to quickly test all scenarios:

```bash
#!/bin/bash
# test_stripe_scenarios.sh

echo "=== Testing Stripe Configuration Scenarios ==="
echo ""

# Scenario 1: No Stripe credentials
echo "SCENARIO 1: No Stripe Credentials"
echo "1. Remove or comment out STRIPE_SECRET_KEY in .env"
echo "2. Restart backend server"
echo "3. Test Pro plan registration"
echo "4. Verify error message and no user creation"
echo ""
read -p "Press Enter when ready to test Scenario 2..."

# Scenario 2: Invalid Stripe credentials
echo "SCENARIO 2: Invalid Stripe Credentials"
echo "1. Set STRIPE_SECRET_KEY=sk_test_invalid_key_12345 in .env"
echo "2. Restart backend server"
echo "3. Test Pro plan registration"
echo "4. Verify error message and no user creation"
echo ""
read -p "Press Enter when ready to test Scenario 3..."

# Scenario 3: Valid Stripe credentials
echo "SCENARIO 3: Valid Stripe Credentials"
echo "1. Set valid Stripe credentials in .env"
echo "2. Restart backend server"
echo "3. Test Pro plan registration"
echo "4. Verify Stripe redirect and successful payment"
echo ""
echo "Testing complete!"
```

---

## Environment Variable Configuration

### Scenario 1: No Credentials
```bash
# Comment out or remove these lines:
# STRIPE_SECRET_KEY=
# STRIPE_WEBHOOK_SECRET=
# STRIPE_PRICE_ID_PRO=
```

### Scenario 2: Invalid Credentials
```bash
STRIPE_SECRET_KEY=sk_test_invalid_key_12345
STRIPE_WEBHOOK_SECRET=whsec_invalid_secret
STRIPE_PRICE_ID_PRO=price_invalid
APP_URL=http://localhost:5173
```

### Scenario 3: Valid Credentials
```bash
STRIPE_SECRET_KEY=sk_test_51... (your actual test key)
STRIPE_WEBHOOK_SECRET=whsec_... (your actual webhook secret)
STRIPE_PRICE_ID_PRO=price_... (your actual Pro plan price ID)
APP_URL=http://localhost:5173
```

---

## Expected Error Messages

### Scenario 1 (No Credentials)
**Frontend:** "Payment system is not configured. Pro plan registration requires payment setup. Please contact support."

**Backend Log:**
```
❌ Payment system is not configured. Pro plan registration requires payment setup. Please contact support.
```

### Scenario 2 (Invalid Credentials)
**Frontend:** "Payment setup failed. Please try again or contact support."

**Backend Log:**
```
❌ Failed to create payment checkout session: Stripe error: Invalid API Key provided
❌ Traceback: ...
```

### Scenario 3 (Valid Credentials)
**Frontend:** Redirects to Stripe checkout page

**Backend Log:**
```
✅ Payment checkout session created, redirecting to: https://checkout.stripe.com/...
```

---

## Verification Checklist

### For Each Scenario:

- [ ] Backend logs show correct behavior
- [ ] No user account created in scenarios 1 and 2
- [ ] User account created only in scenario 3 (after payment)
- [ ] Error messages are user-friendly
- [ ] No sensitive information exposed in errors
- [ ] Database remains clean (no orphaned records)

---

## Troubleshooting

### If Scenario 1 doesn't work:
- Check that `STRIPE_SECRET_KEY` is actually not set or is empty
- Check backend logs for the early check
- Verify the code path is being executed

### If Scenario 2 doesn't work:
- Verify Stripe API key format (should start with `sk_test_` or `sk_live_`)
- Check that Stripe service is raising the correct exception
- Verify exception is being caught and handled

### If Scenario 3 doesn't work:
- Verify Stripe credentials are correct
- Check Stripe dashboard for test mode
- Verify webhook is configured correctly
- Check that price ID matches your Stripe product

---

**Last Updated:** November 13, 2025
**Status:** Ready for Testing

