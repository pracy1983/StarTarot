-- Create chat_messages table
create table if not exists public.chat_messages (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade,
    content text not null,
    role text not null check (role in ('user', 'assistant')),
    timestamp timestamptz default now(),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Enable RLS
alter table public.chat_messages enable row level security;

-- Create policy to allow users to read their own messages
create policy "Users can read their own messages"
    on public.chat_messages
    for select
    using (auth.uid() = user_id);

-- Create policy to allow users to insert their own messages
create policy "Users can insert their own messages"
    on public.chat_messages
    for insert
    with check (auth.uid() = user_id);

-- Create policy to allow users to update their own messages
create policy "Users can update their own messages"
    on public.chat_messages
    for update
    using (auth.uid() = user_id);

-- Create policy to allow users to delete their own messages
create policy "Users can delete their own messages"
    on public.chat_messages
    for delete
    using (auth.uid() = user_id);

-- Create index for faster queries
create index chat_messages_user_id_idx on public.chat_messages(user_id);
create index chat_messages_timestamp_idx on public.chat_messages(timestamp);

-- Grant access to authenticated users
grant select, insert, update, delete on public.chat_messages to authenticated;
