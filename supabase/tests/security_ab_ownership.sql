-- Run only with PO-approved kakaoQA/googleQA. No Storage objects or Auth mutations.
begin;
set local statement_timeout = '30s';
set local lock_timeout = '3s';
set local plpgsql.check_asserts = on;
do $$
declare
  actors uuid[];
  pet_ids uuid[] := array[gen_random_uuid(),gen_random_uuid()];
  memory_ids uuid[] := array[gen_random_uuid(),gen_random_uuid()];
  images uuid[] := array[gen_random_uuid(),gen_random_uuid()];
  i integer; peer integer; affected integer; denied boolean; image_path text;
begin
  select array_agg(user_id order by case nickname when 'kakaoQA' then 0 else 1 end)
    into actors from public.profiles where nickname in ('kakaoQA','googleQA') and role='user';
  assert cardinality(actors)=2 and actors[1]<>actors[2], 'approved_normal_accounts_required';
  for i in 1..2 loop
    perform set_config('request.jwt.claims',jsonb_build_object('sub',actors[i],'role','authenticated')::text,true);
    set local role authenticated;
    insert into public.pets(id,user_id,name) values(pet_ids[i],actors[i],'NURI_SECURITY_AB_' || i);
    image_path := actors[i]::text || '/' || pet_ids[i]::text || '/' || memory_ids[i]::text || '_qa.jpg';
    insert into public.memories(id,user_id,pet_id,title,image_url)
      values(memory_ids[i],actors[i],pet_ids[i],'NURI_SECURITY_AB_' || i,image_path);
    insert into public.memory_images(id,memory_id,sort_order,original_path)
      values(images[i],memory_ids[i],0,image_path);
    assert (select count(*)=1 from public.pets where id=pet_ids[i]), 'own_pet_read';
    assert (select count(*)=1 from public.memories where id=memory_ids[i]), 'own_memory_read';
    assert (select count(*)=1 from public.memory_images where id=images[i]), 'own_image_reference_read';
    update public.pets set name='NURI_SECURITY_AB_UPDATED_' || i where id=pet_ids[i];
    get diagnostics affected = row_count; assert affected=1, 'own_pet_update';
    update public.memories set content='isolated rollback QA' where id=memory_ids[i];
    get diagnostics affected = row_count; assert affected=1, 'own_memory_update';
    update public.memory_images set width=100,height=100 where id=images[i];
    get diagnostics affected = row_count; assert affected=1, 'own_image_reference_update';
    reset role;
  end loop;
  for i in 1..2 loop
    peer := 3-i;
    perform set_config('request.jwt.claims',jsonb_build_object('sub',actors[i],'role','authenticated')::text,true);
    set local role authenticated;
    assert (select count(*)=0 from public.pets where id=pet_ids[peer]), 'cross_pet_read_denied';
    assert (select count(*)=0 from public.memories where id=memory_ids[peer]), 'cross_memory_read_denied';
    assert (select count(*)=0 from public.memory_images where id=images[peer]), 'cross_image_reference_read_denied';
    update public.pets set name='NURI_SECURITY_AB_FORBIDDEN' where id=pet_ids[peer];
    get diagnostics affected = row_count; assert affected=0, 'cross_pet_update_denied';
    update public.memories set content='NURI_SECURITY_AB_FORBIDDEN' where id=memory_ids[peer];
    get diagnostics affected = row_count; assert affected=0, 'cross_memory_update_denied';
    update public.memory_images set width=200,height=200 where id=images[peer];
    get diagnostics affected = row_count; assert affected=0, 'cross_image_reference_update_denied';
    delete from public.memory_images where id=images[peer];
    get diagnostics affected = row_count; assert affected=0, 'cross_image_reference_delete_denied';
    delete from public.memories where id=memory_ids[peer];
    get diagnostics affected = row_count; assert affected=0, 'cross_memory_delete_denied';
    delete from public.pets where id=pet_ids[peer];
    get diagnostics affected = row_count; assert affected=0, 'cross_pet_delete_denied';
    denied := false;
    begin
      update public.memories set pet_id=pet_ids[peer] where id=memory_ids[i];
    exception when insufficient_privilege then denied := true; end;
    assert denied, 'cross_pet_reparent_denied';
    denied := false;
    begin
      update public.memory_images set memory_id=memory_ids[peer] where id=images[i];
    exception when insufficient_privilege then denied := true; end;
    assert denied, 'cross_memory_reparent_denied';
    denied := false;
    begin
      update public.pets set user_id=actors[peer] where id=pet_ids[i];
    exception when insufficient_privilege then denied := true; end;
    assert denied, 'owner_transfer_denied';
    denied := false;
    begin
      update public.pets set profile_image_url=actors[peer]::text || '/' || pet_ids[peer]::text || '/avatar.jpg'
        where id=pet_ids[i];
    exception when insufficient_privilege then denied := true; end;
    assert denied, 'foreign_storage_path_denied';
    reset role;
  end loop;
  for i in 1..2 loop
    perform set_config('request.jwt.claims',jsonb_build_object('sub',actors[i],'role','authenticated')::text,true);
    set local role authenticated;
    delete from public.memory_images where id=images[i];
    get diagnostics affected = row_count; assert affected=1, 'own_image_reference_delete';
    delete from public.memories where id=memory_ids[i];
    get diagnostics affected = row_count; assert affected=1, 'own_memory_delete';
    delete from public.pets where id=pet_ids[i];
    get diagnostics affected = row_count; assert affected=1, 'own_pet_delete';
    reset role;
  end loop;
end;
$$;
rollback;
select 'PASS: A/B own CRUD allowed; bilateral cross-user private CRUD/reparent/path denied; rollback complete' as result;
