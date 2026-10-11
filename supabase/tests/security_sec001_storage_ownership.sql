begin;
do $$
declare
  a uuid := gen_random_uuid(); b uuid := gen_random_uuid();
  pet uuid := gen_random_uuid(); memory uuid := gen_random_uuid(); image_id uuid := gen_random_uuid();
  request_id uuid := gen_random_uuid(); bad_item uuid := gen_random_uuid(); good_item uuid := gen_random_uuid();
  original text; thumb text; result jsonb; rejected boolean;
begin
  original := a::text || '/' || pet::text || '/' || memory::text || '_v1.jpg';
  thumb := 'timeline-thumb/' || a::text || '/' || pet::text || '/' || memory::text || '/' || image_id::text || '.jpg';
  assert public.is_owned_storage_path('memory-images', original, a, pet, memory), 'own_original';
  assert public.is_owned_storage_path('memory-images', thumb, a, pet, memory), 'own_thumbnail';
  assert not public.is_owned_storage_path('memory-images', original, b), 'cross_user_original';
  assert not public.is_owned_storage_path('memory-images', thumb, b), 'cross_user_thumbnail';
  assert not public.is_owned_storage_path('memory-images', original, a, gen_random_uuid(), memory), 'wrong_pet';
  assert not public.is_owned_storage_path('memory-images', original, a, pet, gen_random_uuid()), 'wrong_memory';
  assert not public.is_owned_storage_path('memory-images', original || '/../../other', a), 'traversal';
  assert not public.is_owned_storage_path('memory-images', 'https://host/' || original, a), 'url';
  assert not public.is_owned_storage_path('memory-images', original || '%2fother', a), 'encoded_path';
  assert not public.is_owned_storage_path(null, original, a), 'null_bucket';
  assert not public.is_owned_storage_path('unknown', original, a), 'unknown_bucket';

  -- BEFORE INSERT must reject a foreign path even before the FK can be checked.
  rejected := false;
  begin
    insert into public.pets(id,user_id,name,profile_image_url)
      values(pet,a,'SEC-001 isolated rollback', b::text || '/' || pet::text || '/avatar.jpg');
  exception when insufficient_privilege then rejected := sqlerrm = 'storage_reference_owner_mismatch'; end;
  assert rejected, 'foreign_reference_write_guard';

  -- Synthetic deletion requests have no auth.users FK. No real account or object is used.
  insert into public.account_deletion_requests(id,user_id,status,request_origin)
    values(request_id,a,'db_deleted','security_test_rollback');
  insert into public.account_deletion_cleanup_items(id,request_id,bucket_name,storage_path,status)
    values(bad_item,request_id,'memory-images',b::text || '/' || pet::text || '/image.jpg','processing'),
          (good_item,request_id,'memory-images',original,'processing');
  assert (select owner_user_id = a from public.account_deletion_cleanup_items where id = good_item), 'owner_bound';
  result := public.authorize_account_deletion_cleanup_item(bad_item);
  assert (result->>'allowed')::boolean = false, 'legacy_reject';
  assert (select status = 'skipped_security' and last_error_code = 'storage_cleanup_owner_mismatch'
    from public.account_deletion_cleanup_items where id = bad_item), 'durable_security_event';
  result := public.authorize_account_deletion_cleanup_item(good_item);
  assert (result->>'allowed')::boolean = true, 'own_original_allowed';
  perform public.complete_account_deletion_cleanup_item(good_item,true);
  perform public.complete_account_deletion_cleanup_item(good_item,true);
  assert not (select storage_cleanup_pending from public.account_deletion_requests where id = request_id), 'no_retry_loop';
  rejected := false;
  begin
    update public.account_deletion_cleanup_items set owner_user_id = b where id = good_item;
  exception when insufficient_privilege then rejected := true; end;
  assert rejected, 'owner_immutable';
  assert not (public.authorize_account_deletion_cleanup_item(bad_item)->>'allowed')::boolean, 'replay_rejected';
  assert not has_function_privilege('anon','public.authorize_account_deletion_cleanup_item(uuid)','execute'), 'anon_denied';
  assert not has_function_privilege('authenticated','public.authorize_account_deletion_cleanup_item(uuid)','execute'), 'auth_denied';
  assert has_function_privilege('service_role','public.authorize_account_deletion_cleanup_item(uuid)','execute'), 'worker_allowed';
  assert pg_get_functiondef('public.request_account_deletion(text,text)'::regprocedure) like '%7 days%', 'grace_preserved';
end;
$$;
rollback;
select 'SEC-001 SQL runtime PASS; all synthetic rows rolled back; Storage remove not called' as result;
