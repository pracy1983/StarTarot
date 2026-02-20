-- Migration 1023: Strong Password & Reset Flow
-- =============================================

-- 1. Add force_password_change flag to profiles
-- Default is TRUE to ensure everyone updates their password to a strong one initially
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN DEFAULT true;

-- 2. Create table for password reset OTPs via WhatsApp
CREATE TABLE IF NOT EXISTS public.password_reset_otps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    otp_code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    is_used BOOLEAN DEFAULT false
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_user ON public.password_reset_otps(user_id);

-- 3. Security: RLS for password_reset_otps
ALTER TABLE public.password_reset_otps ENABLE ROW LEVEL SECURITY;

-- Only service role or specific flows should access this (usually handled via RPC)
CREATE POLICY "Service role only access" 
ON public.password_reset_otps 
FOR ALL TO service_role USING (true);

-- 4. RPC to verify OTP and facilitate password update
-- This function verifies the OTP and returns the user's ID if valid
CREATE OR REPLACE FUNCTION public.verify_password_reset_otp(
    p_phone TEXT,
    p_otp_code TEXT
) RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_otp_id UUID;
BEGIN
    -- Find the user by phone
    SELECT id INTO v_user_id FROM public.profiles WHERE phone = p_phone LIMIT 1;
    
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Usuário não encontrado');
    END IF;

    -- Check for valid, unused, and non-expired OTP
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

    -- Mark OTP as used
    UPDATE public.password_reset_otps SET is_used = true WHERE id = v_otp_id;

    RETURN jsonb_build_object('success', true, 'user_id', v_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
