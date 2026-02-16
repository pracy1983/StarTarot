-- Migration 030: Update deduct_video_fee to support is_initial
-- =========================================================

CREATE OR REPLACE FUNCTION public.deduct_video_fee(
    client_id UUID,
    oracle_id UUID,
    amount DECIMAL,
    consultation_id UUID,
    is_initial BOOLEAN DEFAULT false
) RETURNS VOID AS $$
DECLARE
    description_text TEXT;
BEGIN
    -- 1. Definir descrição
    IF is_initial THEN
        description_text := 'Taxa inicial de vídeo consulta';
    ELSE
        description_text := 'Minuto de vídeo consulta';
    END IF;

    -- 2. Deduzir saldo do cliente
    UPDATE public.wallets 
    SET balance = balance - amount,
        updated_at = now()
    WHERE user_id = client_id;

    -- 3. Adicionar saldo ao oráculo (Earnings)
    UPDATE public.wallets 
    SET balance = balance + amount,
        updated_at = now()
    WHERE user_id = oracle_id;

    -- 4. Registrar transação de débito (Cliente)
    INSERT INTO public.transactions (
        user_id, amount, type, description, status, metadata
    ) VALUES (
        client_id, -amount, 'usage', description_text, 'confirmed', 
        jsonb_build_object('consultation_id', consultation_id, 'mode', 'video', 'is_initial', is_initial)
    );

    -- 5. Registrar transação de crédito (Oráculo)
    INSERT INTO public.transactions (
        user_id, amount, type, description, status, metadata
    ) VALUES (
        oracle_id, amount, 'earnings', 'Ganho por ' || LOWER(description_text), 'confirmed', 
        jsonb_build_object('consultation_id', consultation_id, 'mode', 'video', 'is_initial', is_initial)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.deduct_video_fee IS 'Deducts credits for video consultations (initial fee or per-minute)';
