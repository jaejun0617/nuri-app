-- Linked project: grmekesqoydylqmyvfke only. Controlled SQL-level QA, not an app JWT test.
-- All test DML is inside exception subtransactions and ALWAYS rolled back.
-- No DELETE/UPDATE/reset of pre-existing rows; the fixed QA author must match QA100.
DO $qa$
declare
  v_actor uuid;
  v_pet uuid;
  v_second_pet uuid;
  v_other_pet uuid;
  v_before record;
  v_after record;
  v_reward record;
  v_rows integer;
  v_i integer;
  v_awards integer;
  v_result jsonb := '[]'::jsonb;
  v_marker text := 'timeline-xp-qa-' || gen_random_uuid()::text;
begin
  if (select count(*) from public.profiles where nickname='adminQA') <> 1 then
    raise exception 'QA_AUTHOR_NOT_SAFELY_RESOLVED';
  end if;
  select user_id into strict v_actor from public.profiles where nickname='adminQA';
  if (select count(*) from public.posts where user_id=v_actor and content like '%QA_BATCH: community-pagination-qa-20261007-015104%') <> 100 then
    raise exception 'QA_AUTHOR_NOT_SAFELY_RESOLVED';
  end if;
  select id into v_pet from public.pets where user_id=v_actor order by created_at,id limit 1;
  if v_pet is null then raise exception 'QA_PET_MISSING'; end if;
  if exists(select 1 from public.user_xp_ledger where user_id=v_actor and activity_date_kst=public.nuri_kst_today_v1()) then
    raise exception 'QA_TODAY_NOT_EMPTY_NO_DATA_RESET_ALLOWED';
  end if;
  perform set_config('request.jwt.claim.sub',v_actor::text,true);
  select * into v_before from public.get_user_level_summary_v1();
  if v_before.level > 10 then raise exception 'QA_LEVEL_OUTSIDE_SMOKE_EXPECTATIONS'; end if;

  begin
    for v_i in 1..3 loop
      select * into v_reward from public.award_user_activity_xp_v1(v_pet,'walk_timeline_post','timeline_memory',v_marker || '-timeline-' || v_i);
      if not v_reward.awarded or v_reward.xp_awarded<>39 or v_reward.total_xp<>v_before.total_xp+39*v_i then
        raise exception 'TIMELINE_THREE_AWARDS_FAILED';
      end if;
      if v_i=1 then
        select * into v_after from public.get_user_level_summary_v1();
        v_result:=v_result || jsonb_build_array(jsonb_build_object('case','actual_progress_one_award','before',to_jsonb(v_before),'after',to_jsonb(v_after),'xp_awarded',39));
        select * into v_reward from public.award_user_activity_xp_v1(v_pet,'walk_timeline_post','timeline_memory',v_marker || '-timeline-1');
        if v_reward.awarded or v_reward.xp_awarded<>0 or v_reward.total_xp<>v_before.total_xp+39 then
          raise exception 'SOURCE_REPLAY_FAILED';
        end if;
      end if;
    end loop;
    select * into v_reward from public.award_user_activity_xp_v1(v_pet,'walk_timeline_post','timeline_memory',v_marker || '-timeline-4');
    if v_reward.awarded or v_reward.total_xp<>v_before.total_xp+117 then raise exception 'FOURTH_TIMELINE_NOT_BLOCKED'; end if;
    select * into v_reward from public.award_user_activity_xp_v1(v_pet,'walk_record','walk',v_marker || '-alternate-fourth');
    if v_reward.awarded then raise exception 'ALTERNATE_ROUTE_BYPASSES_PET_CAP'; end if;
    select * into v_after from public.get_user_level_summary_v1();
    select count(*) into v_rows from public.user_xp_ledger where user_id=v_actor and activity_date_kst=public.nuri_kst_today_v1();
    if v_rows<>3 or v_after.total_xp<>v_before.total_xp+117 then raise exception 'SUMMARY_LEDGER_MISMATCH'; end if;
    if not exists(select 1 from pg_locks where pid=pg_backend_pid() and locktype='advisory' and mode='ExclusiveLock' and granted) then
      raise exception 'XP_TRANSACTION_LOCK_MISSING';
    end if;
    v_result:=v_result || jsonb_build_array(jsonb_build_object('case','timeline_three_fourth_replay_lock','before',to_jsonb(v_before),'after',to_jsonb(v_after),'awards',3,'ledger_rows',v_rows));
    raise exception using errcode='NX001',message='ROLLBACK_SUCCESSFUL_QA';
  exception when sqlstate 'NX001' then null;
  end;

  begin
    -- This extra pet exists ONLY inside this rolled-back subtransaction.
    insert into public.pets(user_id,name) values(v_actor,'QA XP isolation') returning id into v_second_pet;
    for v_i in 1..3 loop
      select * into v_reward from public.award_user_activity_xp_v1(v_pet,case when v_i=2 then 'walk_timeline_post' else 'walk_record' end,'qa_rollback',v_marker || '-mix-' || v_i);
      if not v_reward.awarded then raise exception 'MIXED_WALK_ROUTE_FAILED'; end if;
    end loop;
    select * into v_reward from public.award_user_activity_xp_v1(v_pet,'walk_record','qa_rollback',v_marker || '-mix-4');
    if v_reward.awarded then raise exception 'MIXED_WALK_FOURTH_NOT_BLOCKED'; end if;
    for v_i in 1..3 loop
      select * into v_reward from public.award_user_activity_xp_v1(v_second_pet,'walk_record','qa_rollback',v_marker || '-pet2-' || v_i);
      if not v_reward.awarded or v_reward.xp_awarded<>(case when v_i=3 then 7 else 26 end) then
        raise exception 'PER_PET_ISOLATION_OR_ACCOUNT_BUDGET_FAILED';
      end if;
    end loop;
    select * into v_reward from public.award_user_activity_xp_v1(v_second_pet,'walk_record','qa_rollback',v_marker || '-pet2-4');
    if v_reward.awarded then raise exception 'ACCOUNT_BUDGET_NOT_BLOCKED'; end if;
    select * into v_after from public.get_user_level_summary_v1();
    if v_after.total_xp<>v_before.total_xp+150 then raise exception 'ACCOUNT_XP_CAP_CHANGED'; end if;
    select count(*) into v_rows from public.user_xp_ledger where user_id=v_actor and activity_date_kst=public.nuri_kst_today_v1();
    if v_rows<>6 then raise exception 'PER_PET_AWARD_COUNT_FAILED'; end if;
    v_result:=v_result || jsonb_build_array(jsonb_build_object('case','two_pets_three_each_mixed_routes_account_150','awards',6,'total_awarded',150,'last_award_clamped',7));
    raise exception using errcode='NX001',message='ROLLBACK_SUCCESSFUL_QA';
  exception when sqlstate 'NX001' then null;
  end;

  begin
    v_awards:=0;
    for v_i in 1..3 loop
      select * into v_reward from public.award_user_activity_xp_v1(null,'community_post','qa_rollback',v_marker || '-community-' || v_i);
      if v_reward.awarded<>(v_i<=2) then raise exception 'COMMUNITY_LIMIT_CHANGED'; end if;
      v_awards:=v_awards+v_reward.xp_awarded;
    end loop;
    for v_i in 1..3 loop
      select * into v_reward from public.award_user_activity_xp_v1(v_pet,'health_record','qa_rollback',v_marker || '-health-' || v_i);
      if v_reward.awarded<>(v_i<=2) then raise exception 'HEALTH_LIMIT_CHANGED'; end if;
      v_awards:=v_awards+v_reward.xp_awarded;
    end loop;
    for v_i in 1..4 loop
      select * into v_reward from public.award_user_activity_xp_v1(v_pet,'timeline_post','qa_rollback',v_marker || '-other-' || v_i);
      if v_reward.awarded<>(v_i<=3) then raise exception 'TIMELINE_LIMIT_CHANGED'; end if;
      v_awards:=v_awards+v_reward.xp_awarded;
    end loop;
    for v_i in 1..11 loop
      select * into v_reward from public.award_user_activity_xp_v1(null,'comment','qa_rollback',v_marker || '-comment-' || v_i);
      if v_reward.awarded<>(v_i<=10) then raise exception 'COMMENT_LIMIT_CHANGED'; end if;
      v_awards:=v_awards+v_reward.xp_awarded;
    end loop;
    if v_awards<>150 then raise exception 'BASE_DAILY_CAP_FAILED'; end if;
    select * into v_before from public.get_user_level_summary_v1();
    select * into v_reward from public.award_user_activity_xp_v1(v_pet,'streak_3_bonus','qa_rollback',v_marker || '-bonus');
    if not v_reward.awarded or v_reward.xp_awarded<>39 then raise exception 'BONUS_EXEMPTION_CHANGED'; end if;
    select * into v_after from public.get_user_level_summary_v1();
    if v_after.total_xp<>v_before.total_xp+39 or v_after.level<>public.calculate_nuri_level_v1(v_after.total_xp) then raise exception 'LEVEL_UP_SUMMARY_FAILED'; end if;
    v_result:=v_result || jsonb_build_array(jsonb_build_object('case','actual_level_progress_after_bonus','before',to_jsonb(v_before),'after',to_jsonb(v_after),'xp_awarded',39));
    select * into v_reward from public.award_user_activity_xp_v1(v_pet,'streak_3_bonus','qa_rollback',v_marker || '-bonus2');
    if v_reward.awarded then raise exception 'BONUS_DAILY_LIMIT_CHANGED'; end if;
    v_result:=v_result || jsonb_build_array(jsonb_build_object('case','non_walk_limits_and_bonus_preserved','base_total',150,'bonus',39));
    raise exception using errcode='NX001',message='ROLLBACK_SUCCESSFUL_QA';
  exception when sqlstate 'NX001' then null;
  end;

  -- The local record variable survives subtransaction rollback; reload its baseline.
  select * into v_before from public.get_user_level_summary_v1();
  begin
    perform public.award_user_activity_xp_v1(null,'walk_timeline_post','qa_rollback',v_marker || '-null-pet');
    raise exception 'NULL_PET_BYPASS_NOT_BLOCKED';
  exception when invalid_parameter_value then null;
  end;
  select id into v_other_pet from public.pets where user_id<>v_actor order by id limit 1;
  if v_other_pet is null then raise exception 'FOREIGN_PET_GUARD_NOT_TESTABLE'; end if;
  begin
    perform public.award_user_activity_xp_v1(v_other_pet,'walk_timeline_post','qa_rollback',v_marker || '-foreign');
    raise exception 'FOREIGN_PET_NOT_BLOCKED';
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claim.sub','',true);
  begin
    perform public.award_user_activity_xp_v1(v_pet,'walk_timeline_post','qa_rollback',v_marker || '-anon');
    raise exception 'ANON_NOT_BLOCKED';
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claim.sub',v_actor::text,true);
  if timezone('Asia/Seoul','2026-10-06T14:59:59Z'::timestamptz)::date <> date '2026-10-06'
    or timezone('Asia/Seoul','2026-10-06T15:00:00Z'::timestamptz)::date <> date '2026-10-07'
    or public.nuri_kst_today_v1() <> timezone('Asia/Seoul',now())::date then
    raise exception 'KST_BOUNDARY_FAILED';
  end if;
  if exists(select 1 from public.user_xp_ledger where source_id like v_marker || '%')
    or exists(select 1 from public.pets where user_id=v_actor and name='QA XP isolation') then
    raise exception 'QA_ROLLBACK_INCOMPLETE';
  end if;
  select * into v_after from public.get_user_level_summary_v1();
  if to_jsonb(v_after) is distinct from to_jsonb(v_before) then raise exception 'QA_SUMMARY_NOT_RESTORED'; end if;
  v_result:=v_result || jsonb_build_array(jsonb_build_object('case','auth_ownership_null_pet_kst_rollback','status','PASS'));
  perform set_config('nuri.qa.result',v_result::text,false);
end;
$qa$;
SELECT current_setting('nuri.qa.result')::jsonb as rollback_qa;
