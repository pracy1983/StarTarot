-- Migration 1034: Rate limiting na verificação de OTP de reset de senha
-- ============================================================
-- O código de reset tem só 6 dígitos (1.000.000 de combinações) e fica válido
-- por 15 min. Sem limite de tentativas, dá para forçá-lo por força bruta.
-- Como check_password_reset_otp é chamado direto do navegador (chave anon),
-- o limite PRECISA viver no banco para ser efetivo (a rota de API não cobre
-- chamadas diretas à RPC).
--
-- Estratégia: contar tentativas FALHAS por telefone numa janela de tempo.
-- Após N falhas, bloqueia por um período. Acerto limpa o contador.

-- ============================================================
-- 1. Tabela de tentativas (apenas SECURITY DEFINER / service role acessam)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.password_reset_attempts (
    phone TEXT PRIMARY KEY,                 -- somente dígitos
    attempt_count INTEGER NOT NULL DEFAULT 0,
    window_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    locked_until TIMESTAMPTZ
);

ALTER TABLE public.password_reset_attempts ENABLE ROW LEVEL SECURITY;
-- Sem policies de propósito: ninguém acessa via PostgREST; apenas as funções
-- SECURITY DEFINER abaixo (que rodam como owner) e o service role.

-- ============================================================
-- 2. Helpers de rate limit
-- ============================================================
-- Parâmetros: 5 tentativas por janela de 15 min; bloqueio de 30 min ao estourar.

-- Retorna TRUE se o telefone está atualmente BLOQUEADO.
CREATE OR REPLACE FUNCTION public._otp_is_locked(p_digits TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_locked_until TIMESTAMPTZ;
BEGIN
    SELECT locked_until INTO v_locked_until
    FROM public.password_reset_attempts
    WHERE phone = p_digits;

    RETURN (v_locked_until IS NOT NULL AND v_locked_until > now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Registra uma tentativa FALHA. Bloqueia se exceder o máximo na janela.
CREATE OR REPLACE FUNCTION public._otp_register_failure(p_digits TEXT)
RETURNS VOID AS $$
DECLARE
    v_max INTEGER := 5;
    v_window INTERVAL := INTERVAL '15 minutes';
    v_lock INTERVAL := INTERVAL '30 minutes';
    v_rec public.password_reset_attempts%ROWTYPE;
BEGIN
    SELECT * INTO v_rec
    FROM public.password_reset_attempts
    WHERE phone = p_digits;

    IF v_rec.phone IS NULL THEN
        INSERT INTO public.password_reset_attempts (phone, attempt_count, window_started_at)
        VALUES (p_digits, 1, now());
        RETURN;
    END IF;

    -- Janela expirou → reinicia a contagem
    IF v_rec.window_started_at < now() - v_window THEN
        UPDATE public.password_reset_attempts
        SET attempt_count = 1, window_started_at = now(), locked_until = NULL
        WHERE phone = p_digits;
        RETURN;
    END IF;

    -- Incrementa e bloqueia se estourar
    UPDATE public.password_reset_attempts
    SET attempt_count = v_rec.attempt_count + 1,
        locked_until = CASE
            WHEN v_rec.attempt_count + 1 >= v_max THEN now() + v_lock
            ELSE locked_until
        END
    WHERE phone = p_digits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Limpa o contador (chamado em acerto).
CREATE OR REPLACE FUNCTION public._otp_clear_failures(p_digits TEXT)
RETURNS VOID AS $$
BEGIN
    DELETE FROM public.password_reset_attempts WHERE phone = p_digits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 3. check_password_reset_otp com rate limit (NÃO consome o código)
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_password_reset_otp(
    p_phone TEXT,
    p_otp_code TEXT
) RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_otp_id UUID;
    v_digits TEXT;
BEGIN
    v_digits := regexp_replace(p_phone, '\D', '', 'g');

    IF public._otp_is_locked(v_digits) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Muitas tentativas. Tente novamente mais tarde.');
    END IF;

    SELECT id INTO v_user_id FROM public.profiles
    WHERE regexp_replace(COALESCE(phone, ''), '\D', '', 'g') = v_digits
       OR RIGHT(regexp_replace(COALESCE(phone, ''), '\D', '', 'g'), 11) = RIGHT(v_digits, 11)
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

-- ============================================================
-- 4. verify_password_reset_otp com rate limit (CONSOME o código)
-- ============================================================
CREATE OR REPLACE FUNCTION public.verify_password_reset_otp(
    p_phone TEXT,
    p_otp_code TEXT
) RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_otp_id UUID;
    v_digits TEXT;
BEGIN
    v_digits := regexp_replace(p_phone, '\D', '', 'g');

    IF public._otp_is_locked(v_digits) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Muitas tentativas. Tente novamente mais tarde.');
    END IF;

    SELECT id INTO v_user_id FROM public.profiles
    WHERE regexp_replace(COALESCE(phone, ''), '\D', '', 'g') = v_digits
       OR RIGHT(regexp_replace(COALESCE(phone, ''), '\D', '', 'g'), 11) = RIGHT(v_digits, 11)
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
