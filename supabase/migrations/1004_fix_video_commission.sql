-- Migration: Update deduct_video_fee to apply commission
-- ========================================================

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
    v_oracle_amount DECIMAL;
BEGIN
    -- 1. Fetch commission percentage from global settings
    SELECT CAST(value AS INTEGER) INTO v_commission_pc 
    FROM public.global_settings 
    WHERE key = 'oracle_commission_pc';

    IF v_commission_pc IS NULL THEN
        v_commission_pc := 70; -- Fallback
    END IF;

    -- 2. Calculate oracle's net amount
    v_oracle_amount := FLOOR(amount * (v_commission_pc / 100.0));

    -- THRESHOLD: In case we want to support 100% for specific cases, 
    -- but user said "descontado a porcentagem da casa".

    -- 3. Define description
    IF is_initial THEN
        description_text := 'Taxa inicial de vídeo consulta';
    ELSE
        description_text := 'Minuto de vídeo consulta';
    END IF;

    -- 4. Deduct full balance from client
    UPDATE public.wallets 
    SET balance = balance - amount,
        updated_at = now()
    WHERE user_id = client_id;

    -- 5. Add net amount to oracle (Earnings)
    UPDATE public.wallets 
    SET balance = balance + v_oracle_amount,
        updated_at = now()
    WHERE user_id = oracle_id;

    -- 6. Record debit transaction (Client)
    INSERT INTO public.transactions (
        user_id, amount, type, description, status, metadata
    ) VALUES (
        client_id, -amount, 'usage', description_text, 'confirmed', 
        jsonb_build_object(
            'consultation_id', consultation_id, 
            'mode', 'video', 
            'is_initial', is_initial,
            'oracle_id', oracle_id
        )
    );

    -- 7. Record earnings transaction (Oracle)
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
