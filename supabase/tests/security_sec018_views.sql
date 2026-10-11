begin;
set local statement_timeout='30s';
set local lock_timeout='3s';
set local plpgsql.check_asserts=on;
do $$
declare
  actors uuid[]; actor uuid; other_actor uuid; post_ids uuid[]:=array[gen_random_uuid(),gen_random_uuid()];
  private_id uuid:=gen_random_uuid(); hidden_id uuid:=gen_random_uuid(); extra_id uuid:=gen_random_uuid();
  missing_id uuid:=gen_random_uuid(); guest text:=gen_random_uuid()::text;
  r record; i integer; j integer; denied boolean;
begin
  select array_agg(user_id order by nickname) into actors from public.profiles
    where nickname in ('kakaoQA','googleQA') and role='user';
  assert cardinality(actors)=2,'approved_accounts';
  for i in 1..2 loop
    perform set_config('request.jwt.claims',jsonb_build_object('sub',actors[i],'role','authenticated')::text,true);
    insert into public.posts(id,user_id,title,content,visibility,created_at)
      values(post_ids[i],actors[i],'NURI_SECURITY_SEC018','isolated','public',now()-interval '1 day');
  end loop;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',actors[1],'role','authenticated')::text,true);
  insert into public.posts(id,user_id,title,content,visibility,status,view_count,created_at)
    values(private_id,actors[1],'NURI_SECURITY_SEC018_PRIVATE','isolated','private','active',73,now()-interval '1 day'),
          (hidden_id,actors[1],'NURI_SECURITY_SEC018_HIDDEN','isolated','public','hidden',81,now()-interval '1 day'),
          (extra_id,actors[1],'NURI_SECURITY_SEC018_EXTRA','isolated','public','active',0,now()-interval '1 day');
  for i in 1..2 loop
    actor:=actors[i]; other_actor:=actors[3-i];
    perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
    set local role authenticated;
    select * into r from public.record_community_post_view(post_ids[i],null);
    assert not r.counted and r.reason='self_view' and r.view_count=i-1,'normal_self';
    select * into r from public.record_community_post_view(post_ids[3-i],null);
    assert r.counted and r.view_count=1,'normal_peer_view';
    select * into r from public.record_community_post_view(post_ids[3-i],gen_random_uuid()::text);
    assert not r.counted and r.reason='deduped' and r.view_count=1,'auth_identity_not_guest_id';
    foreach missing_id in array array[private_id,hidden_id,gen_random_uuid()] loop
      select * into r from public.record_community_post_view(missing_id,null);
      assert not r.counted and r.reason='post_ineligible' and r.view_count=0,'identical_ineligible_including_owner';
    end loop;
    denied:=false;
    begin insert into public.community_post_view_events(post_id,viewer_user_id,dedupe_window_start)
      values(post_ids[i],actor,now()); exception when insufficient_privilege then denied:=true; end;
    assert denied,'direct_event_write_denied';
    denied:=false;
    begin perform public.claim_community_view_budget_v1(actor,post_ids[i],now());
    exception when insufficient_privilege then denied:=true; end;
    assert denied,'private_budget_helper_denied';
    reset role;
    begin
      insert into public.community_user_blocks(blocker_user_id,blocked_user_id) values(actor,other_actor);
      set local role authenticated;
      select * into r from public.record_community_post_view(post_ids[3-i],null);
      assert r.reason='post_ineligible' and r.view_count=0,'blocked_count_oracle_denied';
      raise sqlstate 'ZX018';
    exception when sqlstate 'ZX018' then null; end;
  end loop;
  perform set_config('request.jwt.claims','{"role":"anon"}',true);
  set local role anon;
  select * into r from public.record_community_post_view(post_ids[1],guest);
  assert r.counted and r.view_count=2 and r.viewer_type='guest','normal_guest';
  select * into r from public.record_community_post_view(post_ids[1],guest);
  assert not r.counted and r.reason='deduped','guest_dedupe';
  select * into r from public.record_community_post_view(post_ids[1],repeat('x',1000));
  assert not r.counted and r.reason='missing_guest_session','oversized_arbitrary_id_denied';
  for j in 2..101 loop
    select * into r from public.record_community_post_view(post_ids[1],gen_random_uuid()::text);
    assert r.counted=(j<=100),'rotating_guest_ids_bounded';
  end loop;
  assert r.reason='view_limited' and r.view_count=101,'per_post_hundred';
  foreach missing_id in array array[private_id,hidden_id,gen_random_uuid()] loop
    select * into r from public.record_community_post_view(missing_id,guest);
    assert r.reason='post_ineligible' and r.view_count=0,'guest_no_oracle';
  end loop;
  reset role;
  -- Move only transaction-local counters to limit/rollover boundaries.
  update public.community_view_budgets set day_count=10000 where bucket_key='global:guest';
  set local role anon;
  select * into r from public.record_community_post_view(extra_id,gen_random_uuid()::text);
  assert not r.counted and r.reason='view_limited','global_guest_day_cap';
  reset role;
  update public.community_view_budgets set day_start=day_start-interval '1 day',period_start=period_start-interval '1 day'
    where bucket_key='global:guest';
  set local role anon;
  select * into r from public.record_community_post_view(extra_id,gen_random_uuid()::text);
  assert r.counted,'budget_rollover';
  reset role;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',actors[2],'role','authenticated')::text,true);
  update public.community_view_budgets set day_count=500 where bucket_key='user:'||actors[2]::text;
  set local role authenticated;
  select * into r from public.record_community_post_view(extra_id,null);
  assert not r.counted and r.reason='view_limited','account_day_cap';
  reset role;
end $$;
rollback;
select 'PASS SEC-018: bilateral auth/self/dedupe, normal guest, rotating guest IDs bounded, hidden/private/missing/blocked uniform zero, direct writes denied, global/account budgets and rollover; rollback' as result;
