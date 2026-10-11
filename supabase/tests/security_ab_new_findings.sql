-- Reproduction only. New findings require separate corrective authorization.
begin;
set local statement_timeout='30s';
set local plpgsql.check_asserts=on;
do $$
declare
  a uuid; b uuid; pub uuid:=gen_random_uuid(); priv uuid:=gen_random_uuid(); c uuid:=gen_random_uuid();
  result jsonb;
begin
  select user_id into a from public.profiles where nickname='kakaoQA' and role='user';
  select user_id into b from public.profiles where nickname='googleQA' and role='user';
  assert a is not null and b is not null and a<>b, 'approved_accounts';
  perform set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated')::text,true);
  set local role authenticated;
  insert into public.posts(id,user_id,title,content,visibility)
    values(pub,b,'NURI_SECURITY_AB_PUBLIC','isolated public','public'),
          (priv,b,'NURI_SECURITY_AB_PRIVATE','isolated private','private');
  insert into public.comments(id,post_id,user_id,content) values(c,pub,b,'NURI_SECURITY_AB_COMMENT_PROBE');
  update public.comments set like_count=777 where id=c;
  assert (select like_count=777 from public.comments where id=c), 'SEC-019 reproduced: owner can forge comment aggregate';
  reset role;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
  set local role authenticated;
  assert (select count(*)=0 from public.posts where id=priv), 'private_post_hidden_from_A';
  result:=public.community_submit_report_v1('post',priv,'other','NURI_SECURITY_AB_PRIVATE_PROBE');
  assert result->>'status'='created', 'SEC-020 reproduced: invisible private target accepted';
  reset role;
end;
$$;
rollback;
select 'CONFIRMED: SEC-019 owner comment aggregate forgery; SEC-020 report accepts unreadable private fixture target; all synthetic changes rolled back' as result;
