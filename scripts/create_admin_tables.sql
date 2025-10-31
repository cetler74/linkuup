-- Admin tables for platform administration
-- Database: lookuup_db

-- Admin campaigns table
CREATE TABLE IF NOT EXISTS admin_campaigns (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    target_audience VARCHAR(50) NOT NULL CHECK (target_audience IN ('existing_owners', 'new_owners', 'both')),
    channels TEXT[] NOT NULL, -- Array of channel types: email, sms, instagram, facebook, twitter, linkedin
    content TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled')),
    scheduled_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Admin campaign analytics table
CREATE TABLE IF NOT EXISTS admin_campaign_analytics (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL REFERENCES admin_campaigns(id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL, -- opens, clicks, conversions, reach, engagement
    metric_value INTEGER NOT NULL DEFAULT 0,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    metadata JSONB -- Additional analytics data
);

-- Admin messages table (GDPR compliant - separate from owner-customer messages)
CREATE TABLE IF NOT EXISTS admin_messages (
    id SERIAL PRIMARY KEY,
    subject VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    sender_id INTEGER NOT NULL REFERENCES users(id),
    is_urgent BOOLEAN NOT NULL DEFAULT FALSE,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Admin message recipients table
CREATE TABLE IF NOT EXISTS admin_message_recipients (
    id SERIAL PRIMARY KEY,
    message_id INTEGER NOT NULL REFERENCES admin_messages(id) ON DELETE CASCADE,
    recipient_owner_id INTEGER NOT NULL REFERENCES users(id),
    sent_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    replied_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'replied', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Admin message replies table
CREATE TABLE IF NOT EXISTS admin_message_replies (
    id SERIAL PRIMARY KEY,
    message_id INTEGER NOT NULL REFERENCES admin_messages(id) ON DELETE CASCADE,
    reply_to_recipient_id INTEGER NOT NULL REFERENCES admin_message_recipients(id) ON DELETE CASCADE,
    sender_owner_id INTEGER NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_campaigns_status ON admin_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_admin_campaigns_created_by ON admin_campaigns(created_by);
CREATE INDEX IF NOT EXISTS idx_admin_campaigns_scheduled_at ON admin_campaigns(scheduled_at);

CREATE INDEX IF NOT EXISTS idx_admin_campaign_analytics_campaign_id ON admin_campaign_analytics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_admin_campaign_analytics_metric_type ON admin_campaign_analytics(metric_type);
CREATE INDEX IF NOT EXISTS idx_admin_campaign_analytics_recorded_at ON admin_campaign_analytics(recorded_at);

CREATE INDEX IF NOT EXISTS idx_admin_messages_sender_id ON admin_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_admin_messages_scheduled_at ON admin_messages(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_admin_messages_sent_at ON admin_messages(sent_at);

CREATE INDEX IF NOT EXISTS idx_admin_message_recipients_message_id ON admin_message_recipients(message_id);
CREATE INDEX IF NOT EXISTS idx_admin_message_recipients_recipient_owner_id ON admin_message_recipients(recipient_owner_id);
CREATE INDEX IF NOT EXISTS idx_admin_message_recipients_status ON admin_message_recipients(status);

CREATE INDEX IF NOT EXISTS idx_admin_message_replies_message_id ON admin_message_replies(message_id);
CREATE INDEX IF NOT EXISTS idx_admin_message_replies_sender_owner_id ON admin_message_replies(sender_owner_id);

-- Update triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_admin_campaigns_updated_at 
    BEFORE UPDATE ON admin_campaigns 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_messages_updated_at 
    BEFORE UPDATE ON admin_messages 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE admin_campaigns IS 'Platform-wide marketing campaigns for existing and potential owners';
COMMENT ON TABLE admin_campaign_analytics IS 'Analytics and metrics for admin campaigns';
COMMENT ON TABLE admin_messages IS 'Admin-to-owner messaging system (GDPR compliant, separate from customer messages)';
COMMENT ON TABLE admin_message_recipients IS 'Message delivery tracking for admin messages';
COMMENT ON TABLE admin_message_replies IS 'Replies from owners to admin messages';
