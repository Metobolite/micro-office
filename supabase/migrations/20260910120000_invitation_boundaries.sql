-- Review against the exported production schema and test in staging first.
-- No live migration is applied by the application or the audit test suite.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '2min';

create schema if not exists micro_office_private;
revoke all on schema micro_office_private from public, anon, authenticated;

-- One persistent counter per actor/team, shared by every application instance.
-- The rows are private and counters roll over without an ever-growing log.
create table micro_office_private.invitation_limits (
  subject text primary key,
  window_start timestamptz not null,
  attempts integer not null
);
revoke all on micro_office_private.invitation_limits from public, anon, authenticated;

create function micro_office_private.guard_invitation_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  current_window timestamptz := date_trunc('hour', statement_timestamp(), 'UTC');
  used integer;
begin
  if actor_id is null or new.invited_by is distinct from actor_id
     or not public.can_manage_team(new.team_id)
     or new.status is distinct from 'pending'
     or new.role is null or new.role not in ('member', 'admin')
     or (new.role = 'admin' and not public.is_team_owner(new.team_id)) then
    raise exception using errcode = '42501', message = 'Invitation permission denied.';
  end if;

  new.email := lower(btrim(new.email));
  if new.email is null or char_length(new.email) > 254
     or new.email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or new.token_hash is null or new.token_hash !~ '^[0-9a-f]{64}$'
     or new.expires_at is null or new.expires_at <= statement_timestamp()
     or new.expires_at > statement_timestamp() + interval '8 days' then
    raise exception using errcode = '22023', message = 'Invalid invitation.';
  end if;

  insert into micro_office_private.invitation_limits as limits
    (subject, window_start, attempts)
  values ('actor:' || actor_id::text, current_window, 1)
  on conflict (subject) do update set
    window_start = excluded.window_start,
    attempts = case when limits.window_start = excluded.window_start
      then limits.attempts + 1 else 1 end
  returning attempts into used;
  if used > 20 then
    raise exception using errcode = 'P0001', message = 'Invitation rate limit reached.';
  end if;

  insert into micro_office_private.invitation_limits as limits
    (subject, window_start, attempts)
  values ('team:' || new.team_id::text, current_window, 1)
  on conflict (subject) do update set
    window_start = excluded.window_start,
    attempts = case when limits.window_start = excluded.window_start
      then limits.attempts + 1 else 1 end
  returning attempts into used;
  if used > 50 then
    raise exception using errcode = 'P0001', message = 'Invitation rate limit reached.';
  end if;
  return new;
end;
$$;
revoke all on function micro_office_private.guard_invitation_insert() from public, anon, authenticated;
create trigger micro_office_guard_invitation_insert
before insert on public.team_invitations
for each row execute function micro_office_private.guard_invitation_insert();

-- A new name avoids silently replacing an RPC with an unknown return type.
create function public.accept_team_invitation_secure(invitation_token_hash text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  account auth.users%rowtype;
  invitation public.team_invitations%rowtype;
  inviter_role text;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'Authentication required.';
  end if;
  if invitation_token_hash is null or invitation_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'Invalid invitation.';
  end if;

  -- Read the current verified email, not editable metadata or a stale JWT email.
  select * into account from auth.users where id = actor_id for share;
  if not found or account.email_confirmed_at is null or nullif(btrim(account.email), '') is null then
    raise exception using errcode = '42501', message = 'A verified email is required.';
  end if;

  select * into invitation from public.team_invitations
  where token_hash = invitation_token_hash for update;
  if not found or invitation.status is distinct from 'pending'
     or invitation.expires_at is null or invitation.expires_at <= statement_timestamp()
     or lower(btrim(invitation.email)) is distinct from lower(btrim(account.email))
     or invitation.role is null or invitation.role not in ('member', 'admin') then
    raise exception using errcode = '42501', message = 'Invitation is unavailable for this account.';
  end if;

  select role into inviter_role from public.team_members
  where team_id = invitation.team_id and user_id = invitation.invited_by
  for share;
  if not found or inviter_role is null or inviter_role not in ('owner', 'admin')
     or (invitation.role = 'admin' and inviter_role <> 'owner') then
    raise exception using errcode = '42501', message = 'Invitation permissions have changed.';
  end if;

  -- Serialize membership creation for this account in this team, including
  -- separate invitations issued to previous addresses. Never elevate a member.
  perform pg_advisory_xact_lock(hashtextextended(invitation.team_id::text || ':' || actor_id::text, 0));
  if not exists (select 1 from public.team_members where team_id = invitation.team_id and user_id = actor_id) then
    insert into public.team_members (team_id, user_id, role, name, email, joined_at)
    values (invitation.team_id, actor_id, invitation.role,
      left(coalesce(nullif(btrim(account.raw_user_meta_data ->> 'full_name'), ''),
        nullif(btrim(account.raw_user_meta_data ->> 'name'), ''), split_part(account.email, '@', 1)), 80),
      lower(btrim(account.email)), statement_timestamp());
  end if;
  update public.team_invitations set status = 'accepted' where id = invitation.id;
  return invitation.team_id;
end;
$$;
revoke all on function public.accept_team_invitation_secure(text) from public, anon;
grant execute on function public.accept_team_invitation_secure(text) to authenticated;

-- Keep the legacy definition for rollback/review, but close its direct API path.
-- Audit any other overloads in the exported live schema before release.
do $$
begin
  if to_regprocedure('public.accept_team_invitation_with_role(text)') is not null then
    revoke all on function public.accept_team_invitation_with_role(text) from public, anon, authenticated;
  end if;
end;
$$;
commit;
