-- Create place_employee_time_off to block individual employees at a place

CREATE TABLE IF NOT EXISTS place_employee_time_off (
    id SERIAL PRIMARY KEY,
    place_id INTEGER NOT NULL REFERENCES places(id) ON DELETE CASCADE,
    employee_id INTEGER NOT NULL REFERENCES place_employees(id) ON DELETE CASCADE,
    time_off_type VARCHAR(20) NOT NULL CHECK (time_off_type IN ('holiday','sick_leave','personal_day','vacation')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_full_day BOOLEAN NOT NULL DEFAULT TRUE,
    half_day_period VARCHAR(2) CHECK (half_day_period IN ('AM','PM')),
    is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
    recurrence_pattern JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'approved' CHECK (status IN ('pending','approved','rejected','cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE place_employee_time_off
ADD CONSTRAINT place_employee_time_off_half_day_ck
CHECK (
  (is_full_day = TRUE AND half_day_period IS NULL) OR
  (is_full_day = FALSE AND half_day_period IS NOT NULL)
);

ALTER TABLE place_employee_time_off
ADD CONSTRAINT place_employee_time_off_date_range_ck
CHECK (end_date >= start_date);

CREATE INDEX IF NOT EXISTS idx_peto_place_id ON place_employee_time_off(place_id);
CREATE INDEX IF NOT EXISTS idx_peto_employee_id ON place_employee_time_off(employee_id);
CREATE INDEX IF NOT EXISTS idx_peto_date_range ON place_employee_time_off(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_peto_availability ON place_employee_time_off(employee_id, start_date, end_date, status) WHERE status = 'approved';

CREATE OR REPLACE FUNCTION update_place_employee_time_off_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_place_employee_time_off_updated_at ON place_employee_time_off;
CREATE TRIGGER trigger_update_place_employee_time_off_updated_at
  BEFORE UPDATE ON place_employee_time_off
  FOR EACH ROW
  EXECUTE FUNCTION update_place_employee_time_off_updated_at();


