-- Add metadata column to consultations table if it doesn't exist
ALTER TABLE public.consultations ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Ensure application_status column exists in profiles (it was added in 999_final_repair but let's be safe)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS application_status TEXT DEFAULT 'none'; -- none, pending, approved, rejected

-- Update existing oracles to have 'approved' status if they are already acting as oracles
UPDATE public.profiles 
SET application_status = 'approved' 
WHERE role = 'oracle' AND application_status IS NULL;
