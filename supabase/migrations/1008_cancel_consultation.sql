-- Migration: Cancelamento e Reembolso de Consultas Pendentes
-- ========================================================

-- 1. Função para cancelar consulta pendente (Pelo Cliente ou Timeout)
CREATE OR REPLACE FUNCTION public.cancel_pending_consultation(
    p_consultation_id UUID,
    p_reason TEXT DEFAULT 'canceled_by_client'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_consultation RECORD;
    v_client_wallet RECORD;
    v_charge_txn RECORD;
    v_new_balance DECIMAL;
BEGIN
    -- Obter e bloquear a consulta
    SELECT * INTO v_consultation
    FROM public.consultations
    WHERE id = p_consultation_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Consultation not found');
    END IF;

    -- Verificar status
    IF v_consultation.status NOT IN ('pending', 'waiting_oracle') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Consultation is not pending');
    END IF;

    -- Verificar se o usuário que chama é o cliente ou admin (ou sistema via timeout)
    -- Se for 'canceled_by_timeout', ignoramos auth.uid()
    IF p_reason != 'canceled_by_timeout' AND auth.uid() != v_consultation.client_id AND auth.uid() NOT IN (SELECT id FROM profiles WHERE role = 'owner') THEN
         RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
    END IF;

    -- 1. Estornar Créditos para o Cliente
    SELECT * INTO v_client_wallet FROM public.wallets WHERE user_id = v_consultation.client_id FOR UPDATE;
    
    IF NOT FOUND THEN
         -- Should verify wallet existence
         RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
    END IF;

    v_new_balance := v_client_wallet.balance + v_consultation.total_credits;

    UPDATE public.wallets
    SET balance = v_new_balance,
        updated_at = now()
    WHERE user_id = v_consultation.client_id;

    -- 2. Registrar Transação de Estorno
    INSERT INTO public.transactions (
        user_id,
        type,
        amount,
        status,
        description,
        metadata
    ) VALUES (
        v_consultation.client_id,
        'refund',
        v_consultation.total_credits,
        'confirmed',
        CASE WHEN p_reason = 'canceled_by_timeout' THEN 'Estorno: Oráculo não respondeu em 24h' ELSE 'Estorno: Cancelamento pelo cliente' END,
        jsonb_build_object('consultation_id', p_consultation_id, 'reason', p_reason)
    );

    -- 3. Atualizar Status da Consulta
    UPDATE public.consultations
    SET status = 'canceled',
        ended_at = now(),
        metadata = jsonb_set(
            COALESCE(metadata, '{}'::jsonb),
            '{cancellation_reason}',
            to_jsonb(p_reason)
        )
    WHERE id = p_consultation_id;

    -- 4. Cancelar Transações Pendentes do Oráculo (Earnings)
    UPDATE public.transactions
    SET status = 'voided',
        description = description || ' (Cancelado)'
    WHERE metadata->>'consultation_id' = p_consultation_id::text
      AND type = 'earnings'
      AND status = 'pending';

    -- 5. Atualizar Transação de Cobrança Original (opcional, para clareza)
    UPDATE public.transactions
    SET description = description || ' (Estornado)'
    WHERE metadata->>'consultation_id' = p_consultation_id::text
      AND type = 'consultation_charge';

    RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 2. Função para Timeout Automático (24h)
-- Esta função pode ser chamada por um CRON job do Supabase ou via API periodicamente
CREATE OR REPLACE FUNCTION public.check_consultation_timeouts()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_rec RECORD;
    v_count INTEGER := 0;
BEGIN
    FOR v_rec IN 
        SELECT id 
        FROM public.consultations 
        WHERE status = 'pending' 
          AND created_at < (now() - INTERVAL '24 hours')
    LOOP
        PERFORM public.cancel_pending_consultation(v_rec.id, 'canceled_by_timeout');
        v_count := v_count + 1;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'canceled_count', v_count);
END;
$$;
