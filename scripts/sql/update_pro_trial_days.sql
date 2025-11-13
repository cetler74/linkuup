-- Update Pro plan to have trial_days=0 (requires payment)
-- This ensures Pro plan always requires payment during registration

UPDATE plans 
SET trial_days = 0 
WHERE code = 'pro';

-- Verify the update
SELECT id, code, name, trial_days, is_active 
FROM plans 
WHERE code = 'pro';

