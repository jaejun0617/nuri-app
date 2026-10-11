-- Approved derived XP changes exist only inside this transaction. No external calls.
begin;
set local statement_timeout='30s';
set local lock_timeout='3s';
set local plpgsql.check_asserts=on;
do $$
declare
  actors uuid[]; pet_ids uuid[]:=array[gen_random_uuid(),gen_random_uuid()];
  memory_ids uuid[]:=array[gen_random_uuid(),gen_random_uuid()];
  m uuid; i integer; j integer; result record; denied boolean; old_total integer;
  multiplier numeric; expected integer; count_before integer; level_before integer;
  fake_id text:=gen_random_uuid()::text;
begin
  select array_agg(user_id order by case nickname when 'kakaoQA' then 0 else 1 end)
    into actors from public.profiles where nickname in ('kakaoQA','googleQA') and role='user';
  assert cardinality(actors)=2, 'approved_accounts';
  for i in 1..2 loop
    perform set_config('request.jwt.claims',jsonb_build_object('sub',actors[i],'role','authenticated')::text,true);
    set local role authenticated;
    insert into public.pets(id,user_id,name) values(pet_ids[i],actors[i],'NURI_SECURITY_SEC017');
    insert into public.memories(id,user_id,pet_id,title,category,created_at)
      values(memory_ids[i],actors[i],pet_ids[i],'NURI_SECURITY_SEC017','walk',now()-interval '1 year');
    assert (select created_at=now() from public.memories where id=memory_ids[i]), 'server_created_at';
    denied:=false;
    begin update public.memories set created_at=now()-interval '1 day' where id=memory_ids[i];
    exception when insufficient_privilege then denied:=true; end;
    assert denied,'timestamp_rewrite_denied';
    reset role;
  end loop;
  for i in 1..2 loop
    perform set_config('request.jwt.claims',jsonb_build_object('sub',actors[i],'role','authenticated')::text,true);
    set local role authenticated;
    denied:=false;
    begin perform public.award_user_activity_xp_v1(pet_ids[i],'walk_timeline_post','timeline_memory',fake_id);
    exception when invalid_parameter_value then denied:=true; end;
    assert denied,'fake_source_denied';
    denied:=false;
    begin perform public.award_user_activity_xp_v1(pet_ids[i],'walk_timeline_post','timeline_memory',memory_ids[3-i]::text);
    exception when invalid_parameter_value then denied:=true; end;
    assert denied,'cross_source_denied_both_directions';
    denied:=false;
    begin perform public.award_user_activity_xp_v1(pet_ids[3-i],'walk_timeline_post','timeline_memory',memory_ids[i]::text);
    exception when insufficient_privilege then denied:=true; end;
    assert denied,'cross_pet_denied';
    denied:=false;
    begin perform public.award_user_activity_xp_v1(pet_ids[i],'health_record','timeline_memory',memory_ids[i]::text);
    exception when invalid_parameter_value then denied:=true; end;
    assert denied,'wrong_event_denied';
    denied:=false;
    begin perform public.award_user_activity_xp_v1(pet_ids[i],'walk_timeline_post','made_up_source',memory_ids[i]::text);
    exception when invalid_parameter_value then denied:=true; end;
    assert denied,'wrong_type_denied';
    denied:=false;
    begin perform public.award_user_activity_xp_v1(pet_ids[i],'streak_30_bonus','pet_daily_activity',pet_ids[i]::text||':streak:30');
    exception when invalid_parameter_value then denied:=true; end;
    assert denied,'fake_bonus_denied';
    denied:=false;
    begin perform public.record_pet_daily_activity_v1(pet_ids[i],'timeline_walk_post',fake_id);
    exception when invalid_parameter_value then denied:=true; end;
    assert denied,'fake_streak_source_denied';
    select coalesce(total_xp,0) into old_total from public.user_level_summaries where user_id=actors[i];
    old_total:=coalesce(old_total,0);
    reset role;
    level_before:=public.calculate_nuri_level_v1(old_total);
    set local role authenticated;
    multiplier:=case when level_before<=10 then 1.0 when level_before<=30 then 0.9 when level_before<=50 then 0.8 when level_before<=70 then 0.7 when level_before<=90 then 0.6 else 0.5 end;
    expected:=greatest(1,round(39*multiplier)::int);
    select * into result from public.award_user_activity_xp_v1(pet_ids[i],'walk_timeline_post','timeline_memory',memory_ids[i]::text);
    assert result.awarded and result.xp_awarded=expected and result.total_xp=old_total+expected,'valid_exact_award_with_decay';
    select count(*) into count_before from public.user_xp_ledger where user_id=actors[i];
    select * into result from public.award_user_activity_xp_v1(pet_ids[i],'walk_timeline_post','timeline_memory',memory_ids[i]::text);
    assert not result.awarded and result.xp_awarded=0,'duplicate_no_additional_award';
    assert (select count(*)=count_before from public.user_xp_ledger where user_id=actors[i]),'ledger_unchanged';
    update public.memories set category='health' where id=memory_ids[i];
    select * into result from public.award_user_activity_xp_v1(pet_ids[i],'health_record','timeline_memory',memory_ids[i]::text);
    assert not result.awarded and result.xp_awarded=0,'reclassified_source_no_additional_award';
    update public.memories set category='walk' where id=memory_ids[i];
    perform public.record_pet_daily_activity_v1(pet_ids[i],'timeline_walk_post',memory_ids[i]::text);
    assert (select today_completed from public.pet_streak_summaries where pet_id=pet_ids[i]),'genuine_daily_activity';
    for j in 2..4 loop
      m:=gen_random_uuid();
      insert into public.memories(id,user_id,pet_id,title,category) values(m,actors[i],pet_ids[i],'NURI_SECURITY_SEC017_CAP','walk');
      select * into result from public.award_user_activity_xp_v1(pet_ids[i],'walk_timeline_post','timeline_memory',m::text);
      assert result.awarded=(j<=3),'pet_daily_three';
    end loop;
    assert (select count(*)=3 from public.user_xp_ledger where pet_id=pet_ids[i] and activity_date_kst=(now() at time zone 'Asia/Seoul')::date),'three_awards_only';
    reset role;
  end loop;
end $$;
rollback;
select 'PASS SEC-017: bilateral fake/cross source and wrong event/type/bonus denied; valid source exactly once; per-pet daily 3, calculated decay and server timestamps preserved; all changes rolled back' as result;
