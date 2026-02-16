-- Enable Realtime for consultations and inbox_messages
-- This ensures the Oracle receives the "Incoming Call" notification immediately.
BEGIN;

    -- Add tables to publication if they are not already (SAFE MODE)
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'consultations') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE consultations;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'inbox_messages') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE inbox_messages;
        END IF;
    END
    $$;

    -- FIX 1: Grant Reward Credits (Fixing "ambiguous column" error)
    -- We rename parameters to p_... to avoid conflict with column names.
    DROP FUNCTION IF EXISTS public.grant_reward_credits(uuid, integer, text);
    CREATE OR REPLACE FUNCTION public.grant_reward_credits(
        p_user_id UUID,
        p_amount INTEGER,
        p_description TEXT
    ) RETURNS VOID AS $$
    BEGIN
        -- Update or Insert wallet
        INSERT INTO public.wallets (user_id, balance, updated_at)
        VALUES (p_user_id, p_amount, NOW())
        ON CONFLICT (user_id) DO UPDATE
        SET balance = wallets.balance + EXCLUDED.balance,
            updated_at = NOW();

        -- Log transaction
        INSERT INTO public.transactions (
            user_id,
            amount,
            type,
            status,
            description,
            metadata
        ) VALUES (
            p_user_id,
            p_amount,
            'bonus',
            'confirmed',
            p_description,
            jsonb_build_object('source', 'rating_reward')
        );
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    -- FIX 2: Purchase Gift (Adding safety check)
    -- Ensuring wallet exists and update happens.
    CREATE OR REPLACE FUNCTION public.purchase_gift(
        p_consultation_id UUID,
        p_sender_id UUID,
        p_receiver_id UUID,
        p_gift_name TEXT,
        p_credits INTEGER
    ) RETURNS VOID AS $$
    DECLARE
        v_oracle_gain INTEGER;
        v_current_balance INTEGER;
    BEGIN
        -- Check current balance
        SELECT balance INTO v_current_balance FROM public.wallets WHERE user_id = p_sender_id;
        
        IF v_current_balance IS NULL OR v_current_balance < p_credits THEN
            RAISE EXCEPTION 'Saldo insuficiente ou carteira não encontrada.';
        END IF;

        -- 1. Deduct from sender
        UPDATE public.wallets 
        SET balance = balance - p_credits,
            updated_at = now()
        WHERE user_id = p_sender_id;

        -- 2. Calculate split (100% to oracle for gifts)
        v_oracle_gain := p_credits;

        -- 3. Add to receiver
        INSERT INTO public.wallets (user_id, balance, updated_at)
        VALUES (p_receiver_id, v_oracle_gain, NOW())
        ON CONFLICT (user_id) DO UPDATE
        SET balance = wallets.balance + v_oracle_gain,
            updated_at = NOW();

        -- 4. Record sender transaction
        INSERT INTO public.transactions (
            user_id, amount, type, status, description, metadata
        ) VALUES (
            p_sender_id, -p_credits, 'gift_send', 'confirmed', 
            'Envio de presente: ' || p_gift_name, 
            jsonb_build_object('consultation_id', p_consultation_id, 'receiver_id', p_receiver_id)
        );

        -- 5. Record receiver transaction
        INSERT INTO public.transactions (
            user_id, amount, type, status, description, metadata
        ) VALUES (
            p_receiver_id, v_oracle_gain, 'gift_receive', 'confirmed', 
            'Recebimento de presente: ' || p_gift_name, 
            jsonb_build_object('consultation_id', p_consultation_id, 'sender_id', p_sender_id)
        );
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    -- FIX 3: Ratings Policies (Ensure they are accessible)
    -- Enable RLS on ratings if not already
    ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

    -- Create policies if they don't exist
    DO $$
    BEGIN
        -- View policy: Everyone can see ratings (since they are shown on profiles)
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ratings' AND policyname = 'Ratings are viewable by everyone') THEN
            CREATE POLICY "Ratings are viewable by everyone" 
            ON public.ratings FOR SELECT 
            USING (true);
        END IF;

        -- Insert policy: Authenticated users can insert their own ratings
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ratings' AND policyname = 'Clients can create ratings') THEN
            CREATE POLICY "Clients can create ratings" 
            ON public.ratings FOR INSERT 
            WITH CHECK (auth.uid() = client_id);
        END IF;

        -- Update policy: Users can update their own ratings (optional, but good)
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ratings' AND policyname = 'Clients can update own ratings') THEN
            CREATE POLICY "Clients can update own ratings" 
            ON public.ratings FOR UPDATE 
            USING (auth.uid() = client_id);
        END IF;
    END
    $$;

COMMIT;
