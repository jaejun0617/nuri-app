begin;
-- Storage upload and Auth deletion are independent transactions. A late object
-- is reconciled using the durable deletion receipt, never a caller-supplied path.
create or replace function public.support_deleted_photo_batch_v1(p_limit integer default 20) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
  if p_limit is null or p_limit not between 1 and 50 then
    raise invalid_parameter_value using message='SUPPORT_INVALID_INPUT';
  end if;
  update support_private.deleted_account_photos p
    set state=case when attempts<5 then 'pending' else 'failed' end,completed_at=null
    where state='completed'
      and not exists(select from auth.users where id=p.owner_id)
      and exists(select from storage.objects where bucket_id='support-ticket-photos' and name=p.photo_id::text||'.jpg');
  update support_private.deleted_account_photos set state='failed'
    where state='leased' and attempts>=5 and lease_until<=clock_timestamp();
  return coalesce((select jsonb_agg(photo_id) from (
    select p.photo_id from support_private.deleted_account_photos p
    where p.state in ('pending','leased') and p.attempts<5
      and (p.lease_until is null or p.lease_until<=clock_timestamp())
      and not exists(select from auth.users where id=p.owner_id)
    order by p.created_at,p.photo_id limit p_limit
  ) pending),'[]'::jsonb);
end $$;
notify pgrst,'reload schema';
commit;
