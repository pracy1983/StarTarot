-- Final sync for profiles table to ensure all necessary columns for Phase 3 refinements exist
-- This specifically addresses the PGRST204 error about 'initial_fee_credits'

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS initial_fee_brl DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS initial_fee_credits INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_brl_per_minute DECIMAL(10,2) DEFAULT 5.00,
ADD COLUMN IF NOT EXISTS price_per_message INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS requires_birthdate BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS requires_birthtime BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS allows_video BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS allows_text BOOLEAN DEFAULT true;

-- Update comments
COMMENT ON COLUMN public.profiles.initial_fee_credits IS 'Initial fee converted to credits for the final user.';
COMMENT ON COLUMN public.profiles.price_per_message IS 'Price per message (human or AI) in credits.';

-- Ensure any nulls are filled with defaults
UPDATE public.profiles SET initial_fee_credits = 0 WHERE initial_fee_credits IS NULL;
UPDATE public.profiles SET initial_fee_brl = 0.00 WHERE initial_fee_brl IS NULL;
UPDATE public.profiles SET price_per_message = 10 WHERE price_per_message IS NULL;
UPDATE public.profiles SET price_brl_per_minute = 5.00 WHERE price_brl_per_minute IS NULL;
UPDATE public.profiles SET requires_birthdate = false WHERE requires_birthdate IS NULL;
UPDATE public.profiles SET requires_birthtime = false WHERE requires_birthtime IS NULL;
UPDATE public.profiles SET allows_video = true WHERE allows_video IS NULL;
UPDATE public.profiles SET allows_text = true WHERE allows_text IS NULL;
