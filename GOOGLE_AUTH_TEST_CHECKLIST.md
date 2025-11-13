# Google Auth Registration Flow - Test Checklist

## Pre-Testing Setup

- [ ] Ensure Google OAuth credentials are configured in `.env`
- [ ] Ensure Stripe/Strike payment credentials are configured
- [ ] Ensure email service (Brevo/Gmail) is configured
- [ ] Database is running and migrations are applied
- [ ] Backend server is running
- [ ] Frontend server is running

## Test Case 1: Existing User Tries to Register

**Steps:**
1. Create a test user with email `test@example.com` (or use existing user)
2. Go to registration page
3. Select either Pro or Basic plan
4. Click "Sign in with Google"
5. Authenticate with Google using `test@example.com`

**Expected Results:**
- [ ] Error message displayed: "An account with email test@example.com already exists. Please use the login option to access your account."
- [ ] User is redirected to login page
- [ ] Email field is pre-filled with `test@example.com`
- [ ] No new user account is created in database
- [ ] No welcome email is sent

**Backend Logs to Check:**
```
🔍 User existence check - email: test@example.com, exists: true
❌ An account with email test@example.com already exists...
```

---

## Test Case 2: New User Registers with Pro Plan (Successful Payment)

**Steps:**
1. Use a new email that doesn't exist in database (e.g., `newuser@example.com`)
2. Go to registration page
3. Select **Pro plan**
4. Click "Sign in with Google"
5. Authenticate with Google using `newuser@example.com`
6. Complete Stripe payment with test card: `4242 4242 4242 4242`

**Expected Results:**
- [ ] User is redirected to Stripe payment page
- [ ] Payment completes successfully
- [ ] User account is created in database with Pro plan features
- [ ] Welcome email is sent to `newuser@example.com`
- [ ] User is redirected to dashboard
- [ ] User can access Pro plan features

**Backend Logs to Check:**
```
🔍 User existence check - email: newuser@example.com, exists: false
🔍 Pro plan registration detected - requires payment before account creation
✅ Payment checkout session created, redirecting to: https://checkout.stripe.com/...
📥 Received Stripe webhook: checkout.session.completed
✅ Invoice is paid, creating user account for newuser@example.com
✅ Successfully created user account for newuser@example.com
📧 Attempting to send welcome email to newuser@example.com
✅ Welcome email sent successfully to newuser@example.com
```

**Database Checks:**
- [ ] User exists in `users` table with `oauth_provider='google'`
- [ ] User has `user_type='business_owner'`
- [ ] Subscription exists in `billing_subscriptions` table
- [ ] Subscription status is `active`
- [ ] Plan features are enabled for user

---

## Test Case 3: New User Registers with Pro Plan (Payment Fails)

**Steps:**
1. Use a new email that doesn't exist in database (e.g., `failedpayment@example.com`)
2. Go to registration page
3. Select **Pro plan**
4. Click "Sign in with Google"
5. Authenticate with Google using `failedpayment@example.com`
6. Use Stripe test card that fails: `4000 0000 0000 0002`
   OR cancel the payment

**Expected Results:**
- [ ] User is redirected to Stripe payment page
- [ ] Payment fails or is cancelled
- [ ] Error message is displayed
- [ ] **NO user account is created in database**
- [ ] **NO welcome email is sent**
- [ ] User can retry registration

**Backend Logs to Check:**
```
🔍 User existence check - email: failedpayment@example.com, exists: false
🔍 Pro plan registration detected - requires payment before account creation
✅ Payment checkout session created, redirecting to: https://checkout.stripe.com/...
📥 Received Stripe webhook: invoice.payment_failed
⚠️ Invoice not paid yet for subscription sub_xxx, waiting for invoice.payment_succeeded
```

**Database Checks:**
- [ ] User does NOT exist in `users` table
- [ ] No subscription created
- [ ] No email sent

---

## Test Case 4: New User Registers with Basic Plan

**Steps:**
1. Use a new email that doesn't exist in database (e.g., `basicuser@example.com`)
2. Go to registration page
3. Select **Basic plan**
4. Click "Sign in with Google"
5. Authenticate with Google using `basicuser@example.com`

**Expected Results:**
- [ ] User is NOT redirected to payment page
- [ ] User account is created immediately
- [ ] Trial period is activated (14 days by default)
- [ ] Welcome email is sent to `basicuser@example.com`
- [ ] User is redirected to dashboard
- [ ] User can access Basic plan features

**Backend Logs to Check:**
```
🔍 User existence check - email: basicuser@example.com, exists: false
🔍 Checking payment requirements - action: register, selected_plan_code: basic, user_type: business_owner
🔍 Payment required: false
✅ User tokens issued - email: basicuser@example.com, is_new_user: true
📧 Attempting to send welcome email to basicuser@example.com
✅ Welcome email sent successfully to basicuser@example.com
```

**Database Checks:**
- [ ] User exists in `users` table with `oauth_provider='google'`
- [ ] User has `trial_status='active'`
- [ ] User has `trial_start` and `trial_end` dates set
- [ ] Trial period is approximately 14 days (or configured trial_days)

---

## Test Case 5: Existing User Logs In

**Steps:**
1. Use an existing user email (e.g., `existinguser@example.com`)
2. Go to **login page** (not registration)
3. Click "Sign in with Google"
4. Authenticate with Google using `existinguser@example.com`

**Expected Results:**
- [ ] User is logged in successfully
- [ ] User is redirected to appropriate dashboard
- [ ] No new user account is created
- [ ] No welcome email is sent

**Backend Logs to Check:**
```
🔍 User existence check - email: existinguser@example.com, exists: true
✅ User exists for login - email: existinguser@example.com
✅ User tokens issued - email: existinguser@example.com, is_new_user: false
```

---

## Test Case 6: Payment Setup Fails (Network Error)

**Steps:**
1. Temporarily disable Stripe API key or use invalid key
2. Use a new email that doesn't exist in database
3. Select **Pro plan**
4. Click "Sign in with Google"
5. Authenticate with Google

**Expected Results:**
- [ ] Error message displayed: "Payment setup failed. Please try again or contact support."
- [ ] User is redirected to registration page with error parameter
- [ ] **NO user account is created** (not even with Basic plan)
- [ ] User can retry registration

**Backend Logs to Check:**
```
🔍 User existence check - email: test@example.com, exists: false
🔍 Redirecting Pro plan OAuth registration to payment checkout
❌ Failed to create payment checkout session: ...
```

**Database Checks:**
- [ ] User does NOT exist in `users` table
- [ ] No subscription created
- [ ] No trial activated
- [ ] **CRITICAL: User is NOT created with Basic plan as fallback**

---

## Test Case 7: Safety Check - Pro Plan Bypasses Payment (Bug Scenario)

**Purpose:** Verify the safety check prevents user creation if payment is somehow bypassed

**Steps:**
1. This test simulates a bug where Pro plan registration reaches user creation without payment
2. The safety check in `_issue_tokens_for_user` should prevent this

**Expected Results:**
- [ ] Error message: "Pro plan registration requires payment. Please complete the payment process first."
- [ ] **NO user account is created**
- [ ] User is NOT created with Basic plan as fallback

**Backend Logs to Check:**
```
❌ CRITICAL ERROR: _issue_tokens_for_user called with Pro plan for test@example.com
❌ Pro plan users must go through payment first. This is a bug in the OAuth flow.
```

**Note:** This test verifies the safety mechanism works. In normal operation, this code path should never be reached.

---

## Email Verification

For all test cases where welcome email should be sent:

- [ ] Check email inbox for welcome email
- [ ] Verify email contains correct user name
- [ ] Verify email contains correct plan information (if applicable)
- [ ] Verify email has correct language (default: English)
- [ ] Verify email has proper branding and formatting

---

## Database Verification Queries

### Check if user exists
```sql
SELECT id, email, oauth_provider, oauth_id, user_type, trial_status, trial_start, trial_end
FROM users
WHERE email = 'test@example.com';
```

### Check user subscription
```sql
SELECT bs.*, bc.stripe_customer_id
FROM billing_subscriptions bs
JOIN billing_customers bc ON bc.user_id = bs.user_id
WHERE bs.user_id = (SELECT id FROM users WHERE email = 'test@example.com');
```

### Check user plan features
```sql
SELECT ups.*, p.name as plan_name, p.code as plan_code
FROM user_place_subscriptions ups
JOIN plans p ON p.id = ups.plan_id
WHERE ups.user_id = (SELECT id FROM users WHERE email = 'test@example.com');
```

---

## Cleanup After Testing

- [ ] Delete test users from database
- [ ] Cancel test subscriptions in Stripe dashboard
- [ ] Clear test data from `billing_subscriptions` table
- [ ] Clear test data from `billing_customers` table
- [ ] Clear test data from `user_place_subscriptions` table

---

## Notes

- Use Stripe test mode for all payment testing
- Use Stripe test cards: https://stripe.com/docs/testing
- Check backend logs for detailed debugging information
- Monitor webhook events in Stripe dashboard
- Verify email delivery in Brevo/Gmail dashboard

---

**Test Status:** ⬜ Not Started | 🔄 In Progress | ✅ Passed | ❌ Failed

