-- Migration to add suspension capability
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ;

-- Index for querying active/suspended users
CREATE INDEX IF NOT EXISTS idx_profiles_suspended_until ON public.profiles(suspended_until);
