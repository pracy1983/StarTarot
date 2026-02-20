-- Migration 1022: Final Fix for Profile Schema and Auto-Correction (v2)
-- ===================================================================

-- 1. Ensure ALL expected columns exist in profiles table
-- This prevents "column does not exist" errors in the RPC
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_oracle BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS application_status TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name_fantasy TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS categories TEXT[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS topics TEXT[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS personality TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS specialty TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 2. Update existing data to be consistent
UPDATE public.profiles SET is_oracle = true WHERE role = 'oracle' AND is_oracle = false;
UPDATE public.profiles SET is_oracle = false WHERE role != 'oracle' AND is_oracle = true;

-- 3. Final version of ensure_user_profile
-- Robust against partial failures and existing data
DROP FUNCTION IF EXISTS public.ensure_user_profile(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.ensure_user_profile(UUID, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.ensure_user_profile(
    p_user_id UUID,
    p_email TEXT,
    p_full_name TEXT,
    p_role TEXT,
    p_name_fantasy TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_profile_exists BOOLEAN;
    v_final_role TEXT;
    v_app_status TEXT;
BEGIN
    -- Detect desired role and status (matching 1016/1017 logic)
    IF p_role = 'oracle' THEN
        v_final_role := 'oracle';
        v_app_status := 'pending';
    ELSE
        v_final_role := 'client';
        v_app_status := NULL; -- Clients should have NULL status
    END IF;

    -- 1. Upsert Profile
    -- Using ON CONFLICT to handle the "already exists" case robustly
    INSERT INTO public.profiles (
        id, 
        email, 
        full_name, 
        role,
        application_status,
        name_fantasy,
        is_oracle,
        is_online,
        created_at,
        updated_at
    ) VALUES (
        p_user_id,
        LOWER(TRIM(p_email)),
        p_full_name,
        v_final_role,
        v_app_status,
        COALESCE(p_name_fantasy, p_full_name),
        (v_final_role = 'oracle'),
        false,
        now(),
        now()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = LOWER(TRIM(EXCLUDED.email)),
        full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
        role = COALESCE(profiles.role, EXCLUDED.role),
        application_status = COALESCE(profiles.application_status, EXCLUDED.application_status),
        is_oracle = CASE WHEN profiles.role = 'oracle' THEN true ELSE (EXCLUDED.role = 'oracle') END,
        updated_at = now();

    -- 2. Ensure Wallet exists
    INSERT INTO public.wallets (user_id, balance)
    VALUES (p_user_id, 0)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN jsonb_build_object('success', true, 'message', 'Profile and wallet verified/created');

EXCEPTION WHEN OTHERS THEN
    -- Return useful error for debugging
    RETURN jsonb_build_object(
        'success', false, 
        'error', SQLERRM, 
        'detail', SQLSTATE,
        'hint', 'Ensure role and application_status are TEXT or compatible'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
