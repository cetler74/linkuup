-- Add user_type field to users table
-- This script adds support for distinguishing between customers and business owners
-- Database: linkuup_db
-- Run with: psql "postgresql://carloslarramba@localhost:5432/linkuup_db" -f scripts/add_user_type_field.sql

-- Add user_type field with default value 'customer'
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_type VARCHAR(20) NOT NULL DEFAULT 'customer';

-- Update existing users to have customer type (if they don't have it already)
UPDATE users SET user_type = 'customer' WHERE user_type IS NULL;

-- Create index for faster user type lookups
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);

-- Add check constraint to ensure only valid user types
ALTER TABLE users ADD CONSTRAINT chk_user_type CHECK (user_type IN ('customer', 'business_owner'));

-- Show the updated table structure
\d users;
