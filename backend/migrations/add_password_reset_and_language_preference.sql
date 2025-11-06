-- Migration: add_password_reset_and_language_preference
-- Adds password reset token fields and language preference to users table

-- Add password reset fields
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(200),
ADD COLUMN IF NOT EXISTS password_reset_token_expires_at TIMESTAMP WITH TIME ZONE;

-- Add language preference field
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS language_preference VARCHAR(10) DEFAULT 'en';

-- Create index on password_reset_token for faster lookups
CREATE INDEX IF NOT EXISTS ix_users_password_reset_token ON users(password_reset_token);

-- Update existing users to have default language preference
UPDATE users 
SET language_preference = 'en' 
WHERE language_preference IS NULL;

