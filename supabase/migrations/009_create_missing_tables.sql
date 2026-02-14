-- ================================================
-- Migration 009: Criar tabelas faltantes
-- chats, messages, wallets, transactions, inbox_messages
-- ================================================

-- ENUMS (criar se não existirem)
DO $$ BEGIN
    CREATE TYPE chat_status AS ENUM ('waiting', 'active', 'ended');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE transaction_type AS ENUM ('credit_purchase', 'consultation_charge', 'refund', 'owner_grant');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE transaction_status AS ENUM ('pending', 'confirmed', 'failed', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- WALLETS (carteira de créditos)
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CHATS (sessões de atendimento)
CREATE TABLE IF NOT EXISTS public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.profiles(id),
  oracle_id UUID REFERENCES public.profiles(id),
  status chat_status DEFAULT 'active',
  credits_consumed INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MESSAGES (mensagens do chat)
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id),
  content TEXT NOT NULL,
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TRANSACTIONS (logs financeiros)
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id),
  type transaction_type NOT NULL,
  amount INTEGER NOT NULL,
  money_amount DECIMAL(10,2),
  asaas_payment_id TEXT,
  status transaction_status DEFAULT 'confirmed',
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INBOX MESSAGES (mensagens passivas)
CREATE TABLE IF NOT EXISTS public.inbox_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID REFERENCES public.profiles(id),
  sender_id UUID REFERENCES public.profiles(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_wallets_user ON public.wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_client ON public.chats(client_id);
CREATE INDEX IF NOT EXISTS idx_chats_oracle ON public.chats(oracle_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat ON public.messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_inbox_recipient ON public.inbox_messages(recipient_id);

-- RLS
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbox_messages ENABLE ROW LEVEL SECURITY;

-- ============ POLICIES ============

-- WALLETS: user vê a própria, owner vê e edita todas
CREATE POLICY "Users view own wallet" ON public.wallets FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Owner view all wallets" ON public.wallets FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner')
);
CREATE POLICY "Owner update all wallets" ON public.wallets FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner')
);
CREATE POLICY "Owner insert wallets" ON public.wallets FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner')
);
-- System: auto-create wallet (via trigger com SECURITY DEFINER)

-- CHATS: participantes vêem, clients criam, owner vê todas
CREATE POLICY "Participants view chats" ON public.chats FOR SELECT USING (
  client_id = auth.uid() OR oracle_id = auth.uid()
);
CREATE POLICY "Owner view all chats" ON public.chats FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner')
);
CREATE POLICY "Clients can create chats" ON public.chats FOR INSERT WITH CHECK (
  client_id = auth.uid()
);
CREATE POLICY "Participants update chats" ON public.chats FOR UPDATE USING (
  client_id = auth.uid() OR oracle_id = auth.uid()
);

-- MESSAGES: participantes do chat lêem e escrevem
CREATE POLICY "Participants view messages" ON public.messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.chats WHERE id = chat_id AND (client_id = auth.uid() OR oracle_id = auth.uid()))
);
CREATE POLICY "Owner view all messages" ON public.messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner')
);
CREATE POLICY "Participants insert messages" ON public.messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.chats WHERE id = chat_id AND (client_id = auth.uid() OR oracle_id = auth.uid()))
);

-- TRANSACTIONS: user vê as próprias, owner vê todas
CREATE POLICY "Users view own transactions" ON public.transactions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Owner view all transactions" ON public.transactions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner')
);
CREATE POLICY "Owner insert transactions" ON public.transactions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner')
);

-- INBOX: recipient lê, owner envia
CREATE POLICY "Users view own inbox" ON public.inbox_messages FOR SELECT USING (recipient_id = auth.uid());
CREATE POLICY "Owner send messages" ON public.inbox_messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner')
);
CREATE POLICY "Users mark as read" ON public.inbox_messages FOR UPDATE USING (recipient_id = auth.uid());

-- ============ TRIGGERS ============

-- Auto-create wallet quando um novo perfil é criado
CREATE OR REPLACE FUNCTION public.handle_new_user_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.wallets (user_id, balance) VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_created_wallet ON public.profiles;
CREATE TRIGGER on_profile_created_wallet
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_wallet();

-- Criar wallet para o owner atual (se não tiver)
INSERT INTO public.wallets (user_id, balance)
SELECT id, 0 FROM public.profiles WHERE role = 'owner'
ON CONFLICT (user_id) DO NOTHING;
