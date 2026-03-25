-- Migration: Update billing to use consultation_charge and ensure integer amounts
-- =========================================================================

-- 1. Update deduct_video_fee
CREATE OR REPLACE FUNCTION public.deduct_video_fee(
    client_id UUID,
    oracle_id UUID,
    amount DECIMAL,
    consultation_id UUID,
    is_initial BOOLEAN DEFAULT false
) RETURNS VOID AS $$
DECLARE
    description_text TEXT;
    v_commission_pc INTEGER;
    v_oracle_amount INTEGER; -- Changed to INTEGER
BEGIN
    -- Fetch commission percentage
    SELECT CAST(value AS INTEGER) INTO v_commission_pc 
    FROM public.global_settings 
    WHERE key = 'oracle_commission_pc';

    IF v_commission_pc IS NULL THEN
        v_commission_pc := 70;
    END IF;

    -- Calculate oracle's net amount (as integer)
    v_oracle_amount := FLOOR(amount * (v_commission_pc / 100.0))::INTEGER;

    -- Define description
    IF is_initial THEN
        description_text := 'Taxa inicial de vídeo consulta';
    ELSE
        description_text := 'Minuto de vídeo consulta';
    END IF;

    -- Deduct from client
    UPDATE public.wallets 
    SET balance = balance - amount::INTEGER, -- Ensure integer
        updated_at = now()
    WHERE user_id = client_id;

    -- Add to oracle
    UPDATE public.wallets 
    SET balance = balance + v_oracle_amount,
        updated_at = now()
    WHERE user_id = oracle_id;

    -- Record debit (Client) - Using 'consultation_charge' for better compatibility
    INSERT INTO public.transactions (
        user_id, amount, type, description, status, metadata
    ) VALUES (
        client_id, -(amount::INTEGER), 'consultation_charge', description_text, 'confirmed', 
        jsonb_build_object(
            'consultation_id', consultation_id, 
            'mode', 'video', 
            'is_initial', is_initial,
            'oracle_id', oracle_id
        )
    );

    -- Record earnings (Oracle)
    INSERT INTO public.transactions (
        user_id, amount, type, description, status, metadata
    ) VALUES (
        oracle_id, v_oracle_amount, 'earnings', 'Ganho por ' || LOWER(description_text), 'confirmed', 
        jsonb_build_object(
            'consultation_id', consultation_id, 
            'mode', 'video', 
            'is_initial', is_initial,
            'client_id', client_id,
            'commission_pc', v_commission_pc,
            'total_charged', amount
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Update finalize_video_consultation to look for 'consultation_charge'
CREATE OR REPLACE FUNCTION public.finalize_video_consultation(
    p_consultation_id UUID,
    p_duration_seconds INTEGER,
    p_end_reason TEXT
) RETURNS TABLE (
    success BOOLEAN,
    total_credits DECIMAL,
    oracle_earnings DECIMAL
) AS $$
DECLARE
    v_consultation RECORD;
    v_total_charged DECIMAL;
    v_total_earned DECIMAL;
BEGIN
    SELECT * INTO v_consultation FROM public.consultations WHERE id = p_consultation_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 0::DECIMAL, 0::DECIMAL;
        RETURN;
    END IF;

    -- Se já estiver finalizada, apenas retorna os valores atuais
    IF v_consultation.status IN ('answered', 'completed', 'finished') THEN
        SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_total_charged
        FROM public.transactions
        WHERE metadata->>'consultation_id' = p_consultation_id::text
          AND type = 'consultation_charge'; -- Updated type

        SELECT COALESCE(SUM(amount), 0) INTO v_total_earned
        FROM public.transactions
        WHERE metadata->>'consultation_id' = p_consultation_id::text
          AND type = 'earnings';

        RETURN QUERY SELECT true, v_total_charged, v_total_earned;
        RETURN;
    END IF;

    -- Atualizar status
    UPDATE public.consultations 
    SET status = 'completed',
        duration_seconds = p_duration_seconds,
        ended_at = now(),
        metadata = jsonb_set(
            COALESCE(metadata, '{}'::jsonb), 
            '{end_info}', 
            jsonb_build_object(
                'reason', p_end_reason, 
                'ended_by_id', auth.uid(),
                'ended_at', now()
            )
        )
    WHERE id = p_consultation_id;

    -- Calcular totais
    SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_total_charged
    FROM public.transactions
    WHERE metadata->>'consultation_id' = p_consultation_id::text
      AND type = 'consultation_charge'; -- Updated type

    SELECT COALESCE(SUM(amount), 0) INTO v_total_earned
    FROM public.transactions
    WHERE metadata->>'consultation_id' = p_consultation_id::text
      AND type = 'earnings';

    UPDATE public.consultations 
    SET total_credits = v_total_charged
    WHERE id = p_consultation_id;

    RETURN QUERY SELECT true, v_total_charged, v_total_earned;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
