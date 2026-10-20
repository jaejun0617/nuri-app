-- MUST execute inside BEGIN/ROLLBACK. No durable Auth QA account is created.
set local lock_timeout='3s';
create temporary table walk_delete_fixture(k text primary key,id uuid default gen_random_uuid(),cap text default encode(extensions.gen_random_bytes(32),'hex')) on commit drop;
insert into walk_delete_fixture(k) select unnest(array['owner','other','pet','pet2','foreign','rp','rp2','ra','rf','missing','no_gen']);
grant select on walk_delete_fixture to authenticated,anon,service_role;
create function pg_temp.wd_id(k text) returns uuid language sql stable as $$select id from walk_delete_fixture where walk_delete_fixture.k=$1$$;
create function pg_temp.wd_cap(k text) returns text language sql stable as $$select cap from walk_delete_fixture where walk_delete_fixture.k=$1$$;
create function pg_temp.wd_assert(v boolean,label text) returns void language plpgsql as $$
begin if v is distinct from true then raise exception 'WALK_DELETE_TEST:%',label;end if;end $$;
create function pg_temp.wd_expect(sql text,expected text) returns void language plpgsql as $$
declare d text;
begin begin execute sql;exception when others then
 get stacked diagnostics d=pg_exception_detail;
 if sqlstate=expected then return;end if;
 if nullif(d,'') is not null and d::jsonb->>'walkCode'=expected then return;end if;
 raise exception 'WALK_DELETE_WRONG_ERROR:%:%',expected,sqlstate;
 end;raise exception 'WALK_DELETE_EXPECTED_ERROR:%',expected;end $$;
insert into auth.users(id,raw_user_meta_data,created_at)
select id,jsonb_build_object('nickname','wd'||left(replace(id::text,'-',''),8)),clock_timestamp() from walk_delete_fixture where k in ('owner','other');
insert into public.pets(id,user_id,name,created_at)
select id,pg_temp.wd_id(case when k='foreign' then 'other' else 'owner' end),'Walk deletion rollback fixture',transaction_timestamp()
from walk_delete_fixture where k in ('pet','pet2','foreign');
select set_config('request.jwt.claim.sub',pg_temp.wd_id('owner')::text,true);
set local role authenticated;
do $$declare r jsonb;
begin
 r:=public.prepare_walk_final_deletion_v1(pg_temp.wd_id('rp'),'PET_FINAL',pg_temp.wd_id('pet'),pg_temp.wd_cap('rp'));
 perform pg_temp.wd_assert(r->>'state'='PENDING','prepared_not_final');
 perform pg_temp.wd_assert(public.prepare_walk_final_deletion_v1(pg_temp.wd_id('rp'),'PET_FINAL',pg_temp.wd_id('pet'),pg_temp.wd_cap('rp'))=r,'exact_replay');
 perform pg_temp.wd_expect(format('select public.prepare_walk_final_deletion_v1(%L,''PET_FINAL'',%L,%L)',pg_temp.wd_id('rp'),pg_temp.wd_id('pet'),pg_temp.wd_cap('ra')),'WALK_DELETE_REQUEST_CONFLICT');
 perform pg_temp.wd_assert(public.prepare_walk_final_deletion_v1(pg_temp.wd_id('rp2'),'PET_FINAL',pg_temp.wd_id('pet'),pg_temp.wd_cap('rp2'))->>'state'='PENDING','device_b_independent_watch_while_a_offline');
 perform pg_temp.wd_expect(format('select public.prepare_walk_final_deletion_v1(%L,''PET_FINAL'',%L,%L)',pg_temp.wd_id('rf'),pg_temp.wd_id('foreign'),pg_temp.wd_cap('rf')),'WALK_DELETE_TARGET_UNAVAILABLE');
 perform pg_temp.wd_expect('select count(*) from walk_private.final_deletion_receipts','42501');
 perform pg_temp.wd_expect('update walk_private.final_deletion_receipts set owner_ref=null','42501');
 perform public.prepare_walk_final_deletion_v1(pg_temp.wd_id('ra'),'ACCOUNT_FINAL',null,pg_temp.wd_cap('ra'));
end $$;
reset role;
-- Direct privileged ref clearing cannot manufacture a FINAL while parent lives.
select pg_temp.wd_expect(format('update walk_private.final_deletion_receipts set pet_ref=null where request_id=%L',pg_temp.wd_id('rp')),'WALK_DELETE_NOT_FINAL');
select pg_temp.wd_expect(format('update walk_private.final_deletion_receipts set state=''FINAL'',confirmed_at=now() where request_id=%L',pg_temp.wd_id('rp')),'WALK_DELETE_NOT_FINAL');
select pg_temp.wd_expect(format('update walk_private.final_deletion_receipts set resource_binding=repeat(''0'',64) where request_id=%L',pg_temp.wd_id('rp')),'WALK_DELETE_RECEIPT_IMMUTABLE');
select pg_temp.wd_expect(format('update walk_private.final_deletion_receipts set owner_binding=null where request_id=%L',pg_temp.wd_id('rp')),'WALK_DELETE_RECEIPT_IMMUTABLE');
-- Actual failing proof update rolls its parent DELETE back, not just the receipt.
create function pg_temp.wd_inject() returns trigger language plpgsql as $$begin
 if old.request_id=pg_temp.wd_id('rp') and new.pet_ref is null then raise exception using errcode='XX000',message='owned proof failure';end if;return new;end $$;
create trigger zz_owned_delete_failure before update on walk_private.final_deletion_receipts for each row execute function pg_temp.wd_inject();
select pg_temp.wd_expect(format('delete from public.pets where id=%L',pg_temp.wd_id('pet')),'XX000');
select pg_temp.wd_assert(exists(select 1 from public.pets where id=pg_temp.wd_id('pet'))
 and (select state='PENDING' from walk_private.final_deletion_receipts where request_id=pg_temp.wd_id('rp')),'delete_and_proof_rollback');
drop trigger zz_owned_delete_failure on walk_private.final_deletion_receipts;
-- Actual app-shaped owner delete; deliberately discard its response.
set local role authenticated;
delete from public.pets where id=pg_temp.wd_id('pet') and user_id=auth.uid();
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
do $$declare r jsonb;
begin
 r:=public.recover_walk_final_deletion_v1(pg_temp.wd_id('rp'),'PET_FINAL',pg_temp.wd_cap('rp'));
 perform pg_temp.wd_assert(public.recover_walk_final_deletion_v1(pg_temp.wd_id('rp2'),'PET_FINAL',pg_temp.wd_cap('rp2'))->>'state'='FINAL','one_delete_finalizes_both_devices');
 perform pg_temp.wd_assert(r->>'state'='FINAL' and r->>'confirmedAt' is not null,'lost_response_no_jwt_reconstruction');
 perform pg_temp.wd_assert(not(r ?| array['ownerId','petId','capability','route','distance','content','media']),'minimal_projection');
 perform pg_temp.wd_assert(public.recover_walk_final_deletion_v1(pg_temp.wd_id('ra'),'ACCOUNT_FINAL',pg_temp.wd_cap('ra'))->>'state'='PENDING','pet_removal_not_account_final');
 perform pg_temp.wd_expect(format('select public.recover_walk_final_deletion_v1(%L,''PET_FINAL'',%L)',pg_temp.wd_id('rp'),pg_temp.wd_cap('ra')),'WALK_DELETE_RECEIPT_UNAVAILABLE');
 perform pg_temp.wd_expect(format('select public.recover_walk_final_deletion_v1(%L,''ACCOUNT_FINAL'',%L)',pg_temp.wd_id('rp'),pg_temp.wd_cap('rp')),'WALK_DELETE_RECEIPT_UNAVAILABLE');
 perform pg_temp.wd_expect(format('select public.recover_walk_final_deletion_v1(%L,''PET_FINAL'',%L)',pg_temp.wd_id('missing'),pg_temp.wd_cap('missing')),'WALK_DELETE_RECEIPT_UNAVAILABLE');
 perform pg_temp.wd_expect(format('select public.ack_walk_final_deletion_v1(%L,''ACCOUNT_FINAL'',%L)',pg_temp.wd_id('ra'),pg_temp.wd_cap('ra')),'WALK_DELETE_NOT_FINAL');
 r:=public.ack_walk_final_deletion_v1(pg_temp.wd_id('rp'),'PET_FINAL',pg_temp.wd_cap('rp'));
 perform pg_temp.wd_assert(r->>'state'='ACKNOWLEDGED','ack_after_local_done');
 perform pg_temp.wd_assert(public.ack_walk_final_deletion_v1(pg_temp.wd_id('rp'),'PET_FINAL',pg_temp.wd_cap('rp'))=r,'ack_lost_response_replay');
end $$;
reset role;
select pg_temp.wd_assert((select owner_binding is null and pet_binding is null from walk_private.final_deletion_receipts where request_id=pg_temp.wd_id('rp')),'ack_clears_redundant_hashes');
select set_config('request.jwt.claim.sub',pg_temp.wd_id('owner')::text,true);
set local role authenticated;
select pg_temp.wd_expect(format('select public.prepare_walk_final_deletion_v1(%L,''PET_FINAL'',%L,%L)',pg_temp.wd_id('missing'),pg_temp.wd_id('pet'),pg_temp.wd_cap('missing')),'WALK_DELETE_TARGET_UNAVAILABLE');
reset role;
-- UUID reuse is not permission to reuse the old request or reattach its FK.
insert into public.pets(id,user_id,name,created_at) values(pg_temp.wd_id('pet'),pg_temp.wd_id('owner'),'Recreated rollback fixture',now()+interval '1 second');
set local role authenticated;
select pg_temp.wd_expect(format('select public.prepare_walk_final_deletion_v1(%L,''PET_FINAL'',%L,%L)',pg_temp.wd_id('rp'),pg_temp.wd_id('pet'),pg_temp.wd_cap('rp')),'WALK_DELETE_REQUEST_CONFLICT');
reset role;
select pg_temp.wd_assert((select pet_ref is null from walk_private.final_deletion_receipts where request_id=pg_temp.wd_id('rp')),'recreated_uuid_does_not_reattach');
-- Even a copied/mutable timestamp cannot revive a completed request. FK
-- lifecycle, not nullable/mutable created_at alone, is the final proof.
update public.pets set created_at=transaction_timestamp() where id=pg_temp.wd_id('pet');
set local role authenticated;
select pg_temp.wd_expect(format('select public.prepare_walk_final_deletion_v1(%L,''PET_FINAL'',%L,%L)',pg_temp.wd_id('rp'),pg_temp.wd_id('pet'),pg_temp.wd_cap('rp')),'WALK_DELETE_REQUEST_STALE');
select pg_temp.wd_expect(format('select public.prepare_walk_final_deletion_v1(%L,''PET_FINAL'',%L,%L)',pg_temp.wd_id('rp2'),pg_temp.wd_id('pet'),pg_temp.wd_cap('rp2')),'WALK_DELETE_REQUEST_STALE');
reset role;
-- Actual pets.created_at is NOT NULL; Auth.created_at is nullable. Exercise
-- the latter missing-generation denial without weakening either schema.
update auth.users set created_at=null where id=pg_temp.wd_id('other');
select set_config('request.jwt.claim.sub',pg_temp.wd_id('other')::text,true);
set local role authenticated;
select pg_temp.wd_expect(format('select public.prepare_walk_final_deletion_v1(%L,''ACCOUNT_FINAL'',null,%L)',pg_temp.wd_id('no_gen'),pg_temp.wd_cap('no_gen')),'WALK_DELETE_GENERATION_UNAVAILABLE');
reset role;
update auth.users set created_at=clock_timestamp() where id=pg_temp.wd_id('other');
select set_config('request.jwt.claim.sub',pg_temp.wd_id('owner')::text,true);
-- Existing real account pipeline, synthetic rollback owner only. Grace/compat
-- state cannot confirm: only the actual auth.users FK transition can do that.
insert into public.account_deletion_requests(user_id,status,scheduled_deletion_at) values(pg_temp.wd_id('owner'),'pending_grace_period',now()+interval '7 days');
select pg_temp.wd_assert(public.recover_walk_final_deletion_v1(pg_temp.wd_id('ra'),'ACCOUNT_FINAL',pg_temp.wd_cap('ra'))->>'state'='PENDING','grace_not_final');
update public.account_deletion_requests set scheduled_deletion_at=now()-interval '1 second' where user_id=pg_temp.wd_id('owner');
set local role service_role;
do $$declare x uuid;r jsonb;
begin select id into x from public.account_deletion_requests where user_id=pg_temp.wd_id('owner');
 r:=public.execute_account_deletion_request(x);
 perform pg_temp.wd_assert(r->>'actual_status' in ('completed','completed_with_cleanup_pending'),'existing_pipeline_finished');
end $$;
reset role;
select pg_temp.wd_assert(not exists(select 1 from auth.users where id=pg_temp.wd_id('owner')),'auth_actually_deleted');
-- Stale JWT cannot PREPARE even though its sub still exists in request claims.
set local role authenticated;
select pg_temp.wd_expect(format('select public.prepare_walk_final_deletion_v1(%L,''ACCOUNT_FINAL'',null,%L)',pg_temp.wd_id('missing'),pg_temp.wd_cap('missing')),'WALK_DELETE_OWNER_UNAVAILABLE');
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
select pg_temp.wd_assert(public.recover_walk_final_deletion_v1(pg_temp.wd_id('ra'),'ACCOUNT_FINAL',pg_temp.wd_cap('ra'))->>'state'='FINAL','post_auth_delete_no_jwt_final');
select pg_temp.wd_expect(format('select public.prepare_walk_final_deletion_v1(%L,''ACCOUNT_FINAL'',null,%L)',pg_temp.wd_id('missing'),pg_temp.wd_cap('missing')),'42501');
reset role;
-- No global custom trigger/function was added; direct FK actions alone suffice.
select pg_temp.wd_assert((select relrowsecurity from pg_class where oid='walk_private.final_deletion_receipts'::regclass),'rls_enabled');
select pg_temp.wd_assert(not has_function_privilege('anon','public.prepare_walk_final_deletion_v1(uuid,text,uuid,text)','execute')
 and not has_function_privilege('service_role','public.recover_walk_final_deletion_v1(uuid,text,text)','execute'),'minimal_grants');
select pg_temp.wd_assert(not exists(select 1 from walk_private.final_deletion_receipts where state in ('FINAL','ACKNOWLEDGED') and(owner_ref is not null or pet_ref is not null)),'final_erases_raw_refs');
select set_config('request.jwt.claim.sub',pg_temp.wd_id('other')::text,true);
set local role authenticated;
do $$declare p uuid;
begin
 for n in 1..64 loop
   insert into public.pets(user_id,name) values(auth.uid(),'Bounded rollback fixture') returning id into p;
   perform public.prepare_walk_final_deletion_v1(gen_random_uuid(),'PET_FINAL',p,repeat('a',64));
 end loop;
 insert into public.pets(user_id,name) values(auth.uid(),'Cap rejection rollback fixture') returning id into p;
 perform pg_temp.wd_expect(format('select public.prepare_walk_final_deletion_v1(gen_random_uuid(),''PET_FINAL'',%L,repeat(''a'',64))',p),'WALK_DELETE_RECEIPT_LIMIT');
end $$;
reset role;
select 'WALK_FINAL_DELETE_SQL_PASS' result;
