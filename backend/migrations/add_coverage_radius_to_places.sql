-- Add coverage_radius column to places table
-- This column stores the coverage radius in kilometers for mobile/service area places

ALTER TABLE places 
ADD COLUMN coverage_radius FLOAT DEFAULT 10.0;

-- Add comment to the column
COMMENT ON COLUMN places.coverage_radius IS 'Coverage radius in kilometers for mobile places (default: 10.0 km)';

-- Update existing mobile places to have a default coverage radius
UPDATE places 
SET coverage_radius = 10.0 
WHERE coverage_radius IS NULL;
