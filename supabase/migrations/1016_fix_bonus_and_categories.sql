-- Migration 1016: Fix Bonus, Enforce Role Safety, and Fix Categories
-- =================================================================

-- 1. Update Signup Bonus to 50
INSERT INTO public.global_settings (key, value, description)
VALUES ('signup_bonus_credits', '50', 'Créditos de bônus ao cadastrar')
ON CONFLICT (key) DO UPDATE SET value = '50';

-- 2. Improve ensure_user_profile to prevent auto-oracle approval
DROP FUNCTION IF EXISTS public.ensure_user_profile(uuid, text, text, text);

CREATE OR REPLACE FUNCTION public.ensure_user_profile(
    p_user_id UUID,
    p_email TEXT,
    p_full_name TEXT,
    p_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_profile_id UUID;
    v_final_role TEXT;
    v_app_status TEXT;
BEGIN
    -- Check if profile already exists
    SELECT id INTO v_profile_id FROM public.profiles WHERE id = p_user_id;
    
    IF v_profile_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', true, 'message', 'Profile already exists');
    END IF;

    -- Safety Check: If role is 'oracle', force status to 'pending'
    -- If role is 'owner' or 'admin', force to 'client' (safety first, admin must promote manually in DB)
    
    IF p_role = 'oracle' THEN
        v_final_role := 'oracle';
        v_app_status := 'pending'; -- FORCE PENDING
    ELSIF p_role = 'owner' THEN
         -- Prevent creating owners via public RPC
        v_final_role := 'client';
        v_app_status := NULL;
    ELSE
        v_final_role := 'client';
        v_app_status := NULL;
    END IF;

    -- Create Profile
    INSERT INTO public.profiles (
        id, 
        email, 
        full_name, 
        role, 
        application_status,
        is_online,
        created_at,
        updated_at
    ) VALUES (
        p_user_id,
        p_email,
        p_full_name,
        v_final_role,
        v_app_status,
        false,
        now(),
        now()
    );

    -- Create Wallet (Trigger tr_signup_bonus will handle the bonus)
    INSERT INTO public.wallets (user_id, balance)
    VALUES (p_user_id, 0)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 3. Trigger to ENFORCE pending status on any profile change/insert to 'oracle'
-- This catches cases where the user is created via the Auth Trigger (handle_new_user) 
-- and not just the RPC above.

CREATE OR REPLACE FUNCTION public.enforce_oracle_application_status()
RETURNS TRIGGER AS $$
BEGIN
    -- If role is oracle
    IF NEW.role = 'oracle' THEN
        -- And status is null or empty
        IF NEW.application_status IS NULL OR NEW.application_status = '' THEN
            NEW.application_status := 'pending';
        END IF;
        
        -- If it was previously a client and is becoming an oracle, force pending
        -- (Unless it's being updated by an admin - difficult to check here without extensive RLS/Context)
        -- Ideally we assume the APP sets 'approved' explicitly if it's an admin action.
        -- But for self-registration, it defaults to null/pending.
        
        -- Safe bet: If changing to oracle and status is NOT 'approved' or 'rejected', make it 'pending'.
        IF NEW.application_status NOT IN ('approved', 'rejected', 'waitlist', 'pending') THEN
            NEW.application_status := 'pending';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_enforce_oracle_status ON public.profiles;
CREATE TRIGGER tr_enforce_oracle_status
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_oracle_application_status();
