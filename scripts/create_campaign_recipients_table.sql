-- Campaign Recipients Table
-- Database: linkuup_db
-- Purpose: Store recipients for messaging campaigns with delivery tracking

CREATE TABLE IF NOT EXISTS campaign_recipients (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    customer_email VARCHAR(100),
    customer_phone VARCHAR(20),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
    sent_at TIMESTAMP WITH TIME ZONE,
    delivery_status VARCHAR(50), -- Twilio delivery status (delivered, failed, etc.)
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign_id ON campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_status ON campaign_recipients(status);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_user_id ON campaign_recipients(user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_sent_at ON campaign_recipients(sent_at);

-- Add unique constraint to prevent duplicate recipients per campaign
CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_recipients_unique ON campaign_recipients(campaign_id, user_id);

-- Add comments for documentation
COMMENT ON TABLE campaign_recipients IS 'Stores recipients for messaging campaigns with delivery tracking';
COMMENT ON COLUMN campaign_recipients.campaign_id IS 'Reference to the messaging campaign';
COMMENT ON COLUMN campaign_recipients.user_id IS 'Reference to the customer user';
COMMENT ON COLUMN campaign_recipients.customer_email IS 'Customer email address for email campaigns';
COMMENT ON COLUMN campaign_recipients.customer_phone IS 'Customer phone number for WhatsApp campaigns (E.164 format)';
COMMENT ON COLUMN campaign_recipients.status IS 'Delivery status: pending, sent, failed, bounced';
COMMENT ON COLUMN campaign_recipients.sent_at IS 'Timestamp when message was sent';
COMMENT ON COLUMN campaign_recipients.delivery_status IS 'Provider-specific delivery status (e.g., Twilio status)';
COMMENT ON COLUMN campaign_recipients.error_message IS 'Error details if sending failed';
