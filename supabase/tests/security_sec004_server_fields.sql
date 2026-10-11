begin;
set local statement_timeout = '30s';
set local lock_timeout = '3s';
set local plpgsql.check_asserts = on;
do $$
declare
  a uuid; b uuid; p uuid:=gen_random_uuid(); c uuid:=gen_random_uuid();
  denied boolean; affected integer; detail text; field text; image_paths text[];
begin
  select user_id into a from public.profiles where nickname='kakaoQA' and role='user';
  select user_id into b from public.profiles where nickname='googleQA' and role='user';
  assert a is not null and b is not null and a<>b, 'approved_normal_accounts';
  assert not exists(select 1 from public.posts where user_id=a and created_at>now()-interval '1 hour'), 'recent_posts_abort';
  select array_agg(a::text || '/' || p::text || '/' || n || '.jpg') into image_paths from generate_series(1,5) n;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
  set local role authenticated;
  insert into public.posts(id,user_id,title,content,category,image_urls,created_at,status,moderated_by,
    moderated_at,operator_memo,deleted_at,like_count,comment_count,report_count,view_count)
  values(p,a,'NURI_SECURITY_AB_SERVER','isolated server boundary','free',image_paths,'2000-01-01',
    'deleted',b,now(),'forged','2000-01-01',900,900,900,900);
  assert exists(select 1 from public.posts where id=p and status='active' and created_at=now()
    and moderated_by is null and moderated_at is null and operator_memo is null and deleted_at is null
    and like_count=0 and comment_count=0 and report_count=0 and view_count=0 and cardinality(image_urls)=5), 'insert_server_fields_normalized_and_five_images_preserved';
  update public.posts set title='NURI_SECURITY_AB_EDIT',content='normal edit',category='daily' where id=p;
  get diagnostics affected=row_count; assert affected=1, 'normal_edit';
  foreach field in array array['like_count','comment_count','report_count','view_count'] loop
    denied:=false;
    begin
      execute format('update public.posts set %I=999 where id=$1',field) using p;
    exception when insufficient_privilege then denied:=true; end;
    assert denied, 'aggregate_spoof_denied_' || field;
  end loop;
  denied:=false;
  begin update public.posts set moderated_by=b,operator_memo='forged' where id=p;
  exception when insufficient_privilege then denied:=true; end;
  assert denied, 'moderation_spoof_denied';
  denied:=false;
  begin update public.posts set created_at='2099-01-01' where id=p;
  exception when insufficient_privilege then denied:=true; end;
  assert denied, 'post_created_at_update_denied';
  denied:=false;
  begin delete from public.posts where id=p;
  exception when insufficient_privilege then denied:=true; end;
  assert denied, 'hard_delete_denied';
  insert into public.comments(id,post_id,user_id,content,created_at)
    values(c,p,a,'NURI_SECURITY_AB_COMMENT','2000-01-01');
  assert (select created_at=now() from public.comments where id=c), 'comment_created_at_normalized';
  denied:=false;
  begin update public.comments set created_at='2000-01-01' where id=c;
  exception when insufficient_privilege then denied:=true; end;
  assert denied, 'comment_created_at_update_denied';
  assert (select comment_count=1 from public.posts where id=p), 'comment_aggregate_trigger';
  insert into public.likes(post_id,user_id) values(p,a);
  assert (select like_count=1 from public.posts where id=p), 'like_aggregate_trigger';
  delete from public.likes where post_id=p and user_id=a;
  assert (select like_count=0 from public.posts where id=p), 'unlike_aggregate_trigger';
  reset role;

  -- Invoke the existing trusted moderation implementation on this fixture only.
  perform public._set_community_target_status_internal('post',p,'hidden','hide','security_qa',null,'isolated QA',null,null,null);
  assert (select status='hidden' and moderated_at is not null from public.posts where id=p), 'trusted_moderation_preserved';
  set local role authenticated;
  denied:=false;
  begin
    update public.posts set status='active',moderated_at=null where id=p;
    get diagnostics affected=row_count; denied:=affected=0;
  exception when insufficient_privilege then denied:=true; end;
  assert denied, 'owner_hidden_restore_denied';
  reset role;
  assert (select status='hidden' from public.posts where id=p), 'hidden_state_retained';
  perform public._set_community_target_status_internal('post',p,'active','restore','security_qa',null,'isolated QA',null,null,null);
  set local role authenticated;
  update public.posts set status='deleted',deleted_at='2000-01-01' where id=p;
  get diagnostics affected=row_count; assert affected=1, 'legacy_normal_soft_delete_preserved';
  reset role;
  assert (select status='deleted' and deleted_at=now() from public.posts where id=p), 'server_deletion_clock';

  set local role authenticated;
  insert into public.posts(user_id,title,content,created_at) values(a,'NURI_SECURITY_AB_RATE_2','isolated rate two','2000-01-01');
  insert into public.posts(user_id,title,content,created_at) values(a,'NURI_SECURITY_AB_RATE_3','isolated rate three','2000-01-01');
  denied:=false;
  begin
    insert into public.posts(user_id,title,content,created_at) values(a,'NURI_SECURITY_AB_RATE_4','isolated rate four','2000-01-01');
  exception when raise_exception then
    get stacked diagnostics detail=pg_exception_detail;
    denied:=detail::jsonb->>'app_code'='community_post_rate_limited';
  end;
  assert denied, 'backdate_rate_bypass_denied';
  reset role;
end;
$$;
rollback;
select 'SEC-004 PASS: protected fields, timestamps, own edit/soft-delete, trusted moderation, aggregates, five images and rate-limit; all fixtures rolled back' as result;
