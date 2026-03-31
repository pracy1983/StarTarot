
-- Migration 1029: Create RPC for password reset request
-- This avoids RLS issues when an anonymous user needs to initiate a reset

CREATE OR REPLACE FUNCTION public.request_password_reset(
    p_email TEXT,
    p_phone TEXT,
    p_otp_code TEXT,
    p_expires_at TIMESTAMPTZ
) RETURNS JSONB AS $$
DECLARE
    v_user_profile RECORD;
BEGIN
    -- 1. Validate if user exists with this email AND phone
    SELECT id, full_name, phone INTO v_user_profile 
    FROM public.profiles 
    WHERE email = LOWER(TRIM(p_email))
      AND (
        phone = p_phone 
        OR phone = '+' || p_phone 
        OR phone = REPLACE(p_phone, '+', '')
        OR phone = RIGHT(p_phone, 11)
        OR RIGHT(phone, 11) = RIGHT(p_phone, 11)
      )
    LIMIT 1;

    IF v_user_profile IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Dados não conferem. Verifique seu e-mail e telefone.');
    END IF;

    -- 2. Insert the OTP (SECURITY DEFINER allows this to bypass RLS)
    INSERT INTO public.password_reset_otps (user_id, otp_code, expires_at)
    VALUES (v_user_profile.id, p_otp_code, p_expires_at);

    RETURN jsonb_build_object(
        'success', true, 
        'user_id', v_user_profile.id, 
        'full_name', v_user_profile.full_name,
        'user_phone', v_user_profile.phone
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
