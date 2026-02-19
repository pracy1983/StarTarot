-- Migration to ensure ensure_user_profile RPC exists and is robust
-- Used for self-healing profiles when triggers fail
-- This version returns JSONB to match frontend expectations in authStore.ts

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
BEGIN
    -- 1. Check if profile already exists
    SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) INTO v_profile_exists;

    IF v_profile_exists THEN
        -- Ensure wallet exists
        INSERT INTO public.wallets (user_id, balance)
        VALUES (p_user_id, 0)
        ON CONFLICT (user_id) DO NOTHING;

        RETURN jsonb_build_object('success', true, 'message', 'Profile already exists');
    END IF;

    -- 2. Create Profile
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
        p_email,
        p_full_name,
        p_role,
        CASE WHEN p_role = 'oracle' THEN 'pending' ELSE 'approved' END,
        COALESCE(p_name_fantasy, p_full_name),
        CASE WHEN p_role = 'oracle' THEN true ELSE false END,
        false,
        now(),
        now()
    );

    -- 3. Create Wallet
    INSERT INTO public.wallets (user_id, balance)
    VALUES (p_user_id, 0)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN jsonb_build_object('success', true, 'message', 'Profile created successfully');

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
