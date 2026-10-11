begin;
set local statement_timeout = '30s';
set local lock_timeout = '3s';
set local plpgsql.check_asserts = on;
do $$
declare
  actors uuid[]; post_ids uuid[] := array[gen_random_uuid(),gen_random_uuid()];
  roots uuid[] := array[gen_random_uuid(),gen_random_uuid()];
  replies uuid[] := array[gen_random_uuid(),gen_random_uuid()];
  i integer; peer integer; state text; target uuid; kind text;
  denied boolean; detail text; message text; result jsonb;
begin
  select array_agg(user_id order by nickname) into actors from public.profiles
    where nickname in ('kakaoQA','googleQA') and role='user';
  assert cardinality(actors)=2 and actors[1]<>actors[2], 'approved_normal_accounts_required';
  assert not exists(select 1 from public.posts where user_id=any(actors) and created_at>now()-interval '1 hour'), 'recent_posts_abort';
  assert not exists(select 1 from public.comments where user_id=any(actors) and created_at>now()-interval '10 minutes'), 'recent_comments_abort';
  assert not exists(select 1 from public.reports where reporter_id=any(actors) and created_at>now()-interval '1 day'), 'recent_reports_abort';
  assert not exists(select 1 from public.community_user_blocks where blocker_user_id=any(actors) and blocked_user_id=any(actors)), 'existing_blocks_abort';
  for i in 1..2 loop
    perform set_config('request.jwt.claims',jsonb_build_object('sub',actors[i],'role','authenticated')::text,true);
    set local role authenticated;
    insert into public.posts(id,user_id,title,content)
      values(post_ids[i],actors[i],'NURI_SECURITY_REMAINING_020_'||i,'isolated report visibility');
    insert into public.comments(id,post_id,user_id,content)
      values(roots[i],post_ids[i],actors[i],'NURI_SECURITY_REMAINING_020_ROOT_'||i);
    insert into public.comments(id,post_id,user_id,content,parent_comment_id)
      values(replies[i],post_ids[i],actors[i],'NURI_SECURITY_REMAINING_020_REPLY_'||i,roots[i]);
    reset role;
  end loop;
  for i in 1..2 loop
    peer:=3-i;
    perform set_config('request.jwt.claims',jsonb_build_object('sub',actors[i],'role','authenticated')::text,true);
    foreach state in array array['private','hidden','auto_hidden','deleted','missing','block_out','block_in'] loop
      -- All administrative setup below addresses only this transaction's UUIDs.
      if state='private' then update public.posts set visibility='private' where id=post_ids[peer];
      elsif state in ('hidden','auto_hidden','deleted') then
        update public.posts set status=state,deleted_at=case when state='deleted' then now() end where id=post_ids[peer];
      elsif state='block_out' then
        insert into public.community_user_blocks(blocker_user_id,blocked_user_id) values(actors[i],actors[peer]);
      elsif state='block_in' then
        insert into public.community_user_blocks(blocker_user_id,blocked_user_id) values(actors[peer],actors[i]);
      end if;
      foreach kind in array array['post','comment'] loop
        target:=case when state='missing' then gen_random_uuid() when kind='post' then post_ids[peer] else roots[peer] end;
        set local role authenticated;
        denied:=false;
        begin
          perform public.community_submit_report_v1(kind,target,'other','NURI_SECURITY_REMAINING_020_DENY');
        exception when sqlstate 'PGR02' then
          get stacked diagnostics detail=pg_exception_detail,message=message_text;
          denied:=detail::jsonb->>'app_code'='community_report_target_unavailable'
            and message='현재 신고할 수 없는 대상이에요.';
        end;
        assert denied, 'rpc_target_denied_'||state||'_'||kind;
        denied:=false;
        begin
          insert into public.reports(reporter_id,target_type,target_id,reason_category,reason)
            values(actors[i],kind,target,'other','NURI_SECURITY_REMAINING_020_DIRECT');
        exception when sqlstate 'PGR02' then denied:=true; end;
        assert denied, 'direct_insert_target_denied_'||state||'_'||kind;
        reset role;
      end loop;
      update public.posts set visibility='public',status='active',deleted_at=null where id=post_ids[peer];
      delete from public.community_user_blocks where blocker_user_id=any(actors) and blocked_user_id=any(actors);
    end loop;
    foreach state in array array['hidden','deleted'] loop
      update public.comments set status=state,deleted_at=case when state='deleted' then now() end where id=roots[peer];
      foreach target in array array[roots[peer],replies[peer]] loop
        set local role authenticated;
        denied:=false;
        begin perform public.community_submit_report_v1('comment',target,'other','NURI_SECURITY_REMAINING_020_THREAD');
        exception when sqlstate 'PGR02' then denied:=true; end;
        assert denied, 'hidden_deleted_thread_report_denied';
        reset role;
      end loop;
      update public.comments set status='active',deleted_at=null where id in (roots[peer],replies[peer]);
    end loop;
    set local role authenticated;
    assert (select count(*)=1 from public.posts where id=post_ids[peer]), 'public_target_select';
    result:=public.community_submit_report_v1('post',post_ids[peer],'other','NURI_SECURITY_REMAINING_020_VALID');
    assert result->>'status'='created', 'visible_post_report';
    result:=public.community_submit_report_v1('post',post_ids[peer],'other','NURI_SECURITY_REMAINING_020_DUPLICATE');
    assert result->>'status'='duplicate', 'duplicate_preserved';
    foreach target in array array[roots[peer],replies[peer]] loop
      result:=public.community_submit_report_v1('comment',target,'other','NURI_SECURITY_REMAINING_020_VALID');
      assert result->>'status'='created', 'visible_comment_reply_report';
    end loop;
    assert (select count(*)=3 from public.reports where reporter_id=actors[i]), 'only_eligible_reports';
    reset role;
    assert (select count(*)=3 from public.community_moderation_queue where target_id in (post_ids[peer],roots[peer],replies[peer]) and report_count=1), 'queue_trace_preserved';
  end loop;
end;
$$;
rollback;
select 'SEC-020 PASS: bilateral public post/comment/reply, uniform missing/private/hidden/deleted/block denial including direct INSERT, duplicate, queue/trace; rollback' as result;
