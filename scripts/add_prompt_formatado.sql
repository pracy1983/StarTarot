-- Adiciona coluna prompt_formatado na tabela oraculistas
alter table oraculistas add column if not exists prompt_formatado text;
