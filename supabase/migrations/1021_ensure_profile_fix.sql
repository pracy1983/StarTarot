-- Migration to ensure ensure_user_profile RPC exists and is robust
-- Used for self-healing profiles when triggers fail

DROP FUNCTION IF EXISTS public.ensure_user_profile(UUID, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.ensure_user_profile(
    p_user_id UUID,
    p_email TEXT,
    p_full_name TEXT,
    p_role TEXT
) RETURNS TABLE (success BOOLEAN, message TEXT) AS $$
DECLARE
    v_profile_exists BOOLEAN;
BEGIN
    -- 1. Check if profile already exists
    SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) INTO v_profile_exists;

    IF v_profile_exists THEN
        -- Optional: Ensure wallet exists too
        INSERT INTO public.wallets (user_id, balance)
        VALUES (p_user_id, 0)
        ON CONFLICT (user_id) DO NOTHING;

        RETURN QUERY SELECT true, 'Profile already exists';
        RETURN;
    END IF;

    -- 2. Create Profile
    INSERT INTO public.profiles (
        id, 
        email, 
        full_name, 
        role,
        application_status,
        name_fantasy,
        is_oracle
    ) VALUES (
        p_user_id,
        p_email,
        p_full_name,
        p_role,
        CASE WHEN p_role = 'oracle' THEN 'pending' ELSE 'approved' END,
        CASE WHEN p_role = 'oracle' THEN p_full_name ELSE NULL END, -- Default fantasy name
        CASE WHEN p_role = 'oracle' THEN true ELSE false END
    );

    -- 3. Create Wallet
    INSERT INTO public.wallets (user_id, balance)
    VALUES (p_user_id, 0)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN QUERY SELECT true, 'Profile created successfully';

EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
