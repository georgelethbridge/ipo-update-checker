create extension if not exists pgcrypto;

create table if not exists territories (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists sites (
  id uuid primary key default gen_random_uuid(),
  territory_id uuid not null references territories(id) on delete cascade,
  label text not null,
  source_url text not null,
  instructions text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (territory_id, label, source_url)
);

create table if not exists site_latest_articles (
  site_id uuid primary key references sites(id) on delete cascade,
  latest_article_title text,
  latest_article_date date,
  latest_article_url text,
  notes text,
  last_verified_at timestamptz,
  updated_by_user_id uuid references auth.users(id)
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'worker' check (role in ('worker','admin')),
  created_at timestamptz not null default now()
);

create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  submitted_article_title text,
  submitted_article_date date,
  submitted_article_url text,
  article_text text,
  matched_current_record boolean,
  review_status text not null default 'pending' check (review_status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

create table if not exists submission_new_articles (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions(id) on delete cascade,
  article_order integer not null,
  article_title text not null,
  article_date date,
  article_url text,
  article_text text,
  created_at timestamptz not null default now()
);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  description text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists article_ai_results (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references submissions(id) on delete cascade,
  summary text,
  model_name text,
  raw_response jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists article_ai_result_categories (
  id uuid primary key default gen_random_uuid(),
  ai_result_id uuid not null references article_ai_results(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  unique(ai_result_id, category_id)
);

insert into categories(name, sort_order) values
('Patent',1),
('Trademark',2),
('Copyright',3),
('Other IP',4),
('Fee updates',5),
('Regulation / Law update',6),
('Other news',7)
on conflict (name) do nothing;

create or replace function is_admin() returns boolean language sql stable as $$
  select exists(select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function handle_new_user_profile() returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure handle_new_user_profile();

create or replace function admin_approve_submission(
  p_submission_id uuid,
  p_summary text,
  p_category_ids uuid[],
  p_admin_user_id uuid
) returns void language plpgsql security definer as $$
declare
  v_submission submissions%rowtype;
  v_ai_result_id uuid;
begin
  if not is_admin() then raise exception 'forbidden'; end if;

  select * into v_submission from submissions where id = p_submission_id for update;
  if not found then raise exception 'submission not found'; end if;

  update submissions set review_status='approved' where id = p_submission_id;

  insert into article_ai_results(submission_id, summary, model_name, updated_at)
  values (p_submission_id, p_summary, 'admin-edited', now())
  on conflict (submission_id) do update set summary = excluded.summary, updated_at = now()
  returning id into v_ai_result_id;

  delete from article_ai_result_categories where ai_result_id = v_ai_result_id;
  insert into article_ai_result_categories(ai_result_id, category_id)
  select v_ai_result_id, unnest(p_category_ids);

  insert into site_latest_articles(site_id, latest_article_title, latest_article_date, latest_article_url, updated_by_user_id, last_verified_at)
  values(v_submission.site_id, v_submission.submitted_article_title, v_submission.submitted_article_date, v_submission.submitted_article_url, p_admin_user_id, now())
  on conflict (site_id) do update set
    latest_article_title = excluded.latest_article_title,
    latest_article_date = excluded.latest_article_date,
    latest_article_url = excluded.latest_article_url,
    updated_by_user_id = excluded.updated_by_user_id,
    last_verified_at = excluded.last_verified_at;
end;
$$;

alter table territories enable row level security;
alter table sites enable row level security;
alter table site_latest_articles enable row level security;
alter table profiles enable row level security;
alter table submissions enable row level security;
alter table submission_new_articles enable row level security;
alter table categories enable row level security;
alter table article_ai_results enable row level security;
alter table article_ai_result_categories enable row level security;

create policy "read reference data" on territories for select to authenticated using (true);
create policy "read sites" on sites for select to authenticated using (active = true or is_admin());
create policy "read baseline" on site_latest_articles for select to authenticated using (true);
create policy "profile self/admin read" on profiles for select to authenticated using (id = auth.uid() or is_admin());
create policy "profile self update" on profiles for update to authenticated using (id = auth.uid());
create policy "insert own submission" on submissions for insert to authenticated with check (user_id = auth.uid());
create policy "read own submissions" on submissions for select to authenticated using (user_id = auth.uid() or is_admin());
create policy "admin update submissions" on submissions for update to authenticated using (is_admin());
create policy "insert own new articles" on submission_new_articles for insert to authenticated with check (exists(select 1 from submissions s where s.id = submission_id and s.user_id = auth.uid()));
create policy "read own new articles" on submission_new_articles for select to authenticated using (exists(select 1 from submissions s where s.id = submission_id and (s.user_id = auth.uid() or is_admin())));
create policy "read active categories" on categories for select to authenticated using (active = true or is_admin());
create policy "admin manage categories" on categories for all to authenticated using (is_admin()) with check (is_admin());
create policy "read ai own/admin" on article_ai_results for select to authenticated using (exists(select 1 from submissions s where s.id = submission_id and (s.user_id = auth.uid() or is_admin())));
create policy "admin upsert ai" on article_ai_results for all to authenticated using (is_admin()) with check (is_admin());
create policy "read ai category own/admin" on article_ai_result_categories for select to authenticated using (exists(select 1 from article_ai_results r join submissions s on s.id=r.submission_id where r.id = ai_result_id and (s.user_id = auth.uid() or is_admin())));
create policy "admin ai category all" on article_ai_result_categories for all to authenticated using (is_admin()) with check (is_admin());

grant execute on function admin_approve_submission(uuid, text, uuid[], uuid) to authenticated;
