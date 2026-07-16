-- Private Realtime Presence authorization for topics named:
-- team:<team uuid>:presence
--
-- SECURITY DEFINER keeps this membership lookup independent from the RLS
-- policies on team_members. The caller can only test their own membership.
create or replace function public.can_access_team_presence(target_topic text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.team_members as membership
    where membership.user_id = (select auth.uid())
      and target_topic =
        'team:' || membership.team_id::text || ':presence'
  );
$$;

revoke all on function public.can_access_team_presence(text) from public;
revoke all on function public.can_access_team_presence(text) from anon;
grant execute on function public.can_access_team_presence(text)
to authenticated;

-- Supabase owns realtime.messages and already has RLS enabled. Do not run
-- ALTER TABLE against this managed relation; only policies are user-managed.
-- Existing permissive Realtime policies are combined with OR. These
-- restrictive guards make sure an older broad policy cannot expose this app's
-- team Presence namespace. Other Presence and Broadcast namespaces remain
-- untouched.
drop policy if exists "team_presence_read_guard" on realtime.messages;

create policy "team_presence_read_guard"
on realtime.messages
as restrictive
for select
to authenticated
using (
  extension is distinct from 'presence'
  or (select realtime.topic()) not like 'team:%:presence'
  or public.can_access_team_presence((select realtime.topic()))
);

drop policy if exists "team_presence_write_guard" on realtime.messages;

create policy "team_presence_write_guard"
on realtime.messages
as restrictive
for insert
to authenticated
with check (
  extension is distinct from 'presence'
  or (select realtime.topic()) not like 'team:%:presence'
  or public.can_access_team_presence((select realtime.topic()))
);

-- Anonymous clients must not enter the protected team namespace, even if the
-- project already has a broad permissive Realtime policy. These policies avoid
-- granting anon access to the SECURITY DEFINER membership helper.
drop policy if exists "team_presence_anon_read_guard" on realtime.messages;

create policy "team_presence_anon_read_guard"
on realtime.messages
as restrictive
for select
to anon
using (
  extension is distinct from 'presence'
  or (select realtime.topic()) not like 'team:%:presence'
);

drop policy if exists "team_presence_anon_write_guard" on realtime.messages;

create policy "team_presence_anon_write_guard"
on realtime.messages
as restrictive
for insert
to anon
with check (
  extension is distinct from 'presence'
  or (select realtime.topic()) not like 'team:%:presence'
);

drop policy if exists "team_members_can_read_presence" on realtime.messages;

create policy "team_members_can_read_presence"
on realtime.messages
for select
to authenticated
using (
  extension = 'presence'
  and public.can_access_team_presence((select realtime.topic()))
);

drop policy if exists "team_members_can_track_presence" on realtime.messages;

create policy "team_members_can_track_presence"
on realtime.messages
for insert
to authenticated
with check (
  extension = 'presence'
  and public.can_access_team_presence((select realtime.topic()))
);

-- The browser performs this helper check before joining the private channel.
-- Refresh PostgREST so a newly created/replaced function is immediately
-- available through supabase.rpc().
notify pgrst, 'reload schema';
