-- Index the filters and sort orders used by the dashboard routes.
-- IF NOT EXISTS keeps this migration safe for projects that already have
-- equivalent indexes under these names.

create index if not exists team_members_user_joined_idx
  on public.team_members (user_id, joined_at desc, team_id);

create index if not exists team_members_team_joined_idx
  on public.team_members (team_id, joined_at desc);

create index if not exists tasks_user_team_board_idx
  on public.tasks (user_id, team_id, status, sort_order);

create index if not exists tasks_team_created_idx
  on public.tasks (team_id, created_at desc);

create index if not exists tasks_team_status_idx
  on public.tasks (team_id, status);

create index if not exists files_user_team_uploaded_idx
  on public.files (user_id, team_id, uploaded_at desc);

create index if not exists files_team_uploaded_idx
  on public.files (team_id, uploaded_at desc);

create index if not exists messages_team_inserted_idx
  on public.messages (team_id, inserted_at desc);

create index if not exists events_user_team_date_idx
  on public.events (user_id, team_id, date);

do $$
begin
  -- Time tracking is optional in older installations of this project.
  if to_regclass('public.time_entries') is not null then
    execute '
      create index if not exists time_entries_user_team_started_idx
      on public.time_entries (user_id, team_id, start_time desc)
    ';
  end if;
end
$$;

create index if not exists team_invitations_token_hash_idx
  on public.team_invitations (token_hash);

create index if not exists team_invitations_team_email_status_idx
  on public.team_invitations (team_id, email, status);
