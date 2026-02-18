-- Function to safely update profile and set to Oracle application state
-- Helps avoid RLS issues when a simple client tries to update restricted fields

CREATE OR REPLACE FUNCTION public.update_oracle_application(
    p_full_name TEXT,
    p_specialty TEXT,
    p_bio TEXT,
    p_personality TEXT,
    p_phone TEXT,
    p_custom_specialty TEXT DEFAULT NULL
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
        specialty = p_specialty,
        bio = p_bio,
        personality = p_personality,
        phone = p_phone,
        custom_specialty = p_custom_specialty,
        application_status = 'pending',
        role = 'oracle',
        updated_at = now()
    WHERE id = v_user_id;

    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
