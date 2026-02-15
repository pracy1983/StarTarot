-- Adicionar campos de taxa inicial para oraculistas
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS initial_fee_brl DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS initial_fee_credits INTEGER DEFAULT 0;

-- Comentários para documentação
COMMENT ON COLUMN public.profiles.initial_fee_brl IS 'Taxa inicial em Reais (R$) para abrir uma consulta de vídeo/chat.';
COMMENT ON COLUMN public.profiles.initial_fee_credits IS 'Taxa inicial convertida em créditos para o usuário final.';
