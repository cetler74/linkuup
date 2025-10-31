-- Campaign Messages Table
-- Database: linkuup_db
-- Purpose: Store message content for different channels (email, WhatsApp)

CREATE TABLE IF NOT EXISTS campaign_messages (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'whatsapp')),
    subject VARCHAR(255), -- For email campaigns
    message_body TEXT NOT NULL,
    template_variables JSONB, -- For future template system
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaign_messages_campaign_id ON campaign_messages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_messages_channel ON campaign_messages(channel);

-- Add unique constraint to prevent duplicate messages per campaign per channel
CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_messages_unique ON campaign_messages(campaign_id, channel);

-- Add comments for documentation
COMMENT ON TABLE campaign_messages IS 'Stores message content for different channels in messaging campaigns';
COMMENT ON COLUMN campaign_messages.campaign_id IS 'Reference to the messaging campaign';
COMMENT ON COLUMN campaign_messages.channel IS 'Message channel: email or whatsapp';
COMMENT ON COLUMN campaign_messages.subject IS 'Email subject line (only for email campaigns)';
COMMENT ON COLUMN campaign_messages.message_body IS 'Message content (HTML for email, plain text for WhatsApp)';
COMMENT ON COLUMN campaign_messages.template_variables IS 'JSON object for template variable substitution (future feature)';
