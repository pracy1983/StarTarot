create table if not exists public.profile_snapshots (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  admin_id uuid references public.profiles(id) on delete set null,
  data jsonb not null,
  reason text,
  created_at timestamptz default now() not null
);

-- Add RLS policies
alter table public.profile_snapshots enable row level security;

create policy "Admins can view all snapshots"
  on public.profile_snapshots
  for select
  using (
    auth.uid() in (
      select id from public.profiles where role = 'owner'
    )
  );

create policy "Admins can insert snapshots"
  on public.profile_snapshots
  for insert
  with check (
    auth.uid() in (
      select id from public.profiles where role = 'owner'
    )
  );

-- Users can view their own snapshots? Maybe not needed for now, but safe to allow.
create policy "Users can view own snapshots"
  on public.profile_snapshots
  for select
  using (auth.uid() = user_id);
