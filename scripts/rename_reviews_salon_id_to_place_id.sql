-- Migration script to rename salon_id to place_id in reviews table
-- This ensures consistency with the places table naming

-- First, add the new place_id column
ALTER TABLE reviews ADD COLUMN place_id INTEGER;

-- Copy data from salon_id to place_id
UPDATE reviews SET place_id = salon_id;

-- Make place_id NOT NULL
ALTER TABLE reviews ALTER COLUMN place_id SET NOT NULL;

-- Add foreign key constraint for place_id
ALTER TABLE reviews ADD CONSTRAINT fk_reviews_place_id 
    FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE;

-- Drop the old salon_id column
ALTER TABLE reviews DROP COLUMN salon_id;

-- Add index on place_id for better performance
CREATE INDEX idx_reviews_place_id ON reviews(place_id);
