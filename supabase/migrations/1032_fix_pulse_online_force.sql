-- Migration: 1032 Fix Pulse Online Force
-- ===========================================

-- 1. Modify the function to NOT force is_online = true
-- This allows oracles to send heartbeat (showing they are technically connected) 
-- without actually appearing as "Online Agora" to clients if they chose to be offline.
CREATE OR REPLACE FUNCTION public.update_oracle_heartbeat(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.profiles 
    SET last_heartbeat_at = now()
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
