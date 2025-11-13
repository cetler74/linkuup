# Google Auth Registration Flow - Implementation Summary

## Overview
This document describes the corrected Google Authentication registration flow that ensures proper user validation, payment processing, and account creation.

## Flow Description

### 1. User Exists Check (FIRST STEP)
When a user attempts to register with Google Auth, the system **ALWAYS** checks if the user already exists in the database before any other processing.

**Implementation Location:** `/opt/linkuup/backend/api/v1/auth.py` - `google_oauth_callback` function (lines 963-1010)

**Behavior:**
- ✅ **If user exists during registration**: Returns error message "An account with email {email} already exists. Please use the login option to access your account."
- ✅ **Redirects to login page** with error parameter and pre-fills email
- ✅ **If user doesn't exist during login**: Returns error message "No account found with email {email}. Please register first."

### 2. Pro Plan Registration Flow

**When:** User selects Pro plan and authenticates with Google

**Process:**
1. User existence check (must NOT exist)
2. Redirect to Stripe/Strike payment checkout
3. User completes payment
4. Webhook receives payment confirmation
5. **ONLY AFTER SUCCESSFUL PAYMENT**: User account is created
6. Welcome email is sent
7. User is redirected to dashboard

**Key Points:**
- ❌ **User is NOT created if payment fails**
- ✅ **User is created with Pro plan features ONLY after payment succeeds**
- ✅ **Welcome email is sent after account creation**

**Implementation Locations:**
- Payment redirect: `/opt/linkuup/backend/api/v1/auth.py` (lines 1045-1093)
- Webhook handler: `/opt/linkuup/backend/api/v1/stripe_webhook.py` (lines 136-214)
- User creation: `/opt/linkuup/backend/api/v1/stripe_webhook.py` (lines 321-427)

### 3. Basic Plan Registration Flow

**When:** User selects Basic plan and authenticates with Google

**Process:**
1. User existence check (must NOT exist)
2. User account is created immediately with trial/basic features
3. Trial period is activated (default 14 days or configured trial_days)
4. Welcome email is sent
5. User is redirected to dashboard

**Key Points:**
- ✅ **No payment required for Basic plan**
- ✅ **User gets trial period automatically**
- ✅ **Welcome email is sent immediately**

**Implementation Location:** `/opt/linkuup/backend/api/v1/auth.py` - `_issue_tokens_for_user` function (lines 418-666)

## Payment Failure Handling

### Multiple Layers of Protection

The system has **multiple safety mechanisms** to ensure users are NEVER created without payment for Pro plan:

#### Layer 1: OAuth Callback Check
- If Pro plan is selected, user is redirected to payment BEFORE any account creation
- If payment setup fails, error is shown and flow stops immediately
- Code returns early, never reaching user creation logic

#### Layer 2: Safety Check in `_issue_tokens_for_user`
- Additional validation prevents creating users with Pro plan
- Checks if `selected_plan_code == "pro"` or if plan has `trial_days == 0`
- Raises error if called incorrectly: "Pro plan registration requires payment"
- This catches any bugs in the OAuth flow

#### Layer 3: Webhook Validation
- User accounts only created after payment confirmation via webhook
- Webhook verifies payment status before creating account

### Stripe Webhook Events

The system handles the following webhook events:

1. **`checkout.session.completed`**
   - Checks if payment_status is "paid"
   - Verifies invoice is paid
   - **ONLY creates user if payment is confirmed**

2. **`invoice.payment_succeeded`**
   - Creates user account after payment succeeds
   - Sends welcome email
   - Activates Pro plan features

3. **`invoice.payment_failed`**
   - Updates invoice record
   - **Does NOT create user account**
   - User must retry payment

### Error Messages

If payment setup fails:
- User sees: "Payment setup failed. Please try again or contact support."
- User is redirected to registration page with error parameter
- **No account is created**

If somehow `_issue_tokens_for_user` is called with Pro plan (bug):
- Error: "Pro plan registration requires payment. Please complete the payment process first."
- **No account is created**

## Welcome Email

Welcome emails are sent in the following scenarios:

1. **Pro Plan (after successful payment)**
   - Location: `/opt/linkuup/backend/api/v1/stripe_webhook.py` (lines 393-427)
   - Includes plan name and subscription details

2. **Basic Plan (immediately after account creation)**
   - Location: `/opt/linkuup/backend/api/v1/auth.py` (lines 629-662)
   - Includes trial information

**Email Service:** Uses Brevo (primary) with Gmail fallback
- Implementation: `/opt/linkuup/backend/email_service.py`
- Brevo service: `/opt/linkuup/backend/brevo_email_service.py`

## Frontend Changes

### Login Form Enhancement
**File:** `/opt/linkuup/frontend/src/components/auth/LoginForm.tsx`

**Changes:**
- Handles `user_exists` error parameter from OAuth callback
- Pre-fills email field when user already exists
- Shows user-friendly error message

**Example:**
```
An account with email user@example.com already exists. Please login to access your account.
```

## Testing Scenarios

### Scenario 1: Existing User Tries to Register
1. User selects Pro or Basic plan
2. User clicks "Sign in with Google"
3. Google authentication completes
4. System checks if user exists → **User EXISTS**
5. ✅ Error message shown: "An account with email {email} already exists..."
6. ✅ User redirected to login page
7. ✅ Email field pre-filled
8. ❌ No account created

### Scenario 2: New User Registers with Pro Plan
1. User selects Pro plan
2. User clicks "Sign in with Google"
3. Google authentication completes
4. System checks if user exists → **User DOES NOT EXIST**
5. ✅ User redirected to Stripe payment
6. User completes payment successfully
7. ✅ Webhook receives payment confirmation
8. ✅ User account created with Pro features
9. ✅ Welcome email sent
10. ✅ User redirected to dashboard

### Scenario 3: New User Registers with Pro Plan (Payment Fails)
1. User selects Pro plan
2. User clicks "Sign in with Google"
3. Google authentication completes
4. System checks if user exists → **User DOES NOT EXIST**
5. ✅ User redirected to Stripe payment
6. Payment fails or user cancels
7. ✅ Webhook receives payment failure
8. ❌ User account NOT created
9. ❌ No welcome email sent
10. ✅ User sees error message

### Scenario 4: New User Registers with Basic Plan
1. User selects Basic plan
2. User clicks "Sign in with Google"
3. Google authentication completes
4. System checks if user exists → **User DOES NOT EXIST**
5. ✅ User account created immediately
6. ✅ Trial period activated (14 days)
7. ✅ Welcome email sent
8. ✅ User redirected to dashboard

### Scenario 5: Existing User Tries to Login
1. User clicks "Sign in with Google" from login page
2. Google authentication completes
3. System checks if user exists → **User EXISTS**
4. ✅ User logged in successfully
5. ✅ User redirected to dashboard

## Database Tables Affected

### Users Table
- Fields: `email`, `oauth_provider`, `oauth_id`, `user_type`, `trial_start`, `trial_end`, `trial_status`

### Billing Tables
- `billing_customers` - Stripe customer records
- `billing_subscriptions` - Subscription records
- `billing_invoices` - Invoice records

### Subscription Tables
- `plans` - Available subscription plans
- `user_place_subscriptions` - User subscriptions per place

## Configuration

### Environment Variables Required
```bash
# Google OAuth
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret

# Stripe/Strike Payment
STRIPE_SECRET_KEY=your_stripe_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret
STRIPE_PRICE_ID_BASIC=price_xxx
STRIPE_PRICE_ID_PRO=price_xxx

# Email Service
BREVO_API_KEY=your_brevo_key
GMAIL_USER=your_gmail
GMAIL_PASSWORD=your_app_password

# App URL
APP_URL=https://yourdomain.com
```

## Security Considerations

1. **User Existence Check**: Always performed BEFORE any payment processing
2. **Payment Verification**: User accounts only created after confirmed payment
3. **OAuth Token Validation**: Google tokens validated before processing
4. **Webhook Signature Verification**: Stripe webhooks verified with signature
5. **GDPR Consent**: OAuth users have implied data processing consent

## Error Handling

### Backend Errors
- All errors logged with detailed context
- User-friendly error messages returned to frontend
- No sensitive information exposed in error messages

### Frontend Errors
- Error messages displayed in user-friendly format
- Email pre-filled when applicable
- Clear call-to-action for next steps

## Notes

- The system currently uses **Stripe** for payment processing
- To use **Strike** instead, a Strike service would need to be implemented
- Welcome emails are sent asynchronously and don't block the registration flow
- Trial periods are configurable per plan in the database

## Files Modified

1. `/opt/linkuup/backend/api/v1/auth.py` - Main OAuth flow and user existence check
2. `/opt/linkuup/frontend/src/components/auth/LoginForm.tsx` - Error handling enhancement

## Files Referenced (No Changes Needed)

1. `/opt/linkuup/backend/api/v1/stripe_webhook.py` - Payment webhook handling (already correct)
2. `/opt/linkuup/backend/services/stripe_service.py` - Stripe integration (already correct)
3. `/opt/linkuup/backend/email_service.py` - Email sending (already correct)
4. `/opt/linkuup/backend/brevo_email_service.py` - Brevo email service (already correct)

---

**Last Updated:** November 13, 2025
**Status:** ✅ Implemented and Ready for Testing

