-- Add campaign-related fields to bookings table
-- This allows storing campaign information snapshot when a booking is created

-- Add campaign_id as foreign key reference
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS campaign_id INTEGER REFERENCES campaigns(id) ON DELETE SET NULL;

-- Add campaign snapshot fields for historical reference
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS campaign_name VARCHAR(200);

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS campaign_type VARCHAR(50);

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS campaign_discount_type VARCHAR(50);

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS campaign_discount_value DECIMAL(10, 2);

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS campaign_banner_message TEXT;

-- Add index on campaign_id for faster queries
CREATE INDEX IF NOT EXISTS idx_bookings_campaign_id ON bookings(campaign_id);

-- Add comment to table
COMMENT ON COLUMN bookings.campaign_id IS 'Reference to campaign that was active during booking';
COMMENT ON COLUMN bookings.campaign_name IS 'Snapshot of campaign name at booking time';
COMMENT ON COLUMN bookings.campaign_type IS 'Type: price_reduction, rewards_increase, free_service';
COMMENT ON COLUMN bookings.campaign_discount_type IS 'Discount type: percentage or fixed_amount';
COMMENT ON COLUMN bookings.campaign_discount_value IS 'Discount value applied';
COMMENT ON COLUMN bookings.campaign_banner_message IS 'Campaign banner message shown to customer';

