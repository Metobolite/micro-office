-- Synthetic test schema only. This is NOT the production base schema.
do $$ begin
  if current_database() <> 'micro_office_audit' then raise exception 'Test database required'; end if;
end $$;
create role anon nologin;
create role authenticated nologin;
create schema auth;
create schema storage;
create schema audit_test;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
create function auth.jwt() returns jsonb language sql stable as $$
  select jsonb_build_object('sub', auth.uid(), 'email', current_setting('request.jwt.claim.email', true))
$$;
create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz, raw_user_meta_data jsonb default '{}');
create table public.teams (id uuid primary key default gen_random_uuid(), owner_id uuid, name text);
create table public.team_members (
  team_id uuid references public.teams, user_id uuid references auth.users,
  role text, name text, email text, phone text, avatar_url text, joined_at timestamptz, status text,
  primary key (team_id, user_id)
);
create table public.team_invitations (
  id uuid primary key default gen_random_uuid(), team_id uuid references public.teams,
  email text, role text, status text default 'pending', token_hash text,
  invited_by uuid references auth.users, expires_at timestamptz
);
create table public.tasks (
  id uuid primary key default gen_random_uuid(), team_id uuid references public.teams,
  user_id uuid references auth.users, title text, description text, status text default 'todo',
  priority text, sort_order integer, due_date date
);
create table public.events (id uuid primary key default gen_random_uuid(), team_id uuid, user_id uuid, date date);
create table public.messages (id uuid primary key default gen_random_uuid(), team_id uuid, user_id uuid, user_name text, content text, inserted_at timestamptz default now());
create table public.files (id uuid primary key default gen_random_uuid(), team_id uuid, user_id uuid, path text, name text, uploaded_at timestamptz);
create table public.time_entries (id uuid primary key default gen_random_uuid(), team_id uuid, user_id uuid, start_time timestamptz);
create table storage.buckets (id text primary key, public boolean);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
insert into storage.buckets values ('user-files', false), ('avatars', true), ('unrelated', false);

-- Deliberately unsafe legacy policies verify that new restrictive guards win.
do $$ declare tab text; begin
  foreach tab in array array['teams','team_members','team_invitations','tasks','events','messages','files','time_entries'] loop
    execute format('create policy legacy_allow_all on public.%I for all to public using (true) with check (true)', tab);
  end loop;
end $$;
create policy legacy_allow_all on storage.objects for all to public using (true) with check (true);
create function public.accept_team_invitation_with_role(text) returns uuid language sql as $$ select null::uuid $$;
grant usage on schema public, auth, storage, audit_test to anon, authenticated;
grant select, insert, update, delete on all tables in schema public, storage to anon, authenticated;
grant execute on all functions in schema auth to anon, authenticated;

create function audit_test.check(ok boolean, label text) returns void language plpgsql as $$
begin
  if ok is distinct from true then raise exception 'FAILED: %', label; end if;
  raise notice 'PASS: %', label;
end $$;
create function audit_test.rejects(statement text, expected_code text, label text) returns void language plpgsql as $$
begin
  begin
    execute statement;
  exception when others then
    if sqlstate = expected_code then raise notice 'PASS: %', label; return; end if;
    raise exception 'FAILED: %, expected %, got % (%)', label, expected_code, sqlstate, sqlerrm;
  end;
  raise exception 'FAILED: % was allowed', label;
end $$;

insert into auth.users (id, email, email_confirmed_at) values
 ('00000000-0000-4000-8000-000000000001','alice@example.test',now()),
 ('00000000-0000-4000-8000-000000000002','bob@example.test',now()),
 ('00000000-0000-4000-8000-000000000003','carol@example.test',now()),
 ('00000000-0000-4000-8000-000000000004','unverified@example.test',null),
 ('00000000-0000-4000-8000-000000000005','admin@example.test',now());
insert into public.teams values
 ('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','Alpha'),
 ('10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000002','Beta');
insert into public.team_members(team_id,user_id,role,name,email) values
 ('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','owner','Alice','alice@example.test'),
 ('10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000002','owner','Bob','bob@example.test'),
 ('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000005','admin','Admin','admin@example.test');
insert into public.tasks(id,team_id,user_id,title,sort_order) values
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','Alice task',0),
 ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000002','Bob task',0),
 ('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000005','Same-team admin task',0);
insert into public.files(team_id,user_id,path,name) values
 ('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001/alice.pdf','alice.pdf'),
 ('10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000002/bob.pdf','bob.pdf');
insert into storage.objects(bucket_id,name) values
 ('user-files','00000000-0000-4000-8000-000000000001/alice.pdf'),
 ('user-files','00000000-0000-4000-8000-000000000002/bob.pdf');
