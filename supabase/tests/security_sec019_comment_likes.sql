-- Never use an existing comment as a counter target.
begin;
set local statement_timeout = '30s';
set local lock_timeout = '3s';
set local plpgsql.check_asserts = on;
do $$
declare
  actors uuid[]; post_ids uuid[] := array[gen_random_uuid(),gen_random_uuid()];
  comment_ids uuid[] := array[gen_random_uuid(),gen_random_uuid()];
  i integer; peer integer; affected integer; denied boolean;
begin
  select array_agg(user_id order by nickname) into actors from public.profiles
    where nickname in ('kakaoQA','googleQA') and role='user';
  assert cardinality(actors)=2 and actors[1]<>actors[2], 'approved_normal_accounts_required';
  assert not exists(select 1 from public.posts where user_id=any(actors) and created_at>now()-interval '1 hour'), 'recent_posts_abort';
  assert not exists(select 1 from public.comments where user_id=any(actors) and created_at>now()-interval '10 minutes'), 'recent_comments_abort';
  assert not has_function_privilege('authenticated','public.sync_comment_like_count()','EXECUTE'), 'aggregate_not_rpc';
  assert not has_function_privilege('anon','public.sync_comment_like_count()','EXECUTE'), 'aggregate_not_anon_rpc';
  for i in 1..2 loop
    perform set_config('request.jwt.claims',jsonb_build_object('sub',actors[i],'role','authenticated')::text,true);
    set local role authenticated;
    insert into public.posts(id,user_id,title,content)
      values(post_ids[i],actors[i],'NURI_SECURITY_REMAINING_019_'||i,'isolated like boundary');
    insert into public.comments(id,post_id,user_id,content,like_count)
      values(comment_ids[i],post_ids[i],actors[i],'NURI_SECURITY_REMAINING_019_'||i,777);
    assert (select like_count=0 from public.comments where id=comment_ids[i]), 'insert_count_server_owned';
    update public.comments set content='NURI_SECURITY_REMAINING_019_EDIT_'||i where id=comment_ids[i];
    get diagnostics affected=row_count; assert affected=1, 'normal_edit';
    denied:=false;
    begin update public.comments set like_count=777 where id=comment_ids[i];
    exception when insufficient_privilege then denied:=true; end;
    assert denied, 'owner_counter_update_denied';
    insert into public.comment_likes(comment_id,user_id) values(comment_ids[i],actors[i]);
    assert (select like_count=1 from public.comments where id=comment_ids[i]), 'own_like_aggregate';
    delete from public.comment_likes where comment_id=comment_ids[i] and user_id=actors[i];
    assert (select like_count=0 from public.comments where id=comment_ids[i]), 'own_unlike_aggregate';
    reset role;
  end loop;
  for i in 1..2 loop
    peer:=3-i;
    perform set_config('request.jwt.claims',jsonb_build_object('sub',actors[i],'role','authenticated')::text,true);
    set local role authenticated;
    update public.comments set content='forbidden' where id=comment_ids[peer];
    get diagnostics affected=row_count; assert affected=0, 'peer_edit_denied';
    update public.comments set like_count=777 where id=comment_ids[peer];
    get diagnostics affected=row_count; assert affected=0, 'peer_counter_update_denied';
    insert into public.comment_likes(comment_id,user_id) values(comment_ids[peer],actors[i]);
    assert (select like_count=1 from public.comments where id=comment_ids[peer]), 'peer_like_aggregate';
    denied:=false;
    begin insert into public.comment_likes(comment_id,user_id) values(comment_ids[peer],actors[i]);
    exception when unique_violation then denied:=true; end;
    assert denied, 'duplicate_like_denied';
    assert (select like_count=1 from public.comments where id=comment_ids[peer]), 'duplicate_no_increment';
    delete from public.comment_likes where comment_id=comment_ids[peer] and user_id=actors[i];
    assert (select like_count=0 from public.comments where id=comment_ids[peer]), 'peer_unlike_aggregate';
    reset role;
  end loop;
  for i in 1..2 loop
    perform set_config('request.jwt.claims',jsonb_build_object('sub',actors[i],'role','authenticated')::text,true);
    perform public._set_community_target_status_internal('comment',comment_ids[i],'hidden','hide','security_qa',null,'isolated QA',null,null,null);
    assert (select status='hidden' from public.comments where id=comment_ids[i]), 'moderation_preserved';
    perform public._set_community_target_status_internal('comment',comment_ids[i],'active','restore','security_qa',null,'isolated QA',null,null,null);
    set local role authenticated;
    assert public.community_soft_delete_comment_v1(comment_ids[i]), 'normal_soft_delete';
    reset role;
    assert (select status='deleted' and deleted_at is not null from public.comments where id=comment_ids[i]), 'delete_preserved';
    assert (select comment_count=0 from public.posts where id=post_ids[i]), 'post_aggregate_preserved';
  end loop;
end;
$$;
rollback;
select 'SEC-019 PASS: bilateral edit/like/unlike/aggregate, owner and peer counter denial, duplicate, moderation, deletion; rollback' as result;
