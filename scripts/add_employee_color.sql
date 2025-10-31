-- Migration script to add color_code field to place_employees table
-- Created: 2025-01-29
-- Purpose: Add color_code column for employee color assignment

BEGIN;

-- Add color_code column to place_employees table
ALTER TABLE place_employees ADD COLUMN IF NOT EXISTS color_code VARCHAR(7);

COMMIT;

-- Display the updated table structure
\d place_employees
