begin;
-- Roll back operational scope changes; do not create users or send a push.
do $$
declare qa uuid; outsider uuid:='00000000-0000-4000-8000-000000000001';
begin
 select user_id into strict qa from public.nuri_public_ranking_exclusions
 where classification='canonical_qa' order by user_id limit 1;
 if has_function_privilege('authenticated','public.notification_push_qa_allowed_v3(uuid)','execute')
  or has_function_privilege('anon','public.notification_push_qa_allowed_v3(uuid)','execute') then
  raise exception 'QA scope RPC must remain service-only';
 end if;
 if not has_function_privilege('service_role','public.notification_push_qa_allowed_v3(uuid)','execute') then
  raise exception 'Transport service cannot check QA cohort';
 end if;
 update notification_private.runtime_v3 set push_qa_user_ids='{}' where singleton;
 if notification_private.push_qa_allowed_v3(qa) then raise exception 'Empty cohort must fail closed';end if;
 if public.claim_notification_deliveries_v3(4)<>'[]'::jsonb then raise exception 'Empty cohort claimed a delivery';end if;
 update notification_private.runtime_v3 set push_qa_user_ids=array[outsider] where singleton;
 if notification_private.push_qa_allowed_v3(outsider) then raise exception 'Noncanonical identity was allowed';end if;
 update notification_private.runtime_v3 set push_qa_user_ids=array[qa] where singleton;
 if not notification_private.push_qa_allowed_v3(qa) then raise exception 'Explicit canonical QA identity was denied';end if;
end;$$;
rollback;
