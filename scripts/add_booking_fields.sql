-- Migration script to add missing fields to bookings table
-- Created: 2025-01-29
-- Purpose: Add color_code, is_recurring, recurrence_pattern, recurrence_end_date columns

BEGIN;

-- Add color_code column
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS color_code VARCHAR(7);

-- Add is_recurring column
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE;

-- Add recurrence_pattern column (JSON)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS recurrence_pattern JSON;

-- Add recurrence_end_date column
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS recurrence_end_date TIMESTAMP WITHOUT TIME ZONE;

-- Update existing records to have default values
UPDATE bookings 
SET is_recurring = FALSE 
WHERE is_recurring IS NULL;

COMMIT;

-- Display the updated table structure
\d bookings
