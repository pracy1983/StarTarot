-- Migration 1013: Add signup bonus and ensure global settings
-- ========================================================

-- Ensure global_settings table exists
CREATE TABLE IF NOT EXISTS public.global_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for global_settings
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Public can view settings" ON public.global_settings;
DROP POLICY IF EXISTS "Owners can manage settings" ON public.global_settings;

CREATE POLICY "Public can view settings" 
ON public.global_settings FOR SELECT 
TO public 
USING (true);

CREATE POLICY "Owners can manage settings" 
ON public.global_settings FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'owner'
    )
);

-- Insert default values if not exists
INSERT INTO public.global_settings (key, value)
VALUES 
    ('oracle_commission_pc', '70'),
    ('signup_bonus_credits', '50'),
    ('credit_price_brl', '0.10')
ON CONFLICT (key) DO NOTHING;
