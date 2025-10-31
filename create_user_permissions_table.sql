-- Create user_feature_permissions table
CREATE TABLE IF NOT EXISTS user_feature_permissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    feature_name VARCHAR(50) NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_user_feature UNIQUE (user_id, feature_name)
);

-- Insert default permissions for existing business owners
-- Only basic features enabled by default, premium features require subscription
INSERT INTO user_feature_permissions (user_id, feature_name, is_enabled)
SELECT 
    u.id,
    feature_name,
    CASE 
        WHEN feature_name IN ('bookings', 'notifications') THEN TRUE
        ELSE FALSE
    END as is_enabled
FROM users u
CROSS JOIN (
    VALUES 
        ('bookings'),
        ('rewards'),
        ('time_off'),
        ('campaigns'),
        ('messaging'),
        ('notifications')
) AS features(feature_name)
WHERE u.user_type = 'business_owner' OR u.is_business_owner = TRUE OR u.is_owner = TRUE
ON CONFLICT (user_id, feature_name) DO NOTHING;
