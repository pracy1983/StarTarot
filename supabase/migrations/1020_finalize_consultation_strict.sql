-- Ensure finalize_video_consultation matches the application usage
-- Replacing to guarantee signature matches

DROP FUNCTION IF EXISTS public.finalize_video_consultation(UUID, INTEGER, TEXT);
DROP FUNCTION IF EXISTS public.finalize_video_consultation(UUID, NUMERIC, TEXT);

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
    -- 1. Buscar detalhes da consulta
    SELECT * INTO v_consultation FROM public.consultations WHERE id = p_consultation_id;
    
    IF NOT FOUND THEN
        -- Retorna false mas com zeros para não quebrar a desestruturação do cliente
        RETURN QUERY SELECT false, 0::DECIMAL, 0::DECIMAL;
        RETURN;
    END IF;

    -- Se já estiver finalizada, apenas retorna os valores atuais
    IF v_consultation.status IN ('answered', 'completed', 'finished') THEN
        SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_total_charged
        FROM public.transactions
        WHERE metadata->>'consultation_id' = p_consultation_id::text
          AND type = 'usage';

        SELECT COALESCE(SUM(amount), 0) INTO v_total_earned
        FROM public.transactions
        WHERE metadata->>'consultation_id' = p_consultation_id::text
          AND type = 'earnings';

        RETURN QUERY SELECT true, v_total_charged, v_total_earned;
        RETURN;
    END IF;

    -- 2. Atualizar status, duração e metadados
    UPDATE public.consultations 
    SET status = 'completed', -- Changed to 'completed' to match dashboard filters
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

    -- 3. Calcular total cobrado do cliente (Gross)
    SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_total_charged
    FROM public.transactions
    WHERE metadata->>'consultation_id' = p_consultation_id::text
      AND type = 'usage';

    -- 4. Calcular ganhos líquidos do oraculista (Net)
    SELECT COALESCE(SUM(amount), 0) INTO v_total_earned
    FROM public.transactions
    WHERE metadata->>'consultation_id' = p_consultation_id::text
      AND type = 'earnings';

    -- 5. Gravar os créditos totais na consulta para histórico rápido
    UPDATE public.consultations 
    SET total_credits = v_total_charged
    WHERE id = p_consultation_id;

    RETURN QUERY SELECT true, v_total_charged, v_total_earned;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
