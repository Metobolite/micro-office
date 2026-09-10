set role anon;
select audit_test.check((select count(*) = 0 from public.tasks), 'anonymous task reads denied');
select audit_test.check((select count(*) = 0 from storage.objects), 'anonymous storage reads denied despite legacy policy');
select audit_test.rejects($q$select public.reorder_own_tasks('10000000-0000-4000-8000-000000000001','[]')$q$, '42501', 'anonymous reorder RPC denied');
select audit_test.rejects($q$select public.accept_team_invitation_secure(repeat('a',64))$q$, '42501', 'anonymous invitation RPC denied');

set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
select set_config('request.jwt.claim.email','alice@example.test',false);
select audit_test.check((select count(*) = 1 from public.tasks), 'tasks exclude other users, including a same-team admin');
select audit_test.check((select count(*) = 1 from public.files), 'file metadata excludes other users');
select audit_test.check((select count(*) = 1 from public.teams), 'teams exclude nonmembers');
select audit_test.check((select count(*) = 2 from public.team_members), 'members exclude other teams');
with changed as (update public.tasks set title = 'forged' where id = '20000000-0000-4000-8000-000000000002' returning id)
select audit_test.check((select count(*) = 0 from changed), 'cross-user task updates denied');
with changed as (delete from public.tasks where id = '20000000-0000-4000-8000-000000000002' returning id)
select audit_test.check((select count(*) = 0 from changed), 'cross-user task deletes denied');
select audit_test.rejects($q$insert into public.tasks(team_id,user_id) values ('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002')$q$, '42501', 'forged task owner denied');
select audit_test.rejects($q$insert into public.tasks(team_id,user_id) values ('10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001')$q$, '42501', 'cross-team task insert denied');
select audit_test.rejects($q$insert into public.team_members(team_id,user_id,role) values ('10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001','owner')$q$, '42501', 'self-enrollment into another team denied');
with changed as (update public.team_members set role = 'owner' where user_id = '00000000-0000-4000-8000-000000000005' returning user_id)
select audit_test.check((select count(*) = 0 from changed), 'direct role escalation denied');
insert into public.messages(team_id,user_id,user_name,content) values ('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','Bob','Synthetic message');
select audit_test.check((select user_name = 'Alice' and user_id = auth.uid() from public.messages limit 1), 'message sender taken from authenticated membership');
select audit_test.rejects($q$insert into public.messages(team_id,user_id,content) values ('10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001','forged')$q$, '42501', 'cross-team messages denied');
select audit_test.rejects($q$insert into public.messages(team_id,user_id,content) values ('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001',repeat('x',4001))$q$, '23514', 'oversized messages denied in database');

select audit_test.check(public.reorder_own_tasks('10000000-0000-4000-8000-000000000001',
 '[{"id":"20000000-0000-4000-8000-000000000001","status":"in_progress","sort_order":1}]') = 1, 'own task reorder succeeds');
select audit_test.rejects($q$select public.reorder_own_tasks('10000000-0000-4000-8000-000000000001',
 '[{"id":"20000000-0000-4000-8000-000000000001","status":"done","sort_order":5},{"id":"20000000-0000-4000-8000-000000000002","status":"done","sort_order":6}]')$q$, '42501', 'mixed cross-team reorder rejected atomically');
select audit_test.check((select sort_order = 1 and status = 'in_progress' from public.tasks limit 1), 'rejected batch leaves own task unchanged');
select audit_test.rejects($q$select public.reorder_own_tasks('10000000-0000-4000-8000-000000000001',
 '[{"id":"20000000-0000-4000-8000-000000000003","status":"done","sort_order":1}]')$q$, '42501', 'same-team cross-user reorder denied');
select audit_test.rejects($q$select public.reorder_own_tasks('10000000-0000-4000-8000-000000000002','[]')$q$, '42501', 'nonmember reorder denied');
select audit_test.rejects($q$select public.reorder_own_tasks('10000000-0000-4000-8000-000000000001',
 '[{"id":"20000000-0000-4000-8000-000000000001","status":"done","sort_order":1,"user_id":"00000000-0000-4000-8000-000000000002"}]')$q$, '22023', 'reorder mass assignment denied');
select audit_test.rejects($q$select public.reorder_own_tasks('10000000-0000-4000-8000-000000000001',
 '[{"id":"20000000-0000-4000-8000-000000000001","status":"done","sort_order":1},{"id":"20000000-0000-4000-8000-000000000001","status":"todo","sort_order":2}]')$q$, '22023', 'duplicate reorder IDs denied');
select audit_test.rejects($q$select public.reorder_own_tasks('10000000-0000-4000-8000-000000000001',
 '[{"id":"20000000-0000-4000-8000-000000000001","status":"done","sort_order":null}]')$q$, '22023', 'null sort order denied');

select audit_test.check((select count(*) = 1 from storage.objects), 'private storage excludes other users');
select audit_test.rejects($q$insert into storage.objects(bucket_id,name) values ('user-files','00000000-0000-4000-8000-000000000002/forged.pdf')$q$, '42501', 'foreign storage prefix upload denied');
select audit_test.rejects($q$insert into storage.objects(bucket_id,name) values ('user-files','00000000-0000-4000-8000-000000000001/../bob.pdf')$q$, '42501', 'storage traversal denied');
select audit_test.rejects($q$insert into storage.objects(bucket_id,name) values ('avatars','00000000-0000-4000-8000-000000000001/avatars/script.svg')$q$, '42501', 'active avatar extension denied');
insert into storage.objects(bucket_id,name) values ('user-files','00000000-0000-4000-8000-000000000001/orphan.pdf');
with changed as (delete from storage.objects where name = '00000000-0000-4000-8000-000000000001/orphan.pdf' returning id)
select audit_test.check((select count(*) = 1 from changed), 'owner upload compensation works without metadata');
with changed as (delete from storage.objects where name = '00000000-0000-4000-8000-000000000002/bob.pdf' returning id)
select audit_test.check((select count(*) = 0 from changed), 'foreign storage deletion denied');
with changed as (update storage.objects set name = '00000000-0000-4000-8000-000000000001/replaced.pdf' returning id)
select audit_test.check((select count(*) = 0 from changed), 'storage move and overwrite denied');
select audit_test.rejects($q$select * from micro_office_private.invitation_limits$q$, '42501', 'rate counters inaccessible to clients');
select audit_test.rejects($q$select public.accept_team_invitation_with_role(repeat('a',64))$q$, '42501', 'legacy invitation RPC is no longer exposed');

insert into public.team_invitations(team_id,email,role,token_hash,invited_by,expires_at) values
 ('10000000-0000-4000-8000-000000000001','carol@example.test','member',repeat('a',64),auth.uid(),now()+interval '7 days'),
 ('10000000-0000-4000-8000-000000000001','unverified@example.test','member',repeat('b',64),auth.uid(),now()+interval '7 days');
select audit_test.rejects($q$insert into public.team_invitations(team_id,email,role,token_hash,invited_by,expires_at) values
 ('10000000-0000-4000-8000-000000000001','fake@example.test','owner',repeat('c',64),auth.uid(),now()+interval '7 days')$q$, '42501', 'owner invitation role denied');
select audit_test.rejects($q$insert into public.team_invitations(team_id,email,role,token_hash,invited_by,expires_at) values
 ('10000000-0000-4000-8000-000000000001','fake@example.test','member',repeat('c',64),'00000000-0000-4000-8000-000000000002',now()+interval '7 days')$q$, '42501', 'forged inviter denied');
select audit_test.rejects($q$insert into public.team_invitations(team_id,email,role,token_hash,invited_by,expires_at) values
 ('10000000-0000-4000-8000-000000000001','fake@example.test','member',repeat('c',64),auth.uid(),now()-interval '1 day')$q$, '22023', 'expired issuance denied');

-- Concurrent instances share these locked counters; no process-local limiter.
do $$ begin
 for n in 1..18 loop
  insert into public.team_invitations(team_id,email,role,token_hash,invited_by,expires_at)
  values ('10000000-0000-4000-8000-000000000001','synthetic-'||n||'@example.test','member',lpad(to_hex(n),64,'0'),auth.uid(),now()+interval '7 days');
 end loop;
end $$;
select audit_test.rejects($q$insert into public.team_invitations(team_id,email,role,token_hash,invited_by,expires_at) values
 ('10000000-0000-4000-8000-000000000001','overflow@example.test','member',repeat('c',64),auth.uid(),now()+interval '7 days')$q$, 'P0001', '21st hourly invitation rejected');
reset role;
select audit_test.check((select attempts = 20 from micro_office_private.invitation_limits where subject='actor:00000000-0000-4000-8000-000000000001'), 'failed inserts do not consume additional quota');
update micro_office_private.invitation_limits set window_start = now()-interval '2 hours';
set role authenticated;
insert into public.team_invitations(team_id,email,role,token_hash,invited_by,expires_at) values
 ('10000000-0000-4000-8000-000000000001','new-window@example.test','member',repeat('c',64),auth.uid(),now()+interval '7 days');
reset role;
select audit_test.check((select attempts = 1 from micro_office_private.invitation_limits where subject='actor:00000000-0000-4000-8000-000000000001'), 'quota resets in a new hour');
update micro_office_private.invitation_limits set window_start=date_trunc('hour',now()), attempts=50 where subject='team:10000000-0000-4000-8000-000000000001';
set role authenticated;
select audit_test.rejects($q$insert into public.team_invitations(team_id,email,role,token_hash,invited_by,expires_at) values
 ('10000000-0000-4000-8000-000000000001','team-overflow@example.test','member',repeat('d',64),auth.uid(),now()+interval '7 days')$q$, 'P0001', 'workspace hourly limit enforced');

select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000005',false);
select audit_test.rejects($q$insert into public.team_invitations(team_id,email,role,token_hash,invited_by,expires_at) values
 ('10000000-0000-4000-8000-000000000001','elevated@example.test','admin',repeat('e',64),auth.uid(),now()+interval '7 days')$q$, '42501', 'admin cannot invite another admin');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
select set_config('request.jwt.claim.email','carol@example.test',false);
select audit_test.rejects($q$select public.accept_team_invitation_secure(repeat('a',64))$q$, '42501', 'wrong account cannot accept using a stale or forged email claim');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000004',false);
select audit_test.rejects($q$select public.accept_team_invitation_secure(repeat('b',64))$q$, '42501', 'unverified recipient denied');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
select set_config('request.jwt.claim.email','carol@example.test',false);

-- Modify only synthetic fixtures as the disposable cluster administrator.
reset role;
update public.team_invitations set expires_at = now()-interval '1 second' where token_hash=repeat('a',64);
set role authenticated;
select audit_test.rejects($q$select public.accept_team_invitation_secure(repeat('a',64))$q$, '42501', 'expired acceptance denied');
reset role;
update public.team_invitations set expires_at = now()+interval '7 days' where token_hash=repeat('a',64);
update public.team_members set role='member' where user_id='00000000-0000-4000-8000-000000000001';
set role authenticated;
select audit_test.rejects($q$select public.accept_team_invitation_secure(repeat('a',64))$q$, '42501', 'revoked inviter privileges denied');
reset role;
update public.team_members set role='owner' where user_id='00000000-0000-4000-8000-000000000001';
set role authenticated;
select audit_test.check(public.accept_team_invitation_secure(repeat('a',64))='10000000-0000-4000-8000-000000000001', 'matching verified recipient accepted');
select audit_test.check((select role = 'member' from public.team_members where user_id=auth.uid()), 'accepted membership receives only invited role');
select audit_test.rejects($q$select public.accept_team_invitation_secure(repeat('a',64))$q$, '42501', 'invitation replay denied');
select audit_test.check((select count(*) = 0 from public.tasks), 'new member cannot read existing members personal tasks');

reset role;
-- Re-open a synthetic invitation to test an already-member account safely.
update public.team_invitations set status='pending', role='admin' where token_hash=repeat('a',64);
set role authenticated;
select public.accept_team_invitation_secure(repeat('a',64));
select audit_test.check((select role = 'member' from public.team_members where user_id=auth.uid()), 'acceptance never elevates an existing membership');

reset role;
delete from public.team_members where user_id='00000000-0000-4000-8000-000000000001';
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
select audit_test.check((select count(*) = 0 from public.files), 'revoked member cannot read linked metadata');
select audit_test.check((select count(*) = 0 from storage.objects), 'revoked member cannot read linked storage objects');
reset role;

insert into public.tasks(team_id,user_id,title,sort_order)
select '10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000002','Batch task '||n,n
from generate_series(1,500) n;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
select audit_test.check(public.reorder_own_tasks('10000000-0000-4000-8000-000000000002',
 (select jsonb_agg(jsonb_build_object('id',id,'status','done','sort_order',501-sort_order))
  from public.tasks where title like 'Batch task %')) = 500, '500 changed tasks saved by one atomic RPC call');
select audit_test.check((select count(*)=500 from public.tasks where title like 'Batch task %' and status='done'), 'large batch commits every requested task');
reset role;
