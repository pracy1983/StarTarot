-- Migration: Add service flags to profiles
-- =======================================

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS allows_video BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS allows_text BOOLEAN DEFAULT true;

-- Update IA oracles to only allow text by default
UPDATE public.profiles 
SET allows_video = false, 
    allows_text = true 
WHERE oracle_type = 'ai';
