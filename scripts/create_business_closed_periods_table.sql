-- Create business_closed_periods table for business-wide closures (public holidays, maintenance)

CREATE TABLE IF NOT EXISTS business_closed_periods (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_full_day BOOLEAN NOT NULL DEFAULT TRUE,
    half_day_period VARCHAR(2) CHECK (half_day_period IN ('AM', 'PM')),
    is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
    recurrence_pattern JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE business_closed_periods
ADD CONSTRAINT business_closed_periods_half_day_ck
CHECK (
  (is_full_day = TRUE AND half_day_period IS NULL) OR
  (is_full_day = FALSE AND half_day_period IS NOT NULL)
);

ALTER TABLE business_closed_periods
ADD CONSTRAINT business_closed_periods_date_range_ck
CHECK (end_date >= start_date);

CREATE INDEX IF NOT EXISTS idx_bcp_business_id ON business_closed_periods(business_id);
CREATE INDEX IF NOT EXISTS idx_bcp_date_range ON business_closed_periods(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_bcp_recurring ON business_closed_periods(is_recurring) WHERE is_recurring = TRUE;

CREATE OR REPLACE FUNCTION update_business_closed_periods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_business_closed_periods_updated_at ON business_closed_periods;
CREATE TRIGGER trigger_update_business_closed_periods_updated_at
  BEFORE UPDATE ON business_closed_periods
  FOR EACH ROW
  EXECUTE FUNCTION update_business_closed_periods_updated_at();


