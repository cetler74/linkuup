-- Migration script to add place_id column to bookings table and migrate data
-- Created: 2025-01-23
-- Purpose: Align bookings table with places schema for proper availability checking

BEGIN;

-- Show current state
SELECT 'Current bookings table structure:' as info;
\d bookings;

SELECT 'Current bookings count:' as info;
SELECT COUNT(*) as total_bookings FROM bookings;

-- Add place_id column to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS place_id INTEGER;

-- Create index for place_id
CREATE INDEX IF NOT EXISTS bookings_place_id_idx ON bookings(place_id);

-- Migrate data: Copy salon_id to place_id (since places table was created with same IDs as salons)
UPDATE bookings 
SET place_id = salon_id 
WHERE place_id IS NULL;

-- Verify the migration
SELECT 'Migration verification:' as info;
SELECT 
    COUNT(*) as total_bookings,
    COUNT(place_id) as bookings_with_place_id,
    COUNT(salon_id) as bookings_with_salon_id
FROM bookings;

-- Show sample migrated data
SELECT 'Sample migrated data:' as info;
SELECT id, salon_id, place_id, customer_name, booking_date, booking_time 
FROM bookings 
WHERE place_id IS NOT NULL 
LIMIT 5;

-- Add foreign key constraint to places table
ALTER TABLE bookings 
ADD CONSTRAINT fk_bookings_place_id 
FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE;

-- Update the updated_at timestamp
UPDATE bookings 
SET updated_at = CURRENT_TIMESTAMP 
WHERE place_id IS NOT NULL;

COMMIT;

-- Display the updated table structure
SELECT 'Updated bookings table structure:' as info;
\d bookings;

-- Show final statistics
SELECT 'Final migration statistics:' as info;
SELECT 
    COUNT(*) as total_bookings,
    COUNT(place_id) as bookings_with_place_id,
    COUNT(salon_id) as bookings_with_salon_id,
    COUNT(CASE WHEN place_id = salon_id THEN 1 END) as matching_ids
FROM bookings;
