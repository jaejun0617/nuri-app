begin;

-- Business conflicts are final for this input, unlike a serialization failure.
create or replace function public.support_notice_command_v1(p_key uuid,p_operation text,p_id uuid default null,p_expected_revision integer default null,p_content jsonb default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
begin
  return support_private.notice_command(p_key,p_operation,p_id,p_expected_revision,p_content);
exception when serialization_failure then
  if sqlerrm='SUPPORT_REVISION_CONFLICT' then
    raise sqlstate 'PT409' using message='SUPPORT_REVISION_CONFLICT';
  end if;
  raise;
end $$;

create or replace function public.support_notice_list_v1(p_category text default null,p_cursor jsonb default null,p_limit integer default 20,p_management boolean default false)
returns jsonb language plpgsql security invoker set search_path='' as $$
begin
  return support_private.notice_list(p_category,p_cursor,p_limit,p_management);
exception when serialization_failure then
  if sqlerrm='SUPPORT_CURSOR_STALE' then
    raise sqlstate 'PT409' using message='SUPPORT_CURSOR_STALE';
  end if;
  raise;
end $$;

create or replace function public.support_ticket_command_v1(p_key uuid,p_operation text,p_ticket uuid default null,p_revision integer default null,p_seen_user_seq integer default null,p_body text default null,p_category text default null,p_kind text default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
begin
  return support_private.ticket_command(p_key,p_operation,p_ticket,p_revision,p_seen_user_seq,p_body,p_category,p_kind);
exception when serialization_failure then
  if sqlerrm in ('SUPPORT_REVISION_CONFLICT','SUPPORT_CLAIM_CONFLICT','SUPPORT_MESSAGE_CONFLICT') then
    raise sqlstate 'PT409' using message=sqlerrm;
  end if;
  raise;
end $$;

commit;
