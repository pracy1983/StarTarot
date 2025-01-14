-- Create chat_history table
create table if not exists public.chat_history (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid not null references auth.users(id),
    message text not null,
    sender text not null check (sender in ('user', 'assistant')),
    timestamp timestamptz default now(),
    created_at timestamptz default now()
);

-- Set up RLS (Row Level Security)
alter table public.chat_history enable row level security;

-- Create policy to allow users to see only their own messages
create policy "Users can view their own messages"
    on public.chat_history for select
    using (auth.uid() = user_id);

-- Create policy to allow users to insert their own messages
create policy "Users can insert their own messages"
    on public.chat_history for insert
    with check (auth.uid() = user_id);

-- Create index on user_id and timestamp for better query performance
create index chat_history_user_id_timestamp_idx on public.chat_history(user_id, timestamp);
