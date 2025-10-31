-- Add employee_id column to existing bookings table
-- This migration adds employee assignment capability to bookings

-- Add the employee_id column to the bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS employee_id INTEGER;

-- Add a comment to document the column
COMMENT ON COLUMN bookings.employee_id IS 'References the employee assigned to this booking';

-- Create an index on employee_id for better query performance
CREATE INDEX IF NOT EXISTS idx_bookings_employee_id ON bookings(employee_id);

-- Create an index on the combination of place_id, booking_date, and employee_id for availability queries
CREATE INDEX IF NOT EXISTS idx_bookings_place_date_employee ON bookings(place_id, booking_date, employee_id);

-- Update existing bookings to have NULL employee_id (they can be assigned later if needed)
-- This is safe since the column is nullable
UPDATE bookings SET employee_id = NULL WHERE employee_id IS NULL;
