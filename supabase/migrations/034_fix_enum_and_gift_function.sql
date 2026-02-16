-- Migration to fix transaction types and rating logic

-- 1. Safely update transaction_type enum
-- Since enums cannot be updated within transactions in some versions, we use this approach:
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'transaction_type' AND e.enumlabel = 'earnings') THEN
        ALTER TYPE public.transaction_type ADD VALUE 'earnings';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'transaction_type' AND e.enumlabel = 'bonus') THEN
        ALTER TYPE public.transaction_type ADD VALUE 'bonus';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'transaction_type' AND e.enumlabel = 'gift_send') THEN
        ALTER TYPE public.transaction_type ADD VALUE 'gift_send';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'transaction_type' AND e.enumlabel = 'gift_receive') THEN
        ALTER TYPE public.transaction_type ADD VALUE 'gift_receive';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'transaction_type' AND e.enumlabel = 'usage') THEN
        ALTER TYPE public.transaction_type ADD VALUE 'usage';
    END IF;
EXCEPTION 
    WHEN others THEN NULL;
END $$;

-- 2. Update purchase_gift function if it exists to match new enum
CREATE OR REPLACE FUNCTION public.purchase_gift(
    p_consultation_id UUID,
    p_sender_id UUID,
    p_receiver_id UUID,
    p_gift_name TEXT,
    p_credits INTEGER
) RETURNS VOID AS $$
DECLARE
    v_house_pc INTEGER := 30;
    v_oracle_amount INTEGER;
BEGIN
    -- 1. Calculate oracle's portion (70%)
    v_oracle_amount := FLOOR(p_credits * 0.7);

    -- 2. Deduct from sender's wallet
    UPDATE public.wallets 
    SET balance = balance - p_credits,
        updated_at = now()
    WHERE user_id = p_sender_id;

    -- 3. Add to receiver's wallet (Oracle)
    UPDATE public.wallets 
    SET balance = balance + v_oracle_amount,
        updated_at = now()
    WHERE user_id = p_receiver_id;

    -- 4. Record the gift
    INSERT INTO public.gifts (
        consultation_id, sender_id, receiver_id, name, credits, oracle_amount, house_commission_pc
    ) VALUES (
        p_consultation_id, p_sender_id, p_receiver_id, p_gift_name, p_credits, v_oracle_amount, v_house_pc
    );

    -- 5. Record transactions for both
    -- Debit for client
    INSERT INTO public.transactions (
        user_id, amount, type, description, status, metadata
    ) VALUES (
        p_sender_id, -p_credits, 'gift_send', 'Enviou presente: ' || p_gift_name, 'confirmed',
        jsonb_build_object('consultation_id', p_consultation_id, 'gift_name', p_gift_name)
    );

    -- Credit for oracle
    INSERT INTO public.transactions (
        user_id, amount, type, description, status, metadata
    ) VALUES (
        p_receiver_id, v_oracle_amount, 'gift_receive', 'Recebeu presente: ' || p_gift_name, 'confirmed',
        jsonb_build_object('consultation_id', p_consultation_id, 'gift_name', p_gift_name, 'sender_id', p_sender_id)
    );

    -- 6. Send notification to Oracle (Inbox)
    INSERT INTO public.inbox_messages (
        recipient_id,
        sender_id,
        title,
        content,
        metadata
    ) VALUES (
        p_receiver_id,
        p_sender_id,
        'Você recebeu um presente! 🎁',
        'Você recebeu um ' || p_gift_name || ' de um consulente agradecido. ' || v_oracle_amount || ' créditos foram adicionados aos seus ganhos.',
        jsonb_build_object('type', 'gift_received', 'consultation_id', p_consultation_id)
    );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
