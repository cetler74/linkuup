-- Add OAuth provider fields to users table
-- This script adds support for Google and Facebook OAuth authentication
-- Database: linkuup_db
-- Run with: psql "postgresql://carloslarramba@localhost:5432/linkuup_db" -f scripts/add_oauth_fields.sql

-- Add OAuth provider fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_id VARCHAR(100);

-- Create index for faster OAuth lookups
CREATE INDEX IF NOT EXISTS idx_users_oauth ON users(oauth_provider, oauth_id);

-- Update existing users to have empty oauth fields
UPDATE users SET oauth_provider = NULL, oauth_id = NULL WHERE oauth_provider IS NULL;

-- Make customer_id optional (remove NOT NULL constraint if it exists)
-- Note: This might need to be adjusted based on your current schema
-- ALTER TABLE users ALTER COLUMN customer_id DROP NOT NULL;
