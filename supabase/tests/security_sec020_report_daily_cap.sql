-- Age only transaction-local fixtures to test the daily boundary without waits.
begin;
set local statement_timeout = '30s';
set local lock_timeout = '3s';
set local plpgsql.check_asserts = on;
do $$
declare
  actors uuid[]; post_ids uuid[]:=array[gen_random_uuid(),gen_random_uuid()];
  i integer; peer integer; j integer; c uuid; result jsonb;
begin
  select array_agg(user_id order by nickname) into actors from public.profiles
    where nickname in ('kakaoQA','googleQA') and role='user';
  assert cardinality(actors)=2, 'approved_normal_accounts_required';
  assert not exists(select 1 from public.reports where reporter_id=any(actors) and created_at>now()-interval '1 day'), 'recent_reports_abort';
  assert not exists(select 1 from public.community_reporter_flags where reporter_id=any(actors)), 'existing_flags_abort';
  assert not exists(select 1 from public.comments where user_id=any(actors) and created_at>now()-interval '10 minutes'), 'recent_comments_abort';
  for i in 1..2 loop
    perform set_config('request.jwt.claims',jsonb_build_object('sub',actors[i],'role','authenticated')::text,true);
    set local role authenticated;
    insert into public.posts(id,user_id,title,content)
      values(post_ids[i],actors[i],'NURI_SECURITY_REMAINING_020_DAILY_'||i,'isolated daily cap');
    reset role;
  end loop;
  for i in 1..2 loop
    peer:=3-i;
    for j in 1..21 loop
      c:=gen_random_uuid();
      perform set_config('request.jwt.claims',jsonb_build_object('sub',actors[peer],'role','authenticated')::text,true);
      set local role authenticated;
      insert into public.comments(id,post_id,user_id,content)
        values(c,post_ids[peer],actors[peer],'NURI_SECURITY_REMAINING_020_DAILY_'||i||'_'||j);
      reset role;
      update public.comments set created_at=now()-interval '2 hours' where id=c;
      perform set_config('request.jwt.claims',jsonb_build_object('sub',actors[i],'role','authenticated')::text,true);
      set local role authenticated;
      result:=public.community_submit_report_v1('comment',c,'other','NURI_SECURITY_REMAINING_020_DAILY');
      if j<=20 then assert result->>'status'='created', 'daily_normal_allow';
      else assert result->>'code'='COMMUNITY_REPORT_RATE_LIMITED', 'twenty_first_report_denied'; end if;
      reset role;
      update public.reports set created_at=now()-interval '2 hours' where reporter_id=actors[i] and target_type='comment' and target_id=c;
    end loop;
    assert (select count(*)=20 from public.reports where reporter_id=actors[i] and reason='NURI_SECURITY_REMAINING_020_DAILY'), 'exactly_twenty_reports';
    assert (select rate_limit_hit_count=1 from public.community_reporter_flags where reporter_id=actors[i]), 'daily_rate_trace';
  end loop;
end;
$$;
rollback;
select 'SEC-020 PASS: bilateral 20/day allow, 21st deny, trusted rate trace; rollback' as result;
