-- Migration: create_notifications_table
-- Creates notifications table for owner dashboard notifications

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('new_booking', 'cancellation', 'daily_reminder')),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
    place_id INTEGER REFERENCES places(id) ON DELETE SET NULL,
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS ix_notifications_owner_id ON notifications(owner_id);
CREATE INDEX IF NOT EXISTS ix_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS ix_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS ix_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS ix_notifications_booking_id ON notifications(booking_id);
CREATE INDEX IF NOT EXISTS ix_notifications_place_id ON notifications(place_id);

-- Create composite index for common query pattern (unread notifications for owner)
CREATE INDEX IF NOT EXISTS ix_notifications_owner_unread ON notifications(owner_id, is_read) WHERE is_read = FALSE;

