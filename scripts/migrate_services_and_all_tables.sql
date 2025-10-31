-- Comprehensive migration to add missing columns to all tables
-- Created: 2025-10-14
-- Purpose: Ensure all tables have updated_at columns where needed

BEGIN;

-- Add updated_at to services table
ALTER TABLE services ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Add sync_version to services table for mobile sync
ALTER TABLE services ADD COLUMN IF NOT EXISTS sync_version INTEGER DEFAULT 1;

-- Create index for services
CREATE INDEX IF NOT EXISTS services_updated_at_idx ON services(updated_at);

-- Add updated_at to salons table if not exists
ALTER TABLE salons ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Add sync_version to salons table for mobile sync
ALTER TABLE salons ADD COLUMN IF NOT EXISTS sync_version INTEGER DEFAULT 1;

-- Create index for salons
CREATE INDEX IF NOT EXISTS salons_updated_at_idx ON salons(updated_at);

-- Add updated_at to time_slots table if not exists
ALTER TABLE time_slots ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Create index for time_slots
CREATE INDEX IF NOT EXISTS time_slots_updated_at_idx ON time_slots(updated_at);

-- Add updated_at to reviews table if not exists
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Create index for reviews
CREATE INDEX IF NOT EXISTS reviews_updated_at_idx ON reviews(updated_at);

COMMIT;

-- Verify all tables now have updated_at
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND column_name IN ('updated_at', 'sync_version')
ORDER BY table_name, column_name;

