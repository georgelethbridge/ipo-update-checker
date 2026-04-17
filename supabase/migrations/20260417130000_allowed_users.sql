create table if not exists allowed_users (
  email text primary key,
  role text not null default 'worker' check (role in ('worker', 'admin')),
  active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  check (email = lower(email))
);

alter table allowed_users enable row level security;

create policy "admin manage allowed users" on allowed_users
for all to authenticated
using (is_admin())
with check (is_admin());

create or replace function handle_new_user_profile() returns trigger language plpgsql security definer as $$
declare
  v_role text;
begin
  select role into v_role
  from allowed_users
  where email = lower(new.email)
    and active = true
  limit 1;

  insert into profiles (id, email, full_name, role)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(v_role, 'worker')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;
