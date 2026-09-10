begin;
set local lock_timeout = '5s';
set local statement_timeout = '2min';

-- SECURITY INVOKER preserves the existing RLS policies. Explicit scope checks
-- also reject the entire batch when one task belongs to a different user/team.
create function public.reorder_own_tasks(target_team_id uuid, task_changes jsonb)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  requested integer;
  locked integer;
  changed integer;
begin
  if actor_id is null or not public.is_team_member(target_team_id) then
    raise exception using errcode = '42501', message = 'Team membership required.';
  end if;
  if task_changes is null or jsonb_typeof(task_changes) <> 'array' then
    raise exception using errcode = '22023', message = 'Invalid task changes.';
  end if;
  requested := jsonb_array_length(task_changes);
  if requested < 1 or requested > 1000 or pg_column_size(task_changes) > 262144 then
    raise exception using errcode = '22023', message = 'Invalid task batch size.';
  end if;
  if exists (
    select 1 from jsonb_array_elements(task_changes) as item
    where jsonb_typeof(item) <> 'object'
       or item ->> 'id' is null or item ->> 'id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       or item ->> 'status' is null or item ->> 'status' not in ('todo', 'in_progress', 'done')
       or jsonb_typeof(item -> 'sort_order') is distinct from 'number'
       or item ->> 'sort_order' !~ '^[0-9]{1,9}$'
       or item - array['id', 'status', 'sort_order'] <> '{}'::jsonb
  ) or (select count(distinct item ->> 'id') from jsonb_array_elements(task_changes) as item) <> requested then
    raise exception using errcode = '22023', message = 'Invalid task changes.';
  end if;

  -- Consistent lock order avoids deadlocks between overlapping reorder batches.
  perform task.id from public.tasks as task
  join jsonb_to_recordset(task_changes) as change(id uuid, status text, sort_order integer) on task.id = change.id
  where task.user_id = actor_id and task.team_id = target_team_id
  order by task.id for update of task;
  get diagnostics locked = row_count;
  if locked <> requested then
    raise exception using errcode = '42501', message = 'One or more tasks are unavailable.';
  end if;

  -- Populate from the table's row type to support either text or enum statuses.
  update public.tasks as task
  set status = change.status, sort_order = change.sort_order
  from jsonb_populate_recordset(null::public.tasks, task_changes) as change
  where task.id = change.id and task.user_id = actor_id and task.team_id = target_team_id;
  get diagnostics changed = row_count;
  if changed <> requested then
    raise exception using errcode = '42501', message = 'Task order could not be saved.';
  end if;
  return changed;
end;
$$;
revoke all on function public.reorder_own_tasks(uuid, jsonb) from public, anon;
grant execute on function public.reorder_own_tasks(uuid, jsonb) to authenticated;
commit;
