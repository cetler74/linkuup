-- Add specialty column to place_employees table
-- This allows employees to have specialties like "Haircuts", "Manicure", "Pedicure", etc.

-- Add the specialty column
ALTER TABLE place_employees 
ADD COLUMN specialty VARCHAR(100) NULL;

-- Add a comment to explain the column
COMMENT ON COLUMN place_employees.specialty IS 'Employee specialty (e.g., Haircuts, Manicure, Pedicure, Facial, etc.)';

-- Create an index on specialty for better query performance
CREATE INDEX idx_place_employees_specialty ON place_employees(specialty);

-- Update any existing employees with a default specialty if needed
-- This is optional - you can set specific specialties for existing employees
-- UPDATE place_employees SET specialty = 'General' WHERE specialty IS NULL;
