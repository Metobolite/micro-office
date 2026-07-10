create extension if not exists pgcrypto;

create table if not exists public.team_invitations (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  email text not null,
  role text not null default 'member',
  token_hash text not null unique,
  status text not null default 'pending',
  invited_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  constraint team_invitations_role_check check (role in ('member', 'admin')),
  constraint team_invitations_status_check check (
    status in ('pending', 'accepted', 'revoked', 'expired')
  )
);

create unique index if not exists team_invitations_pending_email_idx
on public.team_invitations (team_id, (lower(email)))
where status = 'pending';

alter table public.team_invitations enable row level security;

create or replace function public.can_manage_team_invitations(target_team_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_members tm
    where tm.team_id = target_team_id
      and tm.user_id = auth.uid()
      and tm.role in ('owner', 'admin')
  );
$$;

create or replace function public.has_pending_team_invitation(
  target_team_id uuid,
  target_email text
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_invitations ti
    where ti.team_id = target_team_id
      and lower(ti.email) = lower(target_email)
      and ti.status = 'pending'
      and ti.expires_at > now()
  );
$$;

create or replace function public.is_team_member(target_team_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_members tm
    where tm.team_id = target_team_id
      and tm.user_id = auth.uid()
  );
$$;

drop policy if exists "Team members can view teams" on public.teams;
create policy "Team members can view teams"
on public.teams
for select
to authenticated
using (public.is_team_member(id));

drop policy if exists "Team members can view team members" on public.team_members;
create policy "Team members can view team members"
on public.team_members
for select
to authenticated
using (public.is_team_member(team_id));

drop policy if exists "Team admins can view invitations" on public.team_invitations;
create policy "Team admins can view invitations"
on public.team_invitations
for select
to authenticated
using (public.can_manage_team_invitations(team_id));

drop policy if exists "Invited users can view own invitations" on public.team_invitations;
create policy "Invited users can view own invitations"
on public.team_invitations
for select
to authenticated
using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

drop policy if exists "Team admins can create invitations" on public.team_invitations;
create policy "Team admins can create invitations"
on public.team_invitations
for insert
to authenticated
with check (
  public.can_manage_team_invitations(team_id)
  and invited_by = auth.uid()
  and status = 'pending'
);

drop policy if exists "Team admins can update invitations" on public.team_invitations;
create policy "Team admins can update invitations"
on public.team_invitations
for update
to authenticated
using (public.can_manage_team_invitations(team_id))
with check (public.can_manage_team_invitations(team_id));

drop policy if exists "Invited users can accept own invitations" on public.team_invitations;
create policy "Invited users can accept own invitations"
on public.team_invitations
for update
to authenticated
using (
  status = 'pending'
  and expires_at > now()
  and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
)
with check (
  status = 'accepted'
  and accepted_by = auth.uid()
  and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

drop policy if exists "Invited users can join teams" on public.team_members;
create policy "Invited users can join teams"
on public.team_members
for insert
to authenticated
with check (
  user_id = auth.uid()
  and role = 'member'
  and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  and public.has_pending_team_invitation(team_id, auth.jwt() ->> 'email')
);

drop policy if exists "Team owners can invite members" on public.team_members;
drop function if exists public.can_invite_team_member(uuid);
