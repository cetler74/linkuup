-- Migration script to add missing columns to users table
-- Created: 2025-10-14
-- Purpose: Add mobile API token fields to support the login functionality

BEGIN;

-- Add refresh_token column
ALTER TABLE users ADD COLUMN IF NOT EXISTS refresh_token VARCHAR(200) UNIQUE;

-- Add token expiration columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS refresh_token_expires_at TIMESTAMP WITHOUT TIME ZONE;

-- Add login tracking columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Create index on refresh_token for faster lookups
CREATE UNIQUE INDEX IF NOT EXISTS users_refresh_token_idx ON users(refresh_token) WHERE refresh_token IS NOT NULL;

COMMIT;

-- Display the updated table structure
\d users

