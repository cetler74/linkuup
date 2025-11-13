-- Script to delete user cetler74@gmail.com and all related records
-- Usage: psql linkuup_db -f scripts/delete_user.sql

BEGIN;

-- First, find the user ID
DO $$
DECLARE
    target_user_id INTEGER;
    target_email TEXT := 'cetler74@gmail.com';
BEGIN
    -- Get user ID
    SELECT id INTO target_user_id FROM users WHERE email = target_email;
    
    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email % not found', target_email;
    END IF;
    
    RAISE NOTICE 'Found user ID: % for email: %', target_user_id, target_email;
    
    -- Delete related records in correct order
    
    -- 1. Delete campaign recipients (via campaigns)
    DELETE FROM campaign_recipients
    WHERE campaign_id IN (
        SELECT id FROM campaigns WHERE created_by = target_user_id
    );
    RAISE NOTICE 'Deleted campaign recipients';
    
    -- 2. Delete campaigns
    DELETE FROM campaigns WHERE created_by = target_user_id;
    RAISE NOTICE 'Deleted campaigns';
    
    -- 3. Delete notifications (has CASCADE, but being explicit)
    DELETE FROM notifications WHERE owner_id = target_user_id;
    RAISE NOTICE 'Deleted notifications';
    
    -- 4. Delete bookings
    DELETE FROM bookings WHERE user_id = target_user_id;
    RAISE NOTICE 'Deleted bookings';
    
    -- 5. Delete user place subscriptions
    DELETE FROM user_place_subscriptions WHERE user_id = target_user_id;
    RAISE NOTICE 'Deleted user place subscriptions';
    
    -- 6. Delete subscriptions (table name is 'subscriptions')
    DELETE FROM subscriptions WHERE user_id = target_user_id;
    RAISE NOTICE 'Deleted subscriptions';
    
    -- 7. Delete invoices (table name is 'invoices')
    DELETE FROM invoices WHERE user_id = target_user_id;
    RAISE NOTICE 'Deleted invoices';
    
    -- 8. Delete billing customers
    DELETE FROM billing_customers WHERE user_id = target_user_id;
    RAISE NOTICE 'Deleted billing customers';
    
    -- 9. Delete the user
    DELETE FROM users WHERE id = target_user_id;
    RAISE NOTICE 'Deleted user';
    
    RAISE NOTICE 'Successfully deleted user % and all related records', target_email;
END $$;

COMMIT;

-- Verify deletion
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM users WHERE email = 'cetler74@gmail.com') 
        THEN 'User still exists!' 
        ELSE 'User successfully deleted' 
    END as deletion_status;

