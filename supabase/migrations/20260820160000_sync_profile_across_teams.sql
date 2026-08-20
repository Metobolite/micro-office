begin;

-- Keep the authenticated user's denormalized team-member profile consistent
-- in every workspace. Reading from auth.users inside one statement makes
-- concurrent saves converge on the latest Auth profile instead of allowing an
-- older request to overwrite a newer avatar in one of the user's teams.
create or replace function public.sync_own_profile_settings()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  actor_email text;
  profile_metadata jsonb;
  clean_name text;
  clean_phone text;
  clean_avatar text;
  updated_memberships bigint;
begin
  if actor_id is null then
    raise exception using
      errcode = '42501',
      message = 'Authentication is required to update profile settings.';
  end if;

  select
    account.email,
    coalesce(account.raw_user_meta_data, '{}'::jsonb)
  into actor_email, profile_metadata
  from auth.users as account
  where account.id = actor_id;

  if not found then
    raise exception using
      errcode = '42501',
      message = 'The authenticated profile could not be found.';
  end if;

  clean_name := coalesce(
    nullif(btrim(profile_metadata ->> 'full_name'), ''),
    nullif(btrim(profile_metadata ->> 'name'), ''),
    nullif(split_part(actor_email, '@', 1), ''),
    'User'
  );
  clean_phone := nullif(btrim(profile_metadata ->> 'phone'), '');
  clean_avatar := nullif(
    btrim(profile_metadata ->> 'profile_avatar_url'),
    ''
  );

  if clean_avatar is null or clean_avatar !~* '^https?://' then
    clean_avatar := coalesce(
      nullif(btrim(profile_metadata ->> 'picture'), ''),
      nullif(btrim(profile_metadata ->> 'avatar_url'), '')
    );
  end if;

  if char_length(clean_name) < 2 or char_length(clean_name) > 80 then
    raise exception using
      errcode = '22023',
      message = 'Profile name must be between 2 and 80 characters.';
  end if;

  if clean_phone is not null and char_length(clean_phone) > 30 then
    raise exception using
      errcode = '22023',
      message = 'Profile phone number cannot be longer than 30 characters.';
  end if;

  if clean_avatar is not null and clean_avatar !~* '^https?://' then
    clean_avatar := null;
  end if;

  update public.team_members
  set
    name = clean_name,
    phone = clean_phone,
    avatar_url = clean_avatar
  where user_id = actor_id;

  get diagnostics updated_memberships = row_count;
  return updated_memberships;
end;
$$;

revoke all on function public.sync_own_profile_settings() from public, anon;
grant execute on function public.sync_own_profile_settings() to authenticated;

commit;
