-- All targets are transaction-local. Never insert reports against pre-existing content.
begin;
set local statement_timeout = '30s';
set local lock_timeout = '3s';
set local plpgsql.check_asserts = on;
do $$
declare
  actors uuid[];
  post_ids uuid[] := array[gen_random_uuid(),gen_random_uuid()];
  targets uuid[][] := array[
    array[gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid()],
    array[gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid()]
  ];
  i integer; j integer; peer integer; affected integer; denied boolean; result jsonb;
begin
  select array_agg(user_id order by case nickname when 'kakaoQA' then 0 else 1 end)
    into actors from public.profiles where nickname in ('kakaoQA','googleQA') and role='user';
  assert cardinality(actors)=2 and actors[1]<>actors[2], 'approved_normal_accounts_required';
  -- Do not update an existing reporter flag even temporarily.
  assert not exists(select 1 from public.community_reporter_flags where reporter_id=any(actors)), 'existing_flags_abort';
  assert not exists(select 1 from public.reports where reporter_id=any(actors) and created_at>now()-interval '1 day'), 'recent_reports_abort';
  assert not exists(select 1 from public.comments where user_id=any(actors) and created_at>now()-interval '10 minutes'), 'recent_comments_abort';
  for i in 1..2 loop
    perform set_config('request.jwt.claims',jsonb_build_object('sub',actors[i],'role','authenticated')::text,true);
    set local role authenticated;
    insert into public.posts(id,user_id,title,content,category)
      values(post_ids[i],actors[i],'NURI_SECURITY_AB_' || i,'isolated rollback content ' || i,'free');
    for j in 1..5 loop
      insert into public.comments(id,post_id,user_id,content)
        values(targets[i][j],post_ids[i],actors[i],'NURI_SECURITY_AB_' || i || '_' || j);
    end loop;
    reset role;
  end loop;
  for i in 1..2 loop
    peer := 3-i;
    perform set_config('request.jwt.claims',jsonb_build_object('sub',actors[i],'role','authenticated')::text,true);
    set local role authenticated;
    assert (select count(*)=1 from public.posts where id=post_ids[i]), 'own_post_read';
    assert (select count(*)=1 from public.posts where id=post_ids[peer]), 'public_peer_post_read_intentionally_allowed';
    assert (select count(*)=5 from public.comments where post_id=post_ids[peer]), 'public_peer_comments_read_intentionally_allowed';
    update public.posts set content='isolated own edit ' || i where id=post_ids[i];
    get diagnostics affected = row_count; assert affected=1, 'own_post_update';
    update public.posts set title='NURI_SECURITY_AB_FORBIDDEN' where id=post_ids[peer];
    get diagnostics affected = row_count; assert affected=0, 'peer_post_update_denied';
    delete from public.posts where id=post_ids[peer];
    get diagnostics affected = row_count; assert affected=0, 'peer_post_delete_denied';
    update public.comments set content='NURI_SECURITY_AB_FORBIDDEN' where post_id=post_ids[peer];
    get diagnostics affected = row_count; assert affected=0, 'peer_comment_update_denied';
    delete from public.comments where post_id=post_ids[peer];
    get diagnostics affected = row_count; assert affected=0, 'peer_comment_delete_denied';
    denied := false;
    begin
      perform public.bump_community_reporter_rate_limit(actors[peer]);
    exception when insufficient_privilege then denied := true; end;
    assert denied, 'peer_reporter_mutator_denied';
    denied := false;
    begin
      insert into public.reports(reporter_id,target_type,target_id,reason_category,reason)
        values(actors[peer],'post',post_ids[i],'other','NURI_SECURITY_AB_FORGED');
    exception when others then denied := true; end;
    assert denied, 'forged_reporter_denied';
    denied := false;
    begin
      perform public.community_submit_report_v1('post',post_ids[i],'other','NURI_SECURITY_AB_SELF');
    exception when others then denied := true; end;
    assert denied, 'self_report_denied';
    denied := false;
    begin
      perform public.community_submit_report_v1('post',gen_random_uuid(),'other','NURI_SECURITY_AB_MISSING');
    exception when others then denied := true; end;
    assert denied, 'missing_object_denied';
    result := public.community_submit_report_v1('post',post_ids[peer],'other','NURI_SECURITY_AB_VALID');
    assert result->>'status'='created', 'normal_report_created';
    result := public.community_submit_report_v1('post',post_ids[peer],'other','NURI_SECURITY_AB_VALID');
    assert result->>'status'='duplicate', 'normal_report_idempotent';
    for j in 1..4 loop
      result := public.community_submit_report_v1('comment',targets[peer][j],'other','NURI_SECURITY_AB_VALID');
      assert result->>'status'='created', 'normal_comment_report_created';
    end loop;
    result := public.community_submit_report_v1('comment',targets[peer][5],'other','NURI_SECURITY_AB_LIMIT');
    assert result->>'code'='COMMUNITY_REPORT_RATE_LIMITED', 'sixth_report_rate_limited';
    assert (select count(*)=5 from public.reports where reporter_id=actors[i]), 'five_reports_only';
    assert (select count(*)=0 from public.reports where reporter_id=actors[peer]), 'peer_report_trace_private';
    reset role;
    assert (select rate_limit_hit_count=1 from public.community_reporter_flags where reporter_id=actors[i]), 'trusted_trace_survives_failed_insert';
    assert exists(select 1 from public.community_moderation_queue where target_id=post_ids[peer] and report_count=1), 'moderation_queue_preserved';
  end loop;
  assert (select count(*)=10 from public.reports where target_id=any(post_ids) or target_id in (select unnest(targets))), 'reports_total';
end;
$$;
rollback;
select 'PASS: bilateral public read/own edit; cross writes denied; forged reporter/missing/self targets denied; normal report/duplicate/limit/trace/queue verified; rollback complete' as result;
