-- Fix missing created_at timestamps in salons table
-- Created: 2025-10-14

BEGIN;

-- Show salons with null created_at
SELECT COUNT(*) as salons_with_null_created_at 
FROM salons 
WHERE created_at IS NULL;

-- Update salons with null created_at to current timestamp
UPDATE salons 
SET created_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
WHERE created_at IS NULL;

-- Show results
SELECT COUNT(*) as salons_with_null_created_at 
FROM salons 
WHERE created_at IS NULL;

COMMIT;

-- Verify all salons now have created_at
SELECT id, nome, created_at, updated_at 
FROM salons 
ORDER BY id;

