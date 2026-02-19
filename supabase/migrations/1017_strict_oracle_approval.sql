-- Migration 1017: name_fantasy separation and strict oracle workflow
-- =================================================================

-- 1. Initialize name_fantasy with full_name for current oracles who don't have it
-- Note: name_fantasy already exists in the table as per user feedback
UPDATE public.profiles 
SET name_fantasy = full_name 
WHERE role = 'oracle' AND (name_fantasy IS NULL OR name_fantasy = '');

-- 2. Stricter Trigger to enforce Oracle Pending Status and RESET on changes
CREATE OR REPLACE FUNCTION public.enforce_oracle_application_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Only apply logic to oracles
    IF NEW.role = 'oracle' THEN
        
        -- A: If changing role FROM client TO oracle, FORCE 'pending'
        IF (TG_OP = 'UPDATE' AND OLD.role != 'oracle') OR (TG_OP = 'INSERT') THEN
            NEW.application_status := 'pending';
        END IF;

        -- B: Reset to 'pending' if critical fields change and status was 'approved'
        -- (This ensures the admin must re-check significant bio/name changes)
        -- We EXCLUDE changes where the status itself is being transitioned by admin
        
        IF (TG_OP = 'UPDATE' AND OLD.application_status = 'approved' AND NEW.application_status = 'approved') THEN
            -- Check if significant fields changed
            IF (OLD.full_name IS DISTINCT FROM NEW.full_name) OR 
               (OLD.name_fantasy IS DISTINCT FROM NEW.name_fantasy) OR
               (OLD.bio IS DISTINCT FROM NEW.bio) OR
               (OLD.categories IS DISTINCT FROM NEW.categories) OR
               (OLD.topics IS DISTINCT FROM NEW.topics) OR
               (OLD.price_per_message IS DISTINCT FROM NEW.price_per_message)
            THEN
                NEW.application_status := 'pending';
                NEW.updated_at := now();
            END IF;
        END IF;

        -- C: Strict fallback for any null/invalid status for oracles
        IF NEW.application_status IS NULL OR NEW.application_status NOT IN ('approved', 'rejected', 'waitlist', 'pending') THEN
            NEW.application_status := 'pending';
        END IF;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Re-apply the trigger
DROP TRIGGER IF EXISTS tr_enforce_oracle_status ON public.profiles;
CREATE TRIGGER tr_enforce_oracle_status
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_oracle_application_status();

-- 4. Updated update_oracle_application with name_fantasy
CREATE OR REPLACE FUNCTION public.update_oracle_application(
    p_full_name TEXT,
    p_name_fantasy TEXT,
    p_categories TEXT[],
    p_topics TEXT[],
    p_bio TEXT,
    p_personality TEXT,
    p_phone TEXT,
    p_custom_category TEXT DEFAULT NULL,
    p_custom_topic TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    UPDATE public.profiles
    SET 
        full_name = p_full_name,
        name_fantasy = p_name_fantasy,
        categories = p_categories,
        topics = p_topics,
        custom_category = p_custom_category,
        custom_topic = p_custom_topic,
        bio = p_bio,
        personality = p_personality,
        phone = p_phone,
        application_status = 'pending',
        role = 'oracle',
        updated_at = now()
    WHERE id = v_user_id;

    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 5. Updated ensure_user_profile for initial registration
DROP FUNCTION IF EXISTS public.ensure_user_profile(uuid, text, text, text);

CREATE OR REPLACE FUNCTION public.ensure_user_profile(
    p_user_id UUID,
    p_email TEXT,
    p_full_name TEXT,
    p_role TEXT,
    p_name_fantasy TEXT DEFAULT NULL
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
    SELECT id INTO v_profile_id FROM public.profiles WHERE id = p_user_id;
    
    IF v_profile_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', true, 'message', 'Profile already exists');
    END IF;

    IF p_role = 'oracle' THEN
        v_final_role := 'oracle';
        v_app_status := 'pending';
    ELSE
        v_final_role := 'client';
        v_app_status := NULL;
    END IF;

    INSERT INTO public.profiles (
        id, 
        email, 
        full_name, 
        name_fantasy,
        role, 
        application_status,
        is_online,
        created_at,
        updated_at
    ) VALUES (
        p_user_id,
        p_email,
        p_full_name,
        COALESCE(p_name_fantasy, p_full_name),
        v_final_role,
        v_app_status,
        false,
        now(),
        now()
    );

    INSERT INTO public.wallets (user_id, balance)
    VALUES (p_user_id, 0)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
