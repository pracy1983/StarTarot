-- Migration 1018: Ensure Oracle Categories and Specialties
-- ========================================================

-- 1. Create oracle_categories if missing
CREATE TABLE IF NOT EXISTS public.oracle_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Insert Default Categories
INSERT INTO public.oracle_categories (name)
VALUES 
    ('Tarot'),
    ('Baralho Cigano'),
    ('Runas'),
    ('Búzios'),
    ('Numerologia'),
    ('Astrologia'),
    ('Mesa Radiônica'),
    ('Outros')
ON CONFLICT (name) DO NOTHING;

-- 3. Ensure oracle_specialties exists (renaming from specialties if it exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'specialties') THEN
        ALTER TABLE public.specialties RENAME TO oracle_specialties;
    END IF;
END $$;

-- Create oracle_specialties if missing
CREATE TABLE IF NOT EXISTS public.oracle_specialties (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Update Profiles Columns if missing (from Migration 1014)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS categories TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS topics TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS custom_category TEXT,
ADD COLUMN IF NOT EXISTS custom_topic TEXT;
