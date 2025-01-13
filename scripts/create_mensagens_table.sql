-- Cria a tabela de mensagens
CREATE TABLE IF NOT EXISTS mensagens (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  oraculista_id UUID REFERENCES oraculistas(id) NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  conteudo TEXT NOT NULL,
  lida BOOLEAN DEFAULT false,
  data TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  tipo VARCHAR(20) CHECK (tipo IN ('pergunta', 'resposta')),
  thread_id UUID REFERENCES mensagens(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
