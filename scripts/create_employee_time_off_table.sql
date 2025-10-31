-- Create employee_time_off table for managing employee holidays and time-off
-- This table supports multiple time-off types, recurring patterns, and approval workflows

CREATE TABLE IF NOT EXISTS employee_time_off (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES business_employees(id) ON DELETE CASCADE,
    business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    time_off_type VARCHAR(20) NOT NULL CHECK (time_off_type IN ('holiday', 'sick_leave', 'personal_day', 'vacation')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_full_day BOOLEAN NOT NULL DEFAULT TRUE,
    half_day_period VARCHAR(2) CHECK (half_day_period IN ('AM', 'PM')),
    is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
    recurrence_pattern JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add constraints
ALTER TABLE employee_time_off 
ADD CONSTRAINT check_half_day_period 
CHECK (
    (is_full_day = TRUE AND half_day_period IS NULL) OR 
    (is_full_day = FALSE AND half_day_period IS NOT NULL)
);

ALTER TABLE employee_time_off 
ADD CONSTRAINT check_date_range 
CHECK (end_date >= start_date);

-- Create indexes for performance
CREATE INDEX idx_employee_time_off_employee_id ON employee_time_off(employee_id);
CREATE INDEX idx_employee_time_off_business_id ON employee_time_off(business_id);
CREATE INDEX idx_employee_time_off_start_date ON employee_time_off(start_date);
CREATE INDEX idx_employee_time_off_end_date ON employee_time_off(end_date);
CREATE INDEX idx_employee_time_off_status ON employee_time_off(status);
CREATE INDEX idx_employee_time_off_date_range ON employee_time_off(start_date, end_date);
CREATE INDEX idx_employee_time_off_employee_date ON employee_time_off(employee_id, start_date, end_date);

-- Create composite index for availability queries
CREATE INDEX idx_employee_time_off_availability ON employee_time_off(employee_id, start_date, end_date, status) 
WHERE status = 'approved';

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_employee_time_off_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_employee_time_off_updated_at
    BEFORE UPDATE ON employee_time_off
    FOR EACH ROW
    EXECUTE FUNCTION update_employee_time_off_updated_at();

-- Add sample data for testing
INSERT INTO employee_time_off (
    employee_id, business_id, time_off_type, start_date, end_date, 
    is_full_day, half_day_period, status, notes
) VALUES 
(1, 1, 'holiday', '2024-12-25', '2024-12-25', TRUE, NULL, 'approved', 'Christmas Day'),
(1, 1, 'vacation', '2024-12-30', '2025-01-03', TRUE, NULL, 'approved', 'New Year Holiday'),
(1, 1, 'personal_day', '2024-12-15', '2024-12-15', FALSE, 'PM', 'approved', 'Doctor appointment'),
(2, 1, 'sick_leave', '2024-12-10', '2024-12-12', TRUE, NULL, 'approved', 'Flu recovery');

-- Add a recurring holiday example (Christmas - yearly)
INSERT INTO employee_time_off (
    employee_id, business_id, time_off_type, start_date, end_date, 
    is_full_day, half_day_period, is_recurring, recurrence_pattern, status, notes
) VALUES 
(1, 1, 'holiday', '2024-12-25', '2024-12-25', TRUE, NULL, TRUE, 
 '{"frequency": "yearly", "month": 12, "day": 25}', 'approved', 'Christmas Day (Recurring)');

COMMENT ON TABLE employee_time_off IS 'Employee time-off and holiday management';
COMMENT ON COLUMN employee_time_off.time_off_type IS 'Type of time-off: holiday, sick_leave, personal_day, vacation';
COMMENT ON COLUMN employee_time_off.is_full_day IS 'Whether this is a full day off (true) or half day (false)';
COMMENT ON COLUMN employee_time_off.half_day_period IS 'For half days: AM (morning) or PM (afternoon)';
COMMENT ON COLUMN employee_time_off.is_recurring IS 'Whether this time-off repeats annually';
COMMENT ON COLUMN employee_time_off.recurrence_pattern IS 'JSON pattern for recurring time-off: {frequency: "yearly", month: 12, day: 25}';
COMMENT ON COLUMN employee_time_off.status IS 'Approval status: pending, approved, rejected, cancelled';
COMMENT ON COLUMN employee_time_off.requested_by IS 'User who requested this time-off (NULL for owner-created)';
COMMENT ON COLUMN employee_time_off.approved_by IS 'User who approved/rejected this time-off';
