-- Script to drop all campaigns and related data from the database
-- This will remove all campaign data while preserving booking data

-- First, let's see what we're working with
SELECT 'Before deletion:' as status, COUNT(*) as count FROM campaigns;

-- Drop campaign-related data in the correct order (respecting foreign key constraints)

-- 1. Clear campaign data from bookings (set to NULL)
UPDATE bookings SET 
    campaign_id = NULL,
    campaign_name = NULL,
    campaign_type = NULL,
    campaign_discount_type = NULL,
    campaign_discount_value = NULL,
    campaign_banner_message = NULL;

-- 2. Drop campaign-service associations
DELETE FROM campaign_services;

-- 3. Drop campaign-place associations  
DELETE FROM campaign_places;

-- 4. Drop all campaigns
DELETE FROM campaigns;

-- Verify deletion
SELECT 'After deletion:' as status, COUNT(*) as count FROM campaigns;

-- Show remaining data
SELECT 'Remaining campaign_places:' as table_name, COUNT(*) as count FROM campaign_places
UNION ALL
SELECT 'Remaining campaign_services:' as table_name, COUNT(*) as count FROM campaign_services
UNION ALL
SELECT 'Bookings with campaign data:' as table_name, COUNT(*) as count FROM bookings WHERE campaign_id IS NOT NULL;
