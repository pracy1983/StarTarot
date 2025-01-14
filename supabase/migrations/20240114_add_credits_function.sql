-- Função para adicionar créditos ao usuário de forma segura
create or replace function add_user_credits(user_id uuid, amount decimal)
returns void
language plpgsql
security definer
as $$
begin
  update public.users
  set credits = credits + amount
  where id = user_id;
end;
$$;
