-- Requires the existing Supabase Storage schema and buckets. Configure bucket
-- limits through the Storage API/dashboard: user-files private, <=100 MiB;
-- avatars public, <=5 MiB, image/jpeg, image/png, image/webp only.
-- This migration defines policies, never updates/deletes stored objects.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '2min';

do $$
begin
  if not exists (select 1 from storage.buckets where id = 'user-files' and not public) then
    raise exception 'Configure the private user-files bucket before applying Storage policies.';
  end if;
  if not exists (select 1 from storage.buckets where id = 'avatars') then
    raise exception 'Configure the avatars bucket before applying Storage policies.';
  end if;
end;
$$;

create function public.owns_app_storage_path(target_bucket text, object_name text)
returns boolean
language sql stable
set search_path = ''
as $$
  select coalesce(
    auth.uid() is not null
    and split_part(object_name, '/', 1) = auth.uid()::text
    and case target_bucket
      when 'user-files' then object_name ~ '^[0-9a-f-]+/[a-zA-Z0-9_.-]+$'
      when 'avatars' then object_name ~ '^[0-9a-f-]+/avatars/[a-zA-Z0-9_.-]+\.(jpg|jpeg|png|webp)$'
      else false end
    and object_name !~ '(^|/)\.{1,2}(/|$)', false);
$$;

create function public.can_read_app_storage(target_bucket text, object_name text)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select public.owns_app_storage_path(target_bucket, object_name)
    and (target_bucket = 'avatars'
      -- Owner-only orphan access allows upload compensation and Storage's
      -- SELECT-before-DELETE after a file record has been removed.
      or not exists (select 1 from public.files where path = object_name)
      or exists (select 1 from public.files where path = object_name
        and user_id = auth.uid() and public.is_team_member(team_id)));
$$;
revoke all on function public.owns_app_storage_path(text, text) from public, anon;
revoke all on function public.can_read_app_storage(text, text) from public, anon;
grant execute on function public.owns_app_storage_path(text, text) to authenticated;
grant execute on function public.can_read_app_storage(text, text) to authenticated;

-- Restrictive guards intersect with any old broad policies; unrelated buckets
-- retain their existing policies. Public avatar URLs remain intentionally public.
create policy micro_office_storage_select_allow on storage.objects
as permissive for select to authenticated
using (public.can_read_app_storage(bucket_id, name));
create policy micro_office_storage_select_guard on storage.objects
as restrictive for select to authenticated
using (bucket_id not in ('user-files', 'avatars') or public.can_read_app_storage(bucket_id, name));

create policy micro_office_storage_insert_allow on storage.objects
as permissive for insert to authenticated
with check (public.owns_app_storage_path(bucket_id, name));
create policy micro_office_storage_insert_guard on storage.objects
as restrictive for insert to authenticated
with check (bucket_id not in ('user-files', 'avatars') or public.owns_app_storage_path(bucket_id, name));

-- The UI uses fresh random paths and upsert:false. Disallow overwrite/move to
-- prevent changing content behind an already-authorized file or signed URL.
create policy micro_office_storage_update_guard on storage.objects
as restrictive for update to authenticated
using (bucket_id not in ('user-files', 'avatars'))
with check (bucket_id not in ('user-files', 'avatars'));

create policy micro_office_storage_delete_allow on storage.objects
as permissive for delete to authenticated
using (public.can_read_app_storage(bucket_id, name));
create policy micro_office_storage_delete_guard on storage.objects
as restrictive for delete to authenticated
using (bucket_id not in ('user-files', 'avatars') or public.can_read_app_storage(bucket_id, name));
create policy micro_office_storage_anon_guard on storage.objects
as restrictive for all to anon
using (bucket_id not in ('user-files', 'avatars'))
with check (bucket_id not in ('user-files', 'avatars'));
commit;
