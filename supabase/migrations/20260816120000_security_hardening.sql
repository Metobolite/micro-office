-- Apply this migration after the application's base schema. It intentionally
-- hardens only application tables whose columns are exercised by this repo.
-- Existing project-specific policies are left in place; restrictive policies
-- below make their grants subject to the same tenant/identity invariants.
--
-- Before production deployment, run negative RLS tests with two authenticated
-- users in different teams. At minimum verify cross-team SELECT/INSERT/UPDATE/
-- DELETE, forged user_id/team_id/path values, anonymous access, message sender
-- spoofing, and Storage reads/deletes through another user's object path.
-- Storage's managed schema is deliberately not modified here; deploy bucket
-- policies through the Storage dashboard/API and keep them prefix-bound.
--
-- Invitation acceptance and workspace/profile mutations call RPCs whose
-- definitions live outside this repository. Before deployment, verify those
-- functions are SECURITY DEFINER, owned by a non-login migration role, use an
-- empty/safe search_path, validate auth.uid() themselves, and still work while
-- the direct UPDATE/DELETE policies below remain fail-closed.

begin;

create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;

create or replace function public.is_team_member(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.team_members as member
    where member.team_id = target_team_id
      and member.user_id = (select auth.uid())
  );
$$;

create or replace function public.can_manage_team(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.team_members as member
    where member.team_id = target_team_id
      and member.user_id = (select auth.uid())
      and member.role in ('owner', 'admin')
  );
$$;

create or replace function public.is_team_owner(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.team_members as member
    where member.team_id = target_team_id
      and member.user_id = (select auth.uid())
      and member.role = 'owner'
  )
$$;

create or replace function public.has_current_user_pending_invitation(
  target_team_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.team_invitations as invitation
    where invitation.team_id = target_team_id
      and invitation.status = 'pending'
      and invitation.expires_at > now()
      and nullif(lower(btrim((select auth.jwt() ->> 'email'))), '') is not null
      and lower(btrim(invitation.email)) =
        lower(btrim((select auth.jwt() ->> 'email')))
  )
$$;

revoke all on function public.is_team_member(uuid) from public, anon;
revoke all on function public.can_manage_team(uuid) from public, anon;
revoke all on function public.is_team_owner(uuid) from public, anon;
revoke all on function public.has_current_user_pending_invitation(uuid) from public, anon;
grant execute on function public.is_team_member(uuid) to authenticated;
grant execute on function public.can_manage_team(uuid) to authenticated;
grant execute on function public.is_team_owner(uuid) to authenticated;
grant execute on function public.has_current_user_pending_invitation(uuid) to authenticated;

create or replace function public.enforce_message_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  actor_name text;
begin
  if actor_id is null then
    raise exception using
      errcode = '42501',
      message = 'Authentication is required to write a message.';
  end if;

  select coalesce(
    nullif(btrim(member.name), ''),
    nullif(btrim(member.email), ''),
    'Team member'
  )
  into actor_name
  from public.team_members as member
  where member.team_id = new.team_id
    and member.user_id = actor_id
  limit 1;

  if not found then
    raise exception using
      errcode = '42501',
      message = 'Team membership is required to write a message.';
  end if;

  new.user_id := actor_id;
  new.user_name := actor_name;
  return new;
end;
$$;

revoke all on function public.enforce_message_identity() from public, anon, authenticated;

drop trigger if exists micro_office_enforce_message_identity on public.messages;
create trigger micro_office_enforce_message_identity
before insert or update of user_id, user_name, team_id
on public.messages
for each row
execute function public.enforce_message_identity();

alter table public.files enable row level security;
alter table public.messages enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.team_invitations enable row level security;

-- NOT VALID avoids a blocking historical-row scan while still enforcing the
-- constraint for every new or updated message. Validate it separately after
-- any legacy oversized/blank messages have been cleaned up.
do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.messages'::regclass
      and conname = 'messages_content_length_check'
  ) then
    alter table public.messages
      add constraint messages_content_length_check
      check (
        content is not null
        and char_length(btrim(content)) between 1 and 4000
      ) not valid;
  end if;
end;
$$;

drop policy if exists micro_office_teams_select_allow on public.teams;
create policy micro_office_teams_select_allow
on public.teams
as permissive
for select
to authenticated
using (
  owner_id = (select auth.uid())
  or public.is_team_member(id)
  or public.has_current_user_pending_invitation(id)
);

drop policy if exists micro_office_teams_select_guard on public.teams;
create policy micro_office_teams_select_guard
on public.teams
as restrictive
for select
to authenticated
using (
  owner_id = (select auth.uid())
  or public.is_team_member(id)
  or public.has_current_user_pending_invitation(id)
);

drop policy if exists micro_office_teams_insert_allow on public.teams;
create policy micro_office_teams_insert_allow
on public.teams
as permissive
for insert
to authenticated
with check (owner_id = (select auth.uid()));

drop policy if exists micro_office_teams_insert_guard on public.teams;
create policy micro_office_teams_insert_guard
on public.teams
as restrictive
for insert
to authenticated
with check (owner_id = (select auth.uid()));

-- Direct team updates are intentionally not granted. Existing broad policies
-- are neutralized; the separately deployed settings RPC must bypass RLS only
-- after performing its own owner/admin authorization.
drop policy if exists micro_office_teams_update_guard on public.teams;
create policy micro_office_teams_update_guard
on public.teams
as restrictive
for update
to authenticated
using (false)
with check (false);

-- The owner needs direct DELETE only to compensate a failed membership insert
-- during team bootstrap. Normal destructive workflows should remain explicit.
drop policy if exists micro_office_teams_delete_allow on public.teams;
create policy micro_office_teams_delete_allow
on public.teams
as permissive
for delete
to authenticated
using (owner_id = (select auth.uid()));

drop policy if exists micro_office_teams_delete_guard on public.teams;
create policy micro_office_teams_delete_guard
on public.teams
as restrictive
for delete
to authenticated
using (owner_id = (select auth.uid()));

drop policy if exists micro_office_teams_anon_deny on public.teams;
create policy micro_office_teams_anon_deny
on public.teams
as restrictive
for all
to anon
using (false)
with check (false);

drop policy if exists micro_office_team_members_select_allow on public.team_members;
create policy micro_office_team_members_select_allow
on public.team_members
as permissive
for select
to authenticated
using (public.is_team_member(team_id));

drop policy if exists micro_office_team_members_select_guard on public.team_members;
create policy micro_office_team_members_select_guard
on public.team_members
as restrictive
for select
to authenticated
using (public.is_team_member(team_id));

-- This is the only direct membership insert: a newly-created team's owner may
-- bootstrap their own owner row. Invitation membership changes stay in the
-- separately deployed, authorization-aware SECURITY DEFINER RPC.
drop policy if exists micro_office_team_members_bootstrap_insert_allow on public.team_members;
create policy micro_office_team_members_bootstrap_insert_allow
on public.team_members
as permissive
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and role = 'owner'
  and exists (
    select 1
    from public.teams as owned_team
    where owned_team.id = team_members.team_id
      and owned_team.owner_id = (select auth.uid())
  )
);

drop policy if exists micro_office_team_members_bootstrap_insert_guard on public.team_members;
create policy micro_office_team_members_bootstrap_insert_guard
on public.team_members
as restrictive
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and role = 'owner'
  and exists (
    select 1
    from public.teams as owned_team
    where owned_team.id = team_members.team_id
      and owned_team.owner_id = (select auth.uid())
  )
);

drop policy if exists micro_office_team_members_update_guard on public.team_members;
create policy micro_office_team_members_update_guard
on public.team_members
as restrictive
for update
to authenticated
using (false)
with check (false);

drop policy if exists micro_office_team_members_delete_guard on public.team_members;
create policy micro_office_team_members_delete_guard
on public.team_members
as restrictive
for delete
to authenticated
using (false);

drop policy if exists micro_office_team_members_anon_deny on public.team_members;
create policy micro_office_team_members_anon_deny
on public.team_members
as restrictive
for all
to anon
using (false)
with check (false);

drop policy if exists micro_office_team_invitations_select_allow on public.team_invitations;
create policy micro_office_team_invitations_select_allow
on public.team_invitations
as permissive
for select
to authenticated
using (
  public.can_manage_team(team_id)
  or (
    nullif(lower(btrim((select auth.jwt() ->> 'email'))), '') is not null
    and lower(btrim(email)) = lower(btrim((select auth.jwt() ->> 'email')))
  )
);

drop policy if exists micro_office_team_invitations_select_guard on public.team_invitations;
create policy micro_office_team_invitations_select_guard
on public.team_invitations
as restrictive
for select
to authenticated
using (
  public.can_manage_team(team_id)
  or (
    nullif(lower(btrim((select auth.jwt() ->> 'email'))), '') is not null
    and lower(btrim(email)) = lower(btrim((select auth.jwt() ->> 'email')))
  )
);

drop policy if exists micro_office_team_invitations_insert_allow on public.team_invitations;
create policy micro_office_team_invitations_insert_allow
on public.team_invitations
as permissive
for insert
to authenticated
with check (
  public.can_manage_team(team_id)
  and invited_by = (select auth.uid())
  and status = 'pending'
  and (
    role = 'member'
    or (role = 'admin' and public.is_team_owner(team_id))
  )
);

drop policy if exists micro_office_team_invitations_insert_guard on public.team_invitations;
create policy micro_office_team_invitations_insert_guard
on public.team_invitations
as restrictive
for insert
to authenticated
with check (
  public.can_manage_team(team_id)
  and invited_by = (select auth.uid())
  and status = 'pending'
  and (
    role = 'member'
    or (role = 'admin' and public.is_team_owner(team_id))
  )
);

-- Acceptance/status changes and invitation cleanup must go through the
-- separately deployed SECURITY DEFINER RPCs. These restrictive guards also
-- neutralize any legacy broad authenticated policies.
drop policy if exists micro_office_team_invitations_update_guard on public.team_invitations;
create policy micro_office_team_invitations_update_guard
on public.team_invitations
as restrictive
for update
to authenticated
using (false)
with check (false);

drop policy if exists micro_office_team_invitations_delete_guard on public.team_invitations;
create policy micro_office_team_invitations_delete_guard
on public.team_invitations
as restrictive
for delete
to authenticated
using (false);

drop policy if exists micro_office_team_invitations_anon_deny on public.team_invitations;
create policy micro_office_team_invitations_anon_deny
on public.team_invitations
as restrictive
for all
to anon
using (false)
with check (false);

drop policy if exists micro_office_files_authenticated_allow on public.files;
create policy micro_office_files_authenticated_allow
on public.files
as permissive
for all
to authenticated
using (
  user_id = (select auth.uid())
  and public.is_team_member(team_id)
  and split_part(path, '/', 1) = user_id::text
)
with check (
  user_id = (select auth.uid())
  and public.is_team_member(team_id)
  and split_part(path, '/', 1) = user_id::text
);

drop policy if exists micro_office_files_authenticated_guard on public.files;
create policy micro_office_files_authenticated_guard
on public.files
as restrictive
for all
to authenticated
using (
  user_id = (select auth.uid())
  and public.is_team_member(team_id)
  and split_part(path, '/', 1) = user_id::text
)
with check (
  user_id = (select auth.uid())
  and public.is_team_member(team_id)
  and split_part(path, '/', 1) = user_id::text
);

drop policy if exists micro_office_files_anon_deny on public.files;
create policy micro_office_files_anon_deny
on public.files
as restrictive
for all
to anon
using (false)
with check (false);

drop policy if exists micro_office_messages_select_allow on public.messages;
create policy micro_office_messages_select_allow
on public.messages
as permissive
for select
to authenticated
using (public.is_team_member(team_id));

drop policy if exists micro_office_messages_select_guard on public.messages;
create policy micro_office_messages_select_guard
on public.messages
as restrictive
for select
to authenticated
using (public.is_team_member(team_id));

drop policy if exists micro_office_messages_insert_allow on public.messages;
create policy micro_office_messages_insert_allow
on public.messages
as permissive
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and public.is_team_member(team_id)
);

drop policy if exists micro_office_messages_insert_guard on public.messages;
create policy micro_office_messages_insert_guard
on public.messages
as restrictive
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and public.is_team_member(team_id)
);

drop policy if exists micro_office_messages_update_guard on public.messages;
create policy micro_office_messages_update_guard
on public.messages
as restrictive
for update
to authenticated
using (
  user_id = (select auth.uid())
  and public.is_team_member(team_id)
)
with check (
  user_id = (select auth.uid())
  and public.is_team_member(team_id)
);

drop policy if exists micro_office_messages_delete_guard on public.messages;
create policy micro_office_messages_delete_guard
on public.messages
as restrictive
for delete
to authenticated
using (
  user_id = (select auth.uid())
  and public.is_team_member(team_id)
);

drop policy if exists micro_office_messages_anon_deny on public.messages;
create policy micro_office_messages_anon_deny
on public.messages
as restrictive
for all
to anon
using (false)
with check (false);

-- Tasks and events are optional in older installations, but their browser
-- clients perform direct CRUD when present. Apply the same owner + team guard
-- without making an absent feature table abort this migration.
do $$
declare
  feature_table text;
  policy_prefix text;
begin
  foreach feature_table in array array['tasks', 'events']
  loop
    if to_regclass(format('public.%I', feature_table)) is null then
      continue;
    end if;

    policy_prefix := format('micro_office_%s', feature_table);
    execute format('alter table public.%I enable row level security', feature_table);
    execute format('drop policy if exists %I on public.%I', policy_prefix || '_authenticated_allow', feature_table);
    execute format(
      'create policy %I on public.%I as permissive for all to authenticated using (user_id = (select auth.uid()) and public.is_team_member(team_id)) with check (user_id = (select auth.uid()) and public.is_team_member(team_id))',
      policy_prefix || '_authenticated_allow',
      feature_table
    );
    execute format('drop policy if exists %I on public.%I', policy_prefix || '_authenticated_guard', feature_table);
    execute format(
      'create policy %I on public.%I as restrictive for all to authenticated using (user_id = (select auth.uid()) and public.is_team_member(team_id)) with check (user_id = (select auth.uid()) and public.is_team_member(team_id))',
      policy_prefix || '_authenticated_guard',
      feature_table
    );
    execute format('drop policy if exists %I on public.%I', policy_prefix || '_anon_deny', feature_table);
    execute format(
      'create policy %I on public.%I as restrictive for all to anon using (false) with check (false)',
      policy_prefix || '_anon_deny',
      feature_table
    );
  end loop;
end;
$$;

-- Time-entry writes are mediated by authorization-aware SECURITY DEFINER RPCs.
-- Restrictive write guards neutralize any legacy broad client policy so the
-- RPC business rules cannot be bypassed with direct PostgREST mutations.
do $$
begin
  if to_regclass('public.time_entries') is not null then
    execute 'alter table public.time_entries enable row level security';
    execute 'drop policy if exists micro_office_time_entries_select_allow on public.time_entries';
    execute 'create policy micro_office_time_entries_select_allow on public.time_entries as permissive for select to authenticated using (user_id = (select auth.uid()) and public.is_team_member(team_id))';
    execute 'drop policy if exists micro_office_time_entries_select_guard on public.time_entries';
    execute 'create policy micro_office_time_entries_select_guard on public.time_entries as restrictive for select to authenticated using (user_id = (select auth.uid()) and public.is_team_member(team_id))';
    execute 'drop policy if exists micro_office_time_entries_insert_guard on public.time_entries';
    execute 'create policy micro_office_time_entries_insert_guard on public.time_entries as restrictive for insert to authenticated with check (false)';
    execute 'drop policy if exists micro_office_time_entries_update_guard on public.time_entries';
    execute 'create policy micro_office_time_entries_update_guard on public.time_entries as restrictive for update to authenticated using (false) with check (false)';
    execute 'drop policy if exists micro_office_time_entries_delete_guard on public.time_entries';
    execute 'create policy micro_office_time_entries_delete_guard on public.time_entries as restrictive for delete to authenticated using (false)';
    execute 'drop policy if exists micro_office_time_entries_anon_deny on public.time_entries';
    execute 'create policy micro_office_time_entries_anon_deny on public.time_entries as restrictive for all to anon using (false) with check (false)';
  end if;
end;
$$;

do $$
begin
  if exists (
    select 1
    from public.files
    group by path
    having count(*) > 1
  ) then
    raise exception using
      errcode = '23505',
      message = 'Duplicate files.path values must be cleaned before deployment.';
  end if;

  if exists (
    select 1
    from public.team_invitations
    where token_hash is not null
    group by token_hash
    having count(*) > 1
  ) then
    raise exception using
      errcode = '23505',
      message = 'Duplicate invitation token hashes must be cleaned before deployment.';
  end if;

  if exists (
    select 1
    from public.team_invitations
    where status = 'pending'
    group by team_id, lower(btrim(email))
    having count(*) > 1
  ) then
    raise exception using
      errcode = '23505',
      message = 'Duplicate pending invitations must be cleaned before deployment.';
  end if;
end;
$$;

commit;
