-- ================================================
-- FINAL REPAIR SQL: Fix Profiles, Wallets, Cascades and Triggers
-- ================================================

-- 1. Garantir que as colunas existam na tabela profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS video_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS message_enabled BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS initial_fee DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS application_status TEXT DEFAULT 'approved' CHECK (application_status IN ('pending', 'approved', 'rejected', 'waitlist'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 2. Corrigir Cascades para permitir deleção de perfis (resolve Erro 409 Conflict)
-- Fazemos isso recriando as foreign keys com ON DELETE CASCADE

-- Wallets
ALTER TABLE public.wallets DROP CONSTRAINT IF EXISTS wallets_user_id_fkey;
ALTER TABLE public.wallets ADD CONSTRAINT wallets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Schedules
ALTER TABLE public.schedules DROP CONSTRAINT IF EXISTS schedules_oracle_id_fkey;
ALTER TABLE public.schedules ADD CONSTRAINT schedules_oracle_id_fkey FOREIGN KEY (oracle_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Chats (client e oracle)
ALTER TABLE public.chats DROP CONSTRAINT IF EXISTS chats_client_id_fkey;
ALTER TABLE public.chats ADD CONSTRAINT chats_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.chats DROP CONSTRAINT IF EXISTS chats_oracle_id_fkey;
ALTER TABLE public.chats ADD CONSTRAINT chats_oracle_id_fkey FOREIGN KEY (oracle_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Consultations (client e oracle)
ALTER TABLE public.consultations DROP CONSTRAINT IF EXISTS consultations_client_id_fkey;
ALTER TABLE public.consultations ADD CONSTRAINT consultations_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.consultations DROP CONSTRAINT IF EXISTS consultations_oracle_id_fkey;
ALTER TABLE public.consultations ADD CONSTRAINT consultations_oracle_id_fkey FOREIGN KEY (oracle_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Messages
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE public.messages ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Inbox Messages
ALTER TABLE public.inbox_messages DROP CONSTRAINT IF EXISTS inbox_messages_recipient_id_fkey;
ALTER TABLE public.inbox_messages ADD CONSTRAINT inbox_messages_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.inbox_messages DROP CONSTRAINT IF EXISTS inbox_messages_sender_id_fkey;
ALTER TABLE public.inbox_messages ADD CONSTRAINT inbox_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Transactions
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_user_id_fkey;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. Corrigir permissões de RLS
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 4. Atualizar função da Trigger de Auth (Criação de Perfil)
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, phone)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'client'),
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Atualizar função da Trigger de Carteira (Wallets)
CREATE OR REPLACE FUNCTION public.handle_new_user_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.wallets (user_id, balance) 
  VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Reparar dados (Carteiras órfãs)
INSERT INTO public.wallets (user_id, balance)
SELECT id, 0 FROM public.profiles
WHERE id NOT IN (SELECT user_id FROM public.wallets)
ON CONFLICT (user_id) DO NOTHING;
