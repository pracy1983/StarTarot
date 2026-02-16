-- Ensure users can insert their own profile (for manual fallback)
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Ensure users can insert their own wallet
DROP POLICY IF EXISTS "Users can insert their own wallet" ON public.wallets;
CREATE POLICY "Users can insert their own wallet" 
ON public.wallets 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Verify grants just in case
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.wallets TO authenticated;

-- Add a function to safely ensure profile exists (used in self-healing)
CREATE OR REPLACE FUNCTION public.ensure_user_profile(
    p_user_id UUID,
    p_email TEXT,
    p_full_name TEXT DEFAULT NULL,
    p_role TEXT DEFAULT 'client'
) RETURNS JSONB AS $$
DECLARE
    v_profile_exists BOOLEAN;
    v_wallet_exists BOOLEAN;
    v_role public.user_role;
BEGIN
    -- Cast role safely
    BEGIN
        v_role := p_role::public.user_role;
    EXCEPTION WHEN OTHERS THEN
        v_role := 'client';
    END;

    -- 1. Upsert Profile
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (p_user_id, p_email, COALESCE(p_full_name, 'Usuário'), v_role)
    ON CONFLICT (id) DO UPDATE 
    SET email = EXCLUDED.email
    WHERE profiles.id = p_user_id;

    -- 2. Upsert Wallet
    INSERT INTO public.wallets (user_id, balance)
    VALUES (p_user_id, 0)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
