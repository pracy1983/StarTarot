-- Migration 028: Create Specialties Table
CREATE TABLE IF NOT EXISTS public.specialties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    active BOOLEAN DEFAULT TRUE
);

-- Active RLS
ALTER TABLE public.specialties ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can read specialties" ON public.specialties
FOR SELECT USING (active = true);

CREATE POLICY "Admins can manage specialties" ON public.specialties
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'owner'
    )
);

-- Populate with initial values
INSERT INTO public.specialties (name, slug)
VALUES 
    ('Tarot', 'tarot'),
    ('Astrologia', 'astrologia'),
    ('Búzios', 'buzios'),
    ('Runas', 'runas'),
    ('Numerologia', 'numerologia'),
    ('Espelho Negro', 'espelho-negro'),
    ('Oráculo dos Ossos', 'oraculo-ossos')
ON CONFLICT (name) DO NOTHING;
