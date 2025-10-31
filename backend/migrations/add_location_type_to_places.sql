-- Add location_type column to places table
-- Values: 'fixed' or 'mobile' (store as text with check constraint)

ALTER TABLE places 
ADD COLUMN IF NOT EXISTS location_type VARCHAR(20) NOT NULL DEFAULT 'fixed';

-- Optional: enforce allowed values if not already constrained
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.check_constraints 
        WHERE constraint_name = 'places_location_type_check'
    ) THEN
        ALTER TABLE places
        ADD CONSTRAINT places_location_type_check
        CHECK (location_type IN ('fixed', 'mobile'));
    END IF;
END $$;

-- Backfill: set default for existing rows (already covered by default)
UPDATE places SET location_type = 'fixed' WHERE location_type IS NULL;


