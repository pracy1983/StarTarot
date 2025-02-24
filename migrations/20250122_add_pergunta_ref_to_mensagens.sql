-- Add pergunta_ref column to mensagens table
alter table public.mensagens
add column pergunta_ref uuid references public.mensagens(id) on delete set null;

-- Update existing messages to set pergunta_ref
update public.mensagens
set pergunta_ref = thread_id
where tipo = 'pergunta';

-- Create index for faster queries
create index mensagens_pergunta_ref_idx on public.mensagens(pergunta_ref);

-- Update RLS policies to include pergunta_ref
drop policy if exists "Users can read their own messages" on public.mensagens;
create policy "Users can read their own messages"
    on public.mensagens
    for select
    using (auth.uid() = user_id);

drop policy if exists "Users can insert their own messages" on public.mensagens;
create policy "Users can insert their own messages"
    on public.mensagens
    for insert
    with check (auth.uid() = user_id);

drop policy if exists "Users can update their own messages" on public.mensagens;
create policy "Users can update their own messages"
    on public.mensagens
    for update
    using (auth.uid() = user_id);

drop policy if exists "Users can delete their own messages" on public.mensagens;
create policy "Users can delete their own messages"
    on public.mensagens
    for delete
    using (auth.uid() = user_id);
