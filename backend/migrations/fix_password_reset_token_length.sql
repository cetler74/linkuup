-- Fix password_reset_token column length
-- JWT tokens can be longer than 200 characters, increase to 500

ALTER TABLE users 
ALTER COLUMN password_reset_token TYPE VARCHAR(500);

