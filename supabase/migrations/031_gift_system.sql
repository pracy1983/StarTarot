-- Migration 031: Gift System
-- ==========================

-- 1. Create gifts table
CREATE TABLE IF NOT EXISTS public.gifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    consultation_id UUID REFERENCES public.consultations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.profiles(id),
    receiver_id UUID REFERENCES public.profiles(id),
    name TEXT NOT NULL,
    credits INTEGER NOT NULL,
    house_commission_pc INTEGER DEFAULT 30, -- 30% for the house
    oracle_amount INTEGER NOT NULL,
    is_seen_by_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view gifts they sent" ON public.gifts
    FOR SELECT USING (auth.uid() = sender_id);

CREATE POLICY "Oracles can view gifts they received" ON public.gifts
    FOR SELECT USING (auth.uid() = receiver_id);

-- 2. RPC to purchase a gift
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
        p_sender_id, -p_credits, 'usage', 'Presente enviado: ' || p_gift_name, 'confirmed',
        jsonb_build_object('consultation_id', p_consultation_id, 'gift_name', p_gift_name)
    );

    -- Credit for oracle
    INSERT INTO public.transactions (
        user_id, amount, type, description, status, metadata
    ) VALUES (
        p_receiver_id, v_oracle_amount, 'earnings', 'Presente recebido: ' || p_gift_name, 'confirmed',
        jsonb_build_object('consultation_id', p_consultation_id, 'gift_name', p_gift_name, 'sender_id', p_sender_id)
    );

    -- 6. Send notification to Oracle (Inbox)
    INSERT INTO public.inbox_messages (
        recipient_id,
        sender_id,
        subject,
        content,
        type
    ) VALUES (
        p_receiver_id,
        p_sender_id,
        'Você recebeu um presente! 🎁',
        'Você recebeu um ' || p_gift_name || ' de um consulente agradecido. ' || v_oracle_amount || ' créditos foram adicionados aos seus ganhos.',
        'system'
    );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE public.gifts IS 'Tracks gifts sent from clients to oracles';
COMMENT ON FUNCTION public.purchase_gift IS 'Processes gift purchase, splits credits, and sends notifications';
