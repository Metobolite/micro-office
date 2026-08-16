-- The live project preflight should confirm these tables are still small.
-- Time-bounded locks make deployment fail fast instead of waiting behind an
-- unexpected writer. For a mature/high-volume project, build equivalent
-- indexes concurrently in a maintenance migration applied statement-by-statement.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '2min';

create index if not exists team_members_team_user_idx
on public.team_members (team_id, user_id);

create index if not exists team_members_user_joined_team_idx
on public.team_members (user_id, joined_at desc, team_id);

create index if not exists files_user_team_uploaded_id_idx
on public.files (
  user_id,
  team_id,
  uploaded_at desc nulls last,
  id desc
);

create index if not exists files_team_uploaded_id_idx
on public.files (team_id, uploaded_at desc nulls last, id desc);

create unique index if not exists files_path_unique_idx
on public.files (path);

do $$
declare
  trgm_schema name;
begin
  select namespace.nspname
  into trgm_schema
  from pg_catalog.pg_opclass as operator_class
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = operator_class.opcnamespace
  join pg_catalog.pg_am as access_method
    on access_method.oid = operator_class.opcmethod
  where operator_class.opcname = 'gin_trgm_ops'
    and access_method.amname = 'gin'
  order by (namespace.nspname = 'extensions') desc
  limit 1;

  if trgm_schema is null then
    raise exception 'pg_trgm gin_trgm_ops is unavailable';
  end if;

  execute format(
    'create index if not exists files_name_trgm_idx on public.files using gin (name %I.gin_trgm_ops)',
    trgm_schema
  );
end;
$$;

create index if not exists messages_team_inserted_id_idx
on public.messages (team_id, inserted_at desc nulls last, id desc);

create index if not exists tasks_user_team_status_sort_id_idx
on public.tasks (user_id, team_id, status, sort_order, id);

create index if not exists events_user_team_date_id_idx
on public.events (user_id, team_id, date, id);

create index if not exists time_entries_user_team_start_id_idx
on public.time_entries (user_id, team_id, start_time desc nulls last, id desc);

create unique index if not exists team_invitations_token_hash_unique_idx
on public.team_invitations (token_hash)
where token_hash is not null;

create index if not exists team_invitations_team_email_status_idx
on public.team_invitations (team_id, lower(btrim(email)), status);

create unique index if not exists team_invitations_pending_email_unique_idx
on public.team_invitations (team_id, lower(btrim(email)))
where status = 'pending';

commit;
