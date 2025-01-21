-- Drop existing table if it exists
drop table if exists public.users;

-- Create users table
create table public.users (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  email text not null unique,
  phone_country_code text not null,
  phone_area_code text not null,
  phone_number text not null,
  birth_date date not null,
  coupon_code text,
  verification_code text,
  verification_code_expires_at timestamptz,
  is_admin boolean default false,
  admin_role text,
  is_online boolean default false,
  last_online timestamptz default now(),
  credits integer default 0,
  last_consultation timestamptz,
  email_verified boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Set up Row Level Security (RLS)
alter table public.users enable row level security;

-- Create policies
create policy "Users can view own profile"
  on public.users for select
  using ( auth.uid() = id );

create policy "Users can update own profile"
  on public.users for update
  using ( auth.uid() = id );

-- Create function to handle updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create trigger for updated_at
create trigger handle_updated_at
  before update on public.users
  for each row
  execute procedure public.handle_updated_at();
