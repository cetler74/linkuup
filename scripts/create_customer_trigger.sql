-- Create trigger function to automatically populate customer data from bookings
CREATE OR REPLACE FUNCTION populate_customer_from_booking()
RETURNS TRIGGER AS $$
DECLARE
    user_id_var INTEGER;
BEGIN
    -- Get user_id from users table based on customer_email
    SELECT id INTO user_id_var 
    FROM users 
    WHERE email = NEW.customer_email;
    
    -- Only proceed if user exists
    IF user_id_var IS NOT NULL THEN
        -- Check if customer-place association already exists
        IF EXISTS (
            SELECT 1 FROM customer_place_associations 
            WHERE user_id = user_id_var AND place_id = NEW.place_id
        ) THEN
            -- Update existing association
            UPDATE customer_place_associations 
            SET 
                last_booking_date = NEW.booking_date,
                total_bookings = total_bookings + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = user_id_var AND place_id = NEW.place_id;
            
            -- Update first_booking_date if this booking is earlier
            UPDATE customer_place_associations 
            SET first_booking_date = NEW.booking_date
            WHERE user_id = user_id_var 
            AND place_id = NEW.place_id 
            AND (first_booking_date IS NULL OR NEW.booking_date < first_booking_date);
        ELSE
            -- Create new association
            INSERT INTO customer_place_associations (
                user_id, 
                place_id, 
                first_booking_date, 
                last_booking_date, 
                total_bookings,
                created_at,
                updated_at
            ) VALUES (
                user_id_var, 
                NEW.place_id, 
                NEW.booking_date, 
                NEW.booking_date, 
                1,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on bookings table
DROP TRIGGER IF EXISTS trigger_populate_customer_from_booking ON bookings;
CREATE TRIGGER trigger_populate_customer_from_booking
    AFTER INSERT ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION populate_customer_from_booking();

-- Create function to sync existing customer data
CREATE OR REPLACE FUNCTION sync_customer_data_from_bookings(place_id_param INTEGER)
RETURNS INTEGER AS $$
DECLARE
    customer_record RECORD;
    user_id_var INTEGER;
    synced_count INTEGER := 0;
BEGIN
    -- Get all unique customers from bookings for this place
    FOR customer_record IN
        SELECT 
            customer_email,
            customer_name,
            customer_phone,
            MIN(booking_date) as first_booking_date,
            MAX(booking_date) as last_booking_date,
            COUNT(*) as total_bookings
        FROM bookings 
        WHERE place_id = place_id_param
        GROUP BY customer_email, customer_name, customer_phone
    LOOP
        -- Get user_id from users table
        SELECT id INTO user_id_var 
        FROM users 
        WHERE email = customer_record.customer_email;
        
        -- Only proceed if user exists
        IF user_id_var IS NOT NULL THEN
            -- Check if association already exists
            IF NOT EXISTS (
                SELECT 1 FROM customer_place_associations 
                WHERE user_id = user_id_var AND place_id = place_id_param
            ) THEN
                -- Create new association
                INSERT INTO customer_place_associations (
                    user_id, 
                    place_id, 
                    first_booking_date, 
                    last_booking_date, 
                    total_bookings,
                    created_at,
                    updated_at
                ) VALUES (
                    user_id_var, 
                    place_id_param, 
                    customer_record.first_booking_date, 
                    customer_record.last_booking_date, 
                    customer_record.total_bookings,
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP
                );
                
                synced_count := synced_count + 1;
            END IF;
        END IF;
    END LOOP;
    
    RETURN synced_count;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at column to customer_place_associations if it doesn't exist
ALTER TABLE customer_place_associations 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_customer_place_associations_user_place 
ON customer_place_associations(user_id, place_id);

CREATE INDEX IF NOT EXISTS idx_customer_place_associations_place 
ON customer_place_associations(place_id);

-- Create index on bookings for customer email lookups
CREATE INDEX IF NOT EXISTS idx_bookings_customer_email 
ON bookings(customer_email);

CREATE INDEX IF NOT EXISTS idx_bookings_place_customer 
ON bookings(place_id, customer_email);
