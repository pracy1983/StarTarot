-- Migration: Add heartbeat support for oracles
-- ===========================================

-- 1. Add last_heartbeat_at to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ DEFAULT now();

-- 2. Index for performance on marketplace queries
CREATE INDEX IF NOT EXISTS idx_profiles_heartbeat ON public.profiles (is_online, last_heartbeat_at) 
WHERE role IN ('oracle', 'owner') AND application_status = 'approved';

-- 3. Function to update heartbeat (RPC)
CREATE OR REPLACE FUNCTION public.update_oracle_heartbeat(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.profiles 
    SET last_heartbeat_at = now(),
        is_online = true -- Ensure online if heartbeating
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
