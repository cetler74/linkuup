-- Simple SQL script to delete user cetler74@gmail.com
-- Run this with: psql -U <your_db_user> -d linkuup_db -f scripts/delete_user_simple.sql
-- Or connect to psql and paste these commands

BEGIN;

-- Find and delete user cetler74@gmail.com and all related records
-- The CASCADE will handle most foreign key relationships

-- Delete campaign recipients first (via campaigns)
DELETE FROM campaign_recipients
WHERE campaign_id IN (
    SELECT id FROM campaigns WHERE created_by = (SELECT id FROM users WHERE email = 'cetler74@gmail.com')
);

-- Delete campaigns
DELETE FROM campaigns WHERE created_by = (SELECT id FROM users WHERE email = 'cetler74@gmail.com');

-- Delete notifications (has CASCADE but being explicit)
DELETE FROM notifications WHERE owner_id = (SELECT id FROM users WHERE email = 'cetler74@gmail.com');

-- Delete bookings
DELETE FROM bookings WHERE user_id = (SELECT id FROM users WHERE email = 'cetler74@gmail.com');

-- Delete user place subscriptions
DELETE FROM user_place_subscriptions WHERE user_id = (SELECT id FROM users WHERE email = 'cetler74@gmail.com');

-- Delete subscriptions (table name is 'subscriptions', not 'billing_subscriptions')
DELETE FROM subscriptions WHERE user_id = (SELECT id FROM users WHERE email = 'cetler74@gmail.com');

-- Delete invoices (table name is 'invoices', not 'billing_invoices')
DELETE FROM invoices WHERE user_id = (SELECT id FROM users WHERE email = 'cetler74@gmail.com');

-- Delete billing customers
DELETE FROM billing_customers WHERE user_id = (SELECT id FROM users WHERE email = 'cetler74@gmail.com');

-- Finally, delete the user
DELETE FROM users WHERE email = 'cetler74@gmail.com';

COMMIT;

-- Verify deletion
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM users WHERE email = 'cetler74@gmail.com') 
        THEN 'ERROR: User still exists!' 
        ELSE 'SUCCESS: User cetler74@gmail.com has been deleted' 
    END as deletion_status;

