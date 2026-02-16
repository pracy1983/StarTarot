-- Migration for Specialties Management, Ratings, and Profile Updates

-- 1. Create specialties table
CREATE TABLE IF NOT EXISTS public.specialties (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed defaults
INSERT INTO public.specialties (name) VALUES 
('Tarot'), ('Astrologia'), ('Cartomancia'), ('Numerologia'), ('Runas'), ('Clarividência'), ('Búzios'), ('Outros')
ON CONFLICT (name) DO NOTHING;

-- 2. Add custom_specialty to profiles if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'custom_specialty') THEN
        ALTER TABLE public.profiles ADD COLUMN custom_specialty TEXT;
    END IF;
END $$;

-- 3. Migration logic for existing profiles
-- If a profile has a specialty that IS NOT in the new table (except 'Outro' if it was text), add it to table? 
-- Or move to custom?
-- For now, let's assume existing specialties in profiles are consistent with the static list we just seeded.
-- But if any profile has a specialty not in the list, let's treat it as 'Outros' + custom.

UPDATE public.profiles 
SET custom_specialty = specialty, specialty = 'Outros'
WHERE specialty NOT IN (SELECT name FROM public.specialties);

-- 4. RLS for specialties
ALTER TABLE public.specialties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read specialties" ON public.specialties FOR SELECT USING (true);
CREATE POLICY "Admins manage specialties" ON public.specialties USING (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
);

-- 5. Fix ratings if needed (ensure table exists logic from previous context is enough)
-- Just ensuring we have the structure used in pages.
