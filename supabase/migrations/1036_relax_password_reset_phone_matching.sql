-- Migration 1036: make password reset phone matching tolerant to masks and BR mobile variants
-- Fixes reset failures when profiles store phone with punctuation, with/without +55,
-- or with/without the Brazilian ninth mobile digit after DDD.

CREATE OR REPLACE FUNCTION public._phone_digits(p_phone TEXT)
RETURNS TEXT AS $$
    SELECT regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g');
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION public._phone_br_local_digits(p_phone TEXT)
RETURNS TEXT AS $$
    SELECT CASE
        WHEN public._phone_digits(p_phone) LIKE '55%' AND length(public._phone_digits(p_phone)) IN (12, 13)
            THEN substring(public._phone_digits(p_phone) FROM 3)
        ELSE public._phone_digits(p_phone)
    END;
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION public._phone_br_without_ninth_digit(p_phone TEXT)
RETURNS TEXT AS $$
    SELECT CASE
        WHEN length(public._phone_br_local_digits(p_phone)) = 11
             AND substring(public._phone_br_local_digits(p_phone) FROM 3 FOR 1) = '9'
            THEN substring(public._phone_br_local_digits(p_phone) FROM 1 FOR 2)
                 || substring(public._phone_br_local_digits(p_phone) FROM 4)
        ELSE public._phone_br_local_digits(p_phone)
    END;
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION public._phone_matches(p_saved_phone TEXT, p_input_phone TEXT)
RETURNS BOOLEAN AS $$
    SELECT public._phone_digits(p_saved_phone) = public._phone_digits(p_input_phone)
        OR RIGHT(public._phone_digits(p_saved_phone), 11) = RIGHT(public._phone_digits(p_input_phone), 11)
        OR public._phone_br_local_digits(p_saved_phone) = public._phone_br_local_digits(p_input_phone)
        OR public._phone_br_without_ninth_digit(p_saved_phone) = public._phone_br_without_ninth_digit(p_input_phone);
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.request_password_reset(
    p_email TEXT,
    p_phone TEXT,
    p_otp_code TEXT,
    p_expires_at TIMESTAMPTZ
) RETURNS JSONB AS $$
DECLARE
    v_user_profile RECORD;
BEGIN
    SELECT id, full_name, phone INTO v_user_profile
    FROM public.profiles
    WHERE LOWER(TRIM(email)) = LOWER(TRIM(p_email))
      AND public._phone_matches(phone, p_phone)
    LIMIT 1;

    IF v_user_profile IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Dados não conferem. Verifique seu e-mail e telefone.');
    END IF;

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

CREATE OR REPLACE FUNCTION public.check_password_reset_otp(
    p_phone TEXT,
    p_otp_code TEXT
) RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_otp_id UUID;
    v_digits TEXT;
BEGIN
    v_digits := public._phone_digits(p_phone);

    IF public._otp_is_locked(v_digits) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Muitas tentativas. Tente novamente mais tarde.');
    END IF;

    SELECT id INTO v_user_id
    FROM public.profiles
    WHERE public._phone_matches(phone, p_phone)
    LIMIT 1;

    IF v_user_id IS NULL THEN
        PERFORM public._otp_register_failure(v_digits);
        RETURN jsonb_build_object('success', false, 'error', 'Usuário não encontrado');
    END IF;

    SELECT id INTO v_otp_id
    FROM public.password_reset_otps
    WHERE user_id = v_user_id
      AND otp_code = p_otp_code
      AND is_used = false
      AND expires_at > now()
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_otp_id IS NULL THEN
        PERFORM public._otp_register_failure(v_digits);
        RETURN jsonb_build_object('success', false, 'error', 'Código inválido ou expirado');
    END IF;

    PERFORM public._otp_clear_failures(v_digits);
    RETURN jsonb_build_object('success', true, 'user_id', v_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.verify_password_reset_otp(
    p_phone TEXT,
    p_otp_code TEXT
) RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_otp_id UUID;
    v_digits TEXT;
BEGIN
    v_digits := public._phone_digits(p_phone);

    IF public._otp_is_locked(v_digits) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Muitas tentativas. Tente novamente mais tarde.');
    END IF;

    SELECT id INTO v_user_id
    FROM public.profiles
    WHERE public._phone_matches(phone, p_phone)
    LIMIT 1;

    IF v_user_id IS NULL THEN
        PERFORM public._otp_register_failure(v_digits);
        RETURN jsonb_build_object('success', false, 'error', 'Usuário não encontrado');
    END IF;

    SELECT id INTO v_otp_id
    FROM public.password_reset_otps
    WHERE user_id = v_user_id
      AND otp_code = p_otp_code
      AND is_used = false
      AND expires_at > now()
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_otp_id IS NULL THEN
        PERFORM public._otp_register_failure(v_digits);
        RETURN jsonb_build_object('success', false, 'error', 'Código inválido ou expirado');
    END IF;

    UPDATE public.password_reset_otps SET is_used = true WHERE id = v_otp_id;
    PERFORM public._otp_clear_failures(v_digits);

    RETURN jsonb_build_object('success', true, 'user_id', v_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
