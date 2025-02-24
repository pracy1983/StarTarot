-- Verifica e cria tabelas necessárias para o sistema de mensagens

-- Primeiro, vamos verificar as tabelas existentes
DO $$ 
BEGIN
    -- Verifica se a tabela mensagens existe
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mensagens') THEN
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
            updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            visibilidade VARCHAR(20) DEFAULT 'privada'
        );

        -- Adiciona comentários para documentação
        COMMENT ON TABLE public.mensagens IS 'Tabela para armazenar mensagens entre usuários e oraculistas';
        COMMENT ON COLUMN public.mensagens.tipo IS 'Tipo da mensagem: pergunta ou resposta';
        COMMENT ON COLUMN public.mensagens.status IS 'Status da mensagem: pendente, enviada, entregue, falha';
        COMMENT ON COLUMN public.mensagens.visibilidade IS 'Visibilidade da mensagem: privada ou publica';

        -- Cria índices para melhor performance
        CREATE INDEX idx_mensagens_user_id ON public.mensagens(user_id);
        CREATE INDEX idx_mensagens_oraculista_id ON public.mensagens(oraculista_id);
        CREATE INDEX idx_mensagens_thread_id ON public.mensagens(thread_id);
        CREATE INDEX idx_mensagens_data ON public.mensagens(data DESC);
    END IF;

    -- Verifica se a tabela chat_messages existe
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'chat_messages') THEN
        CREATE TABLE public.chat_messages (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            content TEXT NOT NULL,
            role VARCHAR(20) NOT NULL DEFAULT 'user',
            timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            session_id UUID NOT NULL,
            parent_message_id UUID REFERENCES public.chat_messages(id),
            metadata JSONB DEFAULT '{}'::jsonb
        );

        -- Adiciona comentários para documentação
        COMMENT ON TABLE public.chat_messages IS 'Tabela para armazenar mensagens do chat ao vivo com a IA';
        COMMENT ON COLUMN public.chat_messages.role IS 'Papel do remetente: user ou assistant';
        COMMENT ON COLUMN public.chat_messages.session_id IS 'ID da sessão de chat';
        COMMENT ON COLUMN public.chat_messages.metadata IS 'Metadados adicionais da mensagem em formato JSON';

        -- Cria índices para melhor performance
        CREATE INDEX idx_chat_messages_user_id ON public.chat_messages(user_id);
        CREATE INDEX idx_chat_messages_session_id ON public.chat_messages(session_id);
        CREATE INDEX idx_chat_messages_timestamp ON public.chat_messages(timestamp DESC);
    END IF;
END $$;

-- Configurar políticas de segurança RLS (Row Level Security)
ALTER TABLE public.mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Políticas para mensagens
CREATE POLICY "Usuários podem ver suas próprias mensagens"
    ON public.mensagens FOR SELECT
    TO authenticated
    USING (
        auth.uid() = user_id 
        OR 
        auth.uid() = oraculista_id
        OR 
        visibilidade = 'publica'
    );

CREATE POLICY "Usuários podem criar suas próprias mensagens"
    ON public.mensagens FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias mensagens"
    ON public.mensagens FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id OR auth.uid() = oraculista_id)
    WITH CHECK (auth.uid() = user_id OR auth.uid() = oraculista_id);

CREATE POLICY "Usuários podem deletar suas próprias mensagens"
    ON public.mensagens FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Políticas para chat_messages
CREATE POLICY "Usuários podem ver suas próprias mensagens de chat"
    ON public.chat_messages FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar suas próprias mensagens de chat"
    ON public.chat_messages FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias mensagens de chat"
    ON public.chat_messages FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar suas próprias mensagens de chat"
    ON public.chat_messages FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Funções auxiliares
CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS TRIGGER AS $$
BEGIN
    -- Atualiza o timestamp
    NEW.updatedAt := NOW();
    
    -- Se for uma resposta, marca a pergunta original como respondida
    IF NEW.tipo = 'resposta' AND NEW.pergunta_ref IS NOT NULL THEN
        UPDATE public.mensagens
        SET status = 'respondida'
        WHERE id = NEW.pergunta_ref;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para manipular novas mensagens
DROP TRIGGER IF EXISTS handle_new_message_trigger ON public.mensagens;
CREATE TRIGGER handle_new_message_trigger
    BEFORE INSERT OR UPDATE ON public.mensagens
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_message();
