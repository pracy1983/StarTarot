-- Drop existing tables if they exist
DROP TABLE IF EXISTS public.mensagens CASCADE;
DROP TABLE IF EXISTS public.chat_messages CASCADE;

-- Create mensagens table
CREATE TABLE public.mensagens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    oraculista_id UUID REFERENCES public.oraculistas(id) ON DELETE CASCADE,
    conteudo TEXT NOT NULL,
    tipo VARCHAR(20) NOT NULL DEFAULT 'pergunta',
    data TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    lida BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'pendente',
    thread_id UUID REFERENCES public.mensagens(id),
    pergunta_ref UUID REFERENCES public.mensagens(id),
    updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chat_messages table
CREATE TABLE public.chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_id UUID NOT NULL,
    parent_message_id UUID REFERENCES public.chat_messages(id)
);

-- Create indexes
CREATE INDEX idx_mensagens_user_id ON public.mensagens(user_id);
CREATE INDEX idx_mensagens_oraculista_id ON public.mensagens(oraculista_id);
CREATE INDEX idx_mensagens_data ON public.mensagens(data DESC);

CREATE INDEX idx_chat_messages_user_id ON public.chat_messages(user_id);
CREATE INDEX idx_chat_messages_session_id ON public.chat_messages(session_id);
CREATE INDEX idx_chat_messages_timestamp ON public.chat_messages(timestamp DESC);

-- Enable RLS
ALTER TABLE public.mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Mensagens policies
CREATE POLICY "Usuários podem ver suas próprias mensagens"
    ON public.mensagens FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id OR auth.uid() = oraculista_id);

CREATE POLICY "Usuários podem criar mensagens"
    ON public.mensagens FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas mensagens"
    ON public.mensagens FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id OR auth.uid() = oraculista_id);

CREATE POLICY "Usuários podem deletar suas mensagens"
    ON public.mensagens FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Chat messages policies
CREATE POLICY "Usuários podem ver suas mensagens de chat"
    ON public.chat_messages FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar mensagens de chat"
    ON public.chat_messages FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar mensagens de chat"
    ON public.chat_messages FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar mensagens de chat"
    ON public.chat_messages FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
