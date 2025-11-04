-- Add profile_picture column to users table
-- Run this migration to add profile picture support for OAuth users

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS profile_picture VARCHAR(500) NULL;

-- Add comment
COMMENT ON COLUMN users.profile_picture IS 'Profile picture URL from OAuth providers (Google/Facebook)';

