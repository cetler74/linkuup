-- Assign all existing salons to info.biosculptureportugal@gmail.com
-- Created: 2025-10-14
-- Purpose: Set owner_id for all salons

BEGIN;

-- First, verify the user exists
DO $$
DECLARE
    v_user_id INTEGER;
BEGIN
    SELECT id INTO v_user_id 
    FROM users 
    WHERE email = 'info.biosculptureportugal@gmail.com';
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User info.biosculptureportugal@gmail.com not found';
    END IF;
    
    RAISE NOTICE 'Found user with ID: %', v_user_id;
END $$;

-- Show current state
SELECT 
    COUNT(*) as total_salons,
    COUNT(owner_id) as salons_with_owner,
    COUNT(*) - COUNT(owner_id) as salons_without_owner
FROM salons;

-- Update all salons to belong to info.biosculptureportugal@gmail.com (user_id = 2)
UPDATE salons
SET owner_id = (SELECT id FROM users WHERE email = 'info.biosculptureportugal@gmail.com')
WHERE owner_id IS NULL OR owner_id != (SELECT id FROM users WHERE email = 'info.biosculptureportugal@gmail.com');

-- Show results
SELECT 
    COUNT(*) as total_salons,
    COUNT(owner_id) as salons_with_owner,
    owner_id,
    (SELECT email FROM users WHERE id = salons.owner_id LIMIT 1) as owner_email
FROM salons
GROUP BY owner_id;

COMMIT;

-- Final verification
SELECT 
    s.id as salon_id,
    s.nome as salon_name,
    s.cidade as city,
    s.owner_id,
    u.email as owner_email
FROM salons s
LEFT JOIN users u ON s.owner_id = u.id
ORDER BY s.id
LIMIT 10;

