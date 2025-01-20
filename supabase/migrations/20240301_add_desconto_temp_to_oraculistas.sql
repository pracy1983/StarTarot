-- Adiciona coluna desconto_temp na tabela oraculistas
alter table public.oraculistas
add column if not exists desconto_temp numeric(10,2);

comment on column public.oraculistas.desconto_temp is 'Valor do desconto temporário aplicado ao oraculista';
