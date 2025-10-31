-- Add working_hours field to places table
-- This script adds a JSON column to store working hours for each place

ALTER TABLE places 
ADD COLUMN IF NOT EXISTS working_hours JSON;

-- Add a comment to document the column
COMMENT ON COLUMN places.working_hours IS 'JSON object storing working hours for each day of the week';

-- Note: JSON column added successfully. Index can be added later if needed for performance.
