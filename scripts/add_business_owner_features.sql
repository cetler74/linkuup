-- Business Owner Administration Features Migration
-- This script adds necessary columns to existing tables for business owner features

-- Add new columns to business_bookings table for advanced booking features
ALTER TABLE business_bookings 
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS recurrence_pattern JSONB,
ADD COLUMN IF NOT EXISTS recurrence_end_date DATE,
ADD COLUMN IF NOT EXISTS parent_booking_id INTEGER REFERENCES business_bookings(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS color_code VARCHAR(7), -- Hex color code
ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP;

-- Add location type to businesses table for fixed/mobile places
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS location_type VARCHAR(20) DEFAULT 'fixed' CHECK (location_type IN ('fixed', 'mobile')),
ADD COLUMN IF NOT EXISTS service_areas JSONB; -- Array of cities/regions for mobile places

-- Add working hours to business_employees table
ALTER TABLE business_employees 
ADD COLUMN IF NOT EXISTS working_hours JSONB; -- Store weekly schedule as JSON

-- Add business_id to campaigns table to link campaigns to businesses
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_business_bookings_parent_booking_id ON business_bookings(parent_booking_id);
CREATE INDEX IF NOT EXISTS idx_business_bookings_color_code ON business_bookings(color_code);
CREATE INDEX IF NOT EXISTS idx_business_bookings_reminder_sent ON business_bookings(reminder_sent);
CREATE INDEX IF NOT EXISTS idx_businesses_location_type ON businesses(location_type);
CREATE INDEX IF NOT EXISTS idx_campaigns_business_id ON campaigns(business_id);

-- Add comments for documentation
COMMENT ON COLUMN business_bookings.is_recurring IS 'Whether this is a recurring booking';
COMMENT ON COLUMN business_bookings.recurrence_pattern IS 'JSON pattern for recurring bookings: {frequency: "weekly", interval: 1, daysOfWeek: [1,3,5], endDate: "2025-12-31"}';
COMMENT ON COLUMN business_bookings.parent_booking_id IS 'Reference to parent booking for recurring series';
COMMENT ON COLUMN business_bookings.color_code IS 'Hex color code for calendar display';
COMMENT ON COLUMN business_bookings.reminder_sent IS 'Whether reminder email has been sent';
COMMENT ON COLUMN businesses.location_type IS 'fixed for physical locations, mobile for service areas';
COMMENT ON COLUMN businesses.service_areas IS 'JSON array of cities/regions for mobile places';
COMMENT ON COLUMN business_employees.working_hours IS 'JSON weekly schedule: {monday: {start: "09:00", end: "17:00", available: true}, ...}';
COMMENT ON COLUMN campaigns.business_id IS 'Reference to business that owns this campaign';

-- Update existing businesses to have fixed location type
UPDATE businesses SET location_type = 'fixed' WHERE location_type IS NULL;

-- Create trigger to update updated_at columns (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at trigger to business_bookings if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_business_bookings_updated_at') THEN
        CREATE TRIGGER update_business_bookings_updated_at 
        BEFORE UPDATE ON business_bookings
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;