# Quick Test Guide - Stripe Configuration Scenarios

## Quick Start

Run the test script to check your current configuration:

```bash
cd /opt/linkuup
python3 scripts/test_stripe_config.py
```

This will show you:
- Current Stripe configuration state
- Which scenario you're testing
- Expected behavior
- Next steps

---

## Scenario 1: No Stripe Credentials

### Setup
```bash
# Edit .env file - comment out or remove:
# STRIPE_SECRET_KEY=
# STRIPE_WEBHOOK_SECRET=
# STRIPE_PRICE_ID_PRO=
```

### Test
1. Restart backend: `cd backend && uvicorn main:app --reload`
2. Go to registration page
3. Select **Pro plan**
4. Click "Sign in with Google"
5. Authenticate

### Expected Result
- ❌ Error message: "Payment system is not configured..."
- ❌ **NO user account created**
- ✅ Redirected to registration page with error

### Verify
```sql
-- Should return 0 rows
SELECT * FROM users WHERE email = 'your_test_email@example.com';
```

---

## Scenario 2: Invalid Stripe Credentials

### Setup
```bash
# Edit .env file - set invalid credentials:
STRIPE_SECRET_KEY=sk_test_invalid_key_12345
STRIPE_WEBHOOK_SECRET=whsec_invalid
STRIPE_PRICE_ID_PRO=price_invalid
APP_URL=http://localhost:5173
```

### Test
1. Restart backend
2. Go to registration page
3. Select **Pro plan**
4. Click "Sign in with Google"
5. Authenticate

### Expected Result
- ❌ Error message: "Payment setup failed..."
- ❌ **NO user account created**
- ✅ Redirected to registration page with error

### Verify
```sql
-- Should return 0 rows
SELECT * FROM users WHERE email = 'your_test_email@example.com';
```

### Backend Logs Should Show:
```
❌ Failed to create payment checkout session: Stripe error: Invalid API Key
```

---

## Scenario 3: Valid Stripe Credentials

### Setup
```bash
# Edit .env file - set valid credentials:
STRIPE_SECRET_KEY=sk_test_51... (your actual test key)
STRIPE_WEBHOOK_SECRET=whsec_... (your actual webhook secret)
STRIPE_PRICE_ID_PRO=price_... (your actual Pro plan price ID)
APP_URL=http://localhost:5173
```

### Test
1. Restart backend
2. Go to registration page
3. Select **Pro plan**
4. Click "Sign in with Google"
5. Authenticate
6. **Should redirect to Stripe checkout**
7. Use test card: `4242 4242 4242 4242`
8. Complete payment

### Expected Result
- ✅ Redirected to Stripe checkout page
- ✅ Payment completes successfully
- ✅ User account created with Pro plan
- ✅ Welcome email sent
- ✅ Redirected to dashboard

### Verify
```sql
-- Should return the user
SELECT id, email, user_type, trial_status 
FROM users 
WHERE email = 'your_test_email@example.com';

-- Should return the subscription
SELECT * 
FROM subscriptions 
WHERE user_id = (SELECT id FROM users WHERE email = 'your_test_email@example.com');
```

---

## Backend Log Monitoring

Watch logs in real-time:

```bash
# If using uvicorn with --reload
# Logs will appear in terminal

# Or check log file if configured
tail -f /path/to/logs/app.log | grep -E "Pro plan|payment|Stripe|requires_payment"
```

### Key Log Messages to Look For:

**Scenario 1:**
```
🔍 ✅ Pro plan registration detected - requires payment before account creation
🔍 Final payment requirement check: requires_payment=True
❌ Payment system is not configured. Pro plan registration requires payment setup.
```

**Scenario 2:**
```
🔍 ✅ Pro plan registration detected - requires payment before account creation
🔍 Redirecting Pro plan OAuth registration to payment checkout
❌ Failed to create payment checkout session: Stripe error: ...
```

**Scenario 3:**
```
🔍 ✅ Pro plan registration detected - requires payment before account creation
🔍 Redirecting Pro plan OAuth registration to payment checkout
✅ Payment checkout session created, redirecting to: https://checkout.stripe.com/...
```

---

## Troubleshooting

### Issue: User still being created as Basic plan

**Check:**
1. Is `selected_plan_code` being passed correctly?
   - Check logs: `🔍 selected_plan_code type: <class 'str'>, value: 'pro'`
2. Is `requires_payment` being set to True?
   - Check logs: `🔍 Final payment requirement check: requires_payment=True`
3. Is the safety check in `_issue_tokens_for_user` working?
   - Check logs for: `❌ CRITICAL ERROR: _issue_tokens_for_user called with Pro plan`

**Solution:**
- Review backend logs carefully
- Ensure all code changes are deployed
- Restart backend server after changes

### Issue: Error message not showing

**Check:**
1. Is frontend handling the error parameter?
2. Check browser console for errors
3. Check network tab for API responses

**Solution:**
- Verify frontend error handling in `LoginForm.tsx`
- Check that error redirects are working

### Issue: Stripe checkout not redirecting

**Check:**
1. Are Stripe credentials valid?
2. Is `APP_URL` set correctly?
3. Is `STRIPE_PRICE_ID_PRO` correct?

**Solution:**
- Run `python3 scripts/test_stripe_config.py`
- Verify credentials in Stripe dashboard
- Check that price ID matches your Stripe product

---

## Test Checklist

### Before Testing:
- [ ] Backend server is running
- [ ] Database is accessible
- [ ] Frontend is running
- [ ] Test email account ready

### For Each Scenario:
- [ ] Configuration is set correctly
- [ ] Backend server restarted
- [ ] Test performed end-to-end
- [ ] Backend logs reviewed
- [ ] Database verified (no user created for scenarios 1 & 2)
- [ ] Error messages are clear and user-friendly

### After Testing:
- [ ] Clean up test users from database
- [ ] Reset configuration if needed
- [ ] Document any issues found

---

## Quick Commands Reference

```bash
# Check configuration
python3 scripts/test_stripe_config.py

# Check database for test user
psql linkuup_db -c "SELECT id, email, user_type FROM users WHERE email = 'test@example.com';"

# Delete test user (if created)
psql linkuup_db -f scripts/delete_user_simple.sql
# (Edit the email in the SQL file first)

# View recent backend logs
tail -n 100 /path/to/logs/app.log | grep -i "pro plan\|payment\|stripe"
```

---

**For detailed information, see:** `TEST_STRIPE_CONFIGURATION_SCENARIOS.md`

