-- Add slug column to places table
-- Slug will be URL-friendly (lowercase, alphanumeric + hyphens only)

-- First, add the column as nullable
ALTER TABLE places 
ADD COLUMN IF NOT EXISTS slug VARCHAR(50);

-- Create a function to generate slug from text
-- Note: This version doesn't require unaccent extension
CREATE OR REPLACE FUNCTION generate_slug(input_text TEXT) 
RETURNS TEXT AS $$
DECLARE
    result TEXT;
    counter INTEGER := 1;
    final_slug TEXT;
    char_code INTEGER;
    char_char CHAR;
BEGIN
    -- Convert to lowercase and handle basic character normalization
    result := lower(COALESCE(input_text, ''));
    
    -- Manual accent removal (common accented characters)
    result := translate(result, 'àáâãäåèéêëìíîïòóôõöùúûüýÿñç', 'aaaaaaeeeeiiiioooouuuuyync');
    result := translate(result, 'ÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÝŸÑÇ', 'aaaaaaeeeeiiiioooouuuuyync');
    
    -- Replace spaces and underscores with hyphens
    result := regexp_replace(result, '[_\s]+', '-', 'g');
    
    -- Remove all non-alphanumeric characters except hyphens
    result := regexp_replace(result, '[^a-z0-9-]', '', 'g');
    
    -- Remove consecutive hyphens
    result := regexp_replace(result, '-+', '-', 'g');
    
    -- Remove leading and trailing hyphens
    result := trim(both '-' from result);
    
    -- Limit to 50 characters
    IF length(result) > 50 THEN
        result := left(result, 50);
        -- Ensure we don't end with a hyphen after truncation
        result := rtrim(result, '-');
    END IF;
    
    -- If empty, use default
    IF result = '' OR result IS NULL THEN
        result := 'place';
    END IF;
    
    -- Ensure uniqueness by appending number if needed
    final_slug := result;
    WHILE EXISTS (SELECT 1 FROM places WHERE slug = final_slug AND slug IS NOT NULL) LOOP
        final_slug := result || '-' || counter;
        counter := counter + 1;
        
        -- Prevent infinite loop with very long slugs
        IF length(final_slug) > 50 THEN
            final_slug := left(result, 45) || '-' || counter;
        END IF;
        
        -- Safety check
        IF counter > 10000 THEN
            final_slug := result || '-' || extract(epoch from now())::bigint;
            EXIT;
        END IF;
    END LOOP;
    
    RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Generate slugs for existing places based on nome field
UPDATE places 
SET slug = generate_slug(nome)
WHERE slug IS NULL;

-- Ensure all places have slugs (handle any edge cases)
UPDATE places 
SET slug = 'place-' || id::text
WHERE slug IS NULL OR slug = '';

-- Now make the column NOT NULL and add unique constraint
ALTER TABLE places 
ALTER COLUMN slug SET NOT NULL;

-- Add unique constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'places_slug_key'
    ) THEN
        ALTER TABLE places
        ADD CONSTRAINT places_slug_key UNIQUE (slug);
    END IF;
END $$;

-- Create index on slug for fast lookups
CREATE INDEX IF NOT EXISTS idx_places_slug ON places(slug);

-- Drop the temporary function (optional - can keep it for future use)
-- DROP FUNCTION IF EXISTS generate_slug(TEXT);

