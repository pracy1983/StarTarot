-- Migration 1033: Correções no fluxo de autenticação
-- 1. OTP de cadastro passa a ser gerado/validado no servidor (tabela própria)
-- 2. Nova RPC check_password_reset_otp: valida SEM consumir o código
--    (o fluxo da UI valida no passo 2 e o complete-reset validava de novo no
--    passo 3 — mas o código já tinha sido marcado como usado, quebrando 100%
--    dos resets de senha)
-- 3. verify_password_reset_otp tolerante a formato de telefone (igual ao
--    request_password_reset, que aceita com/sem '+' e DDI)

-- ============================================================
-- 1. Tabela de OTPs de verificação de telefone (cadastro)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.phone_verification_otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT NOT NULL, -- somente dígitos, com DDI
    otp_code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_phone_verification_otps_phone
    ON public.phone_verification_otps (phone, created_at DESC);

-- RLS sem policies: apenas service role (rotas de API) acessa
ALTER TABLE public.phone_verification_otps ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. RPC de checagem que NÃO consome o código (passo 2 da UI)
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

    SELECT id INTO v_user_id FROM public.profiles
    WHERE regexp_replace(COALESCE(phone, ''), '\D', '', 'g') = v_digits
       OR RIGHT(regexp_replace(COALESCE(phone, ''), '\D', '', 'g'), 11) = RIGHT(v_digits, 11)
    LIMIT 1;

    IF v_user_id IS NULL THEN
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
        RETURN jsonb_build_object('success', false, 'error', 'Código inválido ou expirado');
    END IF;

    RETURN jsonb_build_object('success', true, 'user_id', v_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 3. verify_password_reset_otp tolerante a formato de telefone
--    (consome o código — usado apenas no passo final, complete-reset)
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

    SELECT id INTO v_user_id FROM public.profiles
    WHERE regexp_replace(COALESCE(phone, ''), '\D', '', 'g') = v_digits
       OR RIGHT(regexp_replace(COALESCE(phone, ''), '\D', '', 'g'), 11) = RIGHT(v_digits, 11)
    LIMIT 1;

    IF v_user_id IS NULL THEN
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
        RETURN jsonb_build_object('success', false, 'error', 'Código inválido ou expirado');
    END IF;

    UPDATE public.password_reset_otps SET is_used = true WHERE id = v_otp_id;

    RETURN jsonb_build_object('success', true, 'user_id', v_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
