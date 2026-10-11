-- Approved A/B synthetic content only. Actual Auth users are never deleted.
begin;
set local statement_timeout = '30s';
set local lock_timeout = '3s';
set local plpgsql.check_asserts = on;
do $$
declare
  a uuid; b uuid; p uuid := gen_random_uuid(); root_id uuid := gen_random_uuid();
  target_id uuid := gen_random_uuid(); reply_id uuid := gen_random_uuid(); denied boolean; error_detail text;
begin
  select user_id into a from public.profiles where nickname='kakaoQA' and role='user';
  select user_id into b from public.profiles where nickname='googleQA' and role='user';
  assert a is not null and b is not null and a<>b, 'approved_accounts';
  perform set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated')::text,true);
  set local role authenticated;
  insert into public.posts(id,user_id,title,content) values(p,b,'NURI_SECURITY_SEC012','isolated rollback');
  insert into public.comments(id,post_id,user_id,content) values(root_id,p,b,'NURI_SECURITY_SEC012_ROOT');
  reset role;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
  set local role authenticated;
  insert into public.comments(id,post_id,user_id,content,parent_comment_id)
    values(target_id,p,a,'NURI_SECURITY_SEC012_TARGET',root_id);
  reset role;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated')::text,true);
  set local role authenticated;
  insert into public.comments(id,post_id,user_id,content,reply_to_comment_id)
    values(reply_id,p,b,'NURI_SECURITY_SEC012_REPLY',target_id);
  assert (select reply_target_user_id=a from public.comments where id=reply_id), 'server_target';
  denied := false;
  begin
    update public.comments set reply_to_comment_id=null,reply_target_user_id=null where id=reply_id;
  exception when others then
    get stacked diagnostics error_detail = pg_exception_detail;
    if error_detail::jsonb->>'app_code' = 'community_comment_write_forbidden' then denied := true; else raise; end if;
  end;
  assert denied, 'direct_nullification_denied';
  denied := false;
  begin
    update public.comments set reply_to_comment_id=root_id,reply_target_user_id=b where id=reply_id;
  exception when others then
    get stacked diagnostics error_detail = pg_exception_detail;
    if error_detail::jsonb->>'app_code' = 'community_comment_write_forbidden' then denied := true; else raise; end if;
  end;
  assert denied, 'retarget_denied';
  reset role;
  -- Deletion worker's privileged FK path, restricted to this isolated comment.
  delete from public.comments where id=target_id;
  assert (select count(*)=1 from public.comments where id=reply_id and user_id=b
    and parent_comment_id=root_id and reply_to_comment_id is null and reply_target_user_id is null
    and content='NURI_SECURITY_SEC012_REPLY'), 'B_reply_preserved';
  delete from public.comments where id=target_id;
  assert (select count(*)=1 from public.comments where id=reply_id), 'cleanup_retry_idempotent';
  delete from public.posts where id=p;
  assert (select count(*)=0 from public.comments where post_id=p), 'post_cascade';
end $$;
rollback;
select 'PASS SEC-012: direct target edits denied; trusted comment FK cleanup preserves peer reply; retry and post cascade; all fixtures rolled back, Auth mutation 0' as result;
