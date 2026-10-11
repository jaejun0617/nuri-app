-- Every scenario is a subtransaction; derived QA summaries never persist.
begin;
set local statement_timeout='30s';
set local lock_timeout='3s';
set local plpgsql.check_asserts=on;
do $$
declare
  actors uuid[]; actor uuid; pet uuid; source uuid; past_source uuid; result record;
  target_level integer; milestone integer; day_offset integer; j integer;
  before_xp integer; expected integer; denied boolean; today date:=public.nuri_kst_today_v1();
begin
  select array_agg(user_id) into actors from public.profiles
    where nickname in ('kakaoQA','googleQA') and role='user';
  assert cardinality(actors)=2,'approved_accounts';
  foreach actor in array actors loop
    perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
    foreach target_level in array array[1,11,31,51,71,91] loop
      begin
        pet:=gen_random_uuid(); source:=gen_random_uuid();
        before_xp:=public.nuri_level_floor_xp_v1(target_level);
        insert into public.user_level_summaries(user_id,total_xp,level)
          values(actor,before_xp,target_level) on conflict(user_id) do update
          set total_xp=excluded.total_xp,level=excluded.level;
        set local role authenticated;
        insert into public.pets(id,user_id,name) values(pet,actor,'NURI_SECURITY_SEC017_DECAY');
        insert into public.memories(id,user_id,pet_id,title,category)
          values(source,actor,pet,'NURI_SECURITY_SEC017_DECAY','walk');
        expected:=case target_level when 1 then 39 when 11 then 35 when 31 then 31 when 51 then 27 when 71 then 23 else 20 end;
        select * into result from public.award_user_activity_xp_v1(pet,'walk_timeline_post','timeline_memory',source::text);
        assert result.awarded and result.xp_awarded=expected and result.total_xp=before_xp+expected,'all_decay_bands';
        denied:=false;
        begin perform public.award_user_activity_xp_v1(pet,'walk_timeline_post','timeline_memory',upper(source::text));
        exception when invalid_parameter_value then denied:=true; end;
        assert denied,'noncanonical_id_cannot_duplicate';
        raise sqlstate 'ZX017';
      exception when sqlstate 'ZX017' then null; end;
    end loop;
    foreach milestone in array array[3,7,30] loop
      begin
        pet:=gen_random_uuid(); source:=gen_random_uuid();
        insert into public.pets(id,user_id,name) values(pet,actor,'NURI_SECURITY_SEC017_STREAK');
        -- Only synthetic history is seeded with trusted timestamps.
        for day_offset in 1..milestone-1 loop
          past_source:=gen_random_uuid();
          insert into public.memories(id,user_id,pet_id,title,category,created_at)
            values(past_source,actor,pet,'NURI_SECURITY_SEC017_HISTORY','walk',
              ((today-day_offset)::timestamp+interval '12 hours') at time zone 'Asia/Seoul');
          insert into public.pet_daily_activities(user_id,pet_id,activity_date_kst,source_type,source_id)
            values(actor,pet,today-day_offset,'timeline_walk_post',past_source::text);
        end loop;
        set local role authenticated;
        insert into public.memories(id,user_id,pet_id,title,category)
          values(source,actor,pet,'NURI_SECURITY_SEC017_STREAK','walk');
        select * into result from public.record_pet_daily_activity_v1(pet,'timeline_walk_post',source::text);
        assert result.inserted and result.current_streak=milestone and result.today_completed,'verified_streak';
        assert (select count(*)=1 from public.user_xp_ledger where pet_id=pet and event_type='streak_'||milestone||'_bonus'),'bonus_exactly_once';
        select * into result from public.award_user_activity_xp_v1(pet,'streak_'||milestone||'_bonus','pet_daily_activity',pet::text||':streak:'||milestone);
        assert not result.awarded and result.xp_awarded=0,'bonus_duplicate_denied';
        select * into result from public.record_pet_daily_activity_v1(pet,'timeline_walk_post',source::text);
        assert not result.inserted,'activity_duplicate_denied';
        raise sqlstate 'ZX017';
      exception when sqlstate 'ZX017' then null; end;
    end loop;
    begin
      pet:=gen_random_uuid();
      insert into public.pets(id,user_id,name) values(pet,actor,'NURI_SECURITY_SEC017_TIME');
      foreach day_offset in array array[-1,1] loop
        source:=gen_random_uuid();
        insert into public.memories(id,user_id,pet_id,title,category,created_at)
          values(source,actor,pet,'NURI_SECURITY_SEC017_TIME','walk',now()+day_offset*interval '1 day');
        set local role authenticated;
        denied:=false;
        begin perform public.award_user_activity_xp_v1(pet,'walk_timeline_post','timeline_memory',source::text);
        exception when invalid_parameter_value then denied:=true; end;
        assert denied,'stale_or_future_source_denied';
        reset role;
      end loop;
      raise sqlstate 'ZX017';
    exception when sqlstate 'ZX017' then null; end;
    begin
      -- Distinct synthetic pets exercise the shared account budget beyond each pet cap.
      set local role authenticated;
      for j in 1..5 loop
        pet:=gen_random_uuid(); source:=gen_random_uuid();
        insert into public.pets(id,user_id,name) values(pet,actor,'NURI_SECURITY_SEC017_BUDGET');
        insert into public.memories(id,user_id,pet_id,title,category)
          values(source,actor,pet,'NURI_SECURITY_SEC017_BUDGET','walk');
        select * into result from public.award_user_activity_xp_v1(pet,'walk_timeline_post','timeline_memory',source::text);
        expected:=case when j<=3 then 39 when j=4 then 33 else 0 end;
        assert result.xp_awarded=expected,'account_daily_150';
      end loop;
      raise sqlstate 'ZX017';
    exception when sqlstate 'ZX017' then null; end;
  end loop;
end $$;
rollback;
select 'PASS SEC-017: both accounts; six decay bands; verified 3/7/30-day bonus exactly once; stale/future/noncanonical denied; daily 150 preserved; rollback' as result;
