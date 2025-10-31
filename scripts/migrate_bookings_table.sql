-- Migration script to add missing columns to bookings table
-- Created: 2025-10-14
-- Purpose: Add updated_at and sync_version columns for mobile sync support

BEGIN;

-- Show current state
SELECT COUNT(*) as total_bookings FROM bookings;

-- Add updated_at column
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Add sync_version column for mobile API sync
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS sync_version INTEGER DEFAULT 1;

-- Update existing records to have current timestamp
UPDATE bookings 
SET updated_at = COALESCE(created_at, CURRENT_TIMESTAMP)
WHERE updated_at IS NULL;

-- Create index for sync operations
CREATE INDEX IF NOT EXISTS bookings_updated_at_idx ON bookings(updated_at);
CREATE INDEX IF NOT EXISTS bookings_sync_version_idx ON bookings(sync_version);

COMMIT;

-- Display the updated table structure
\d bookings

