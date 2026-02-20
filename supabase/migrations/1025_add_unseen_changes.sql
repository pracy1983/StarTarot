-- Migration: Adicionar coluna has_unseen_changes nos profiles
-- Usada para mostrar bolinha vermelha no admin quando oraculista atualiza perfil
-- enquanto está em status pending/rejected

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS has_unseen_changes BOOLEAN DEFAULT FALSE;

-- Comentário explicativo
COMMENT ON COLUMN profiles.has_unseen_changes IS
'TRUE quando o oraculista atualiza o perfil enquanto está pending/rejected e o admin ainda não reviu. 
Seta FALSE automaticamente quando admin aprova ou rejeita novamente.';
