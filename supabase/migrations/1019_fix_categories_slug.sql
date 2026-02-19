-- Migration 1019: Fix missing slug column in oracle_categories
-- ========================================================

ALTER TABLE public.oracle_categories 
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Generate slugs for existing categories if any
UPDATE public.oracle_categories 
SET slug = lower(trim(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g')))
WHERE slug IS NULL;

-- Make slug NOT NULL after populating
ALTER TABLE public.oracle_categories 
ALTER COLUMN slug SET NOT NULL;
