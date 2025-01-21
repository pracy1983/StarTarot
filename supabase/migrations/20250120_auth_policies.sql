-- Habilitar extensão UUID se ainda não estiver habilitada
create extension if not exists "uuid-ossp";

-- Configurar políticas de autenticação
alter table auth.users enable row level security;

-- Permitir que usuários não autenticados possam se registrar
create policy "Permitir registro público"
on auth.users for insert
with check (true);

-- Permitir que usuários vejam seus próprios dados
create policy "Usuários podem ver seus próprios dados"
on auth.users for select
using (auth.uid() = id);

-- Permitir que usuários atualizem seus próprios dados
create policy "Usuários podem atualizar seus próprios dados"
on auth.users for update
using (auth.uid() = id);

-- Configurar políticas para tabela users
alter table public.users enable row level security;

-- Permitir inserção na tabela users durante o registro
create policy "Permitir inserção durante registro"
on public.users for insert
with check (auth.role() = 'authenticated' or auth.role() = 'anon');

-- Permitir que usuários vejam seus próprios dados
create policy "Usuários podem ver seus dados"
on public.users for select
using (auth.uid() = id);

-- Permitir que usuários atualizem seus próprios dados
create policy "Usuários podem atualizar seus dados"
on public.users for update
using (auth.uid() = id);
