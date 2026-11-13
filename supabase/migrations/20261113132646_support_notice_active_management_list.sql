begin;

-- Deleted drafts stay in audit storage, but are not editable management rows.
create or replace function support_private.notice_list(p_category text, p_cursor jsonb, p_limit integer, p_management boolean)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_actor uuid := support_private.actor(); v_generation bigint; v_offset integer := 0; v_count integer; v_items jsonb; v_now timestamptz := statement_timestamp(); v_as_of timestamptz; v_cursor_generation bigint;
begin
  if p_management is null or p_limit is null or p_limit not between 1 and 50 or (p_category is not null and p_category not in ('update','guide')) then
    raise exception using errcode='22023',message='SUPPORT_INVALID_INPUT';
  end if;
  if p_management and not exists(select from support_private.capabilities where user_id=v_actor and capability='notices.manage') then
    raise exception using errcode='42501',message='SUPPORT_FORBIDDEN';
  end if;
  select generation into v_generation from support_private.runtime where singleton;
  if p_cursor is not null then
    if jsonb_typeof(p_cursor) is distinct from 'object'
       or jsonb_typeof(p_cursor->'generation') is distinct from 'number'
       or jsonb_typeof(p_cursor->'offset') is distinct from 'number'
       or jsonb_typeof(p_cursor->'management') is distinct from 'boolean'
       or jsonb_typeof(p_cursor->'asOf') is distinct from 'string'
       or not (p_cursor ? 'category') then
      raise exception using errcode='22023',message='SUPPORT_INVALID_INPUT';
    end if;
    begin
      v_cursor_generation := (p_cursor->>'generation')::bigint;
      v_offset := (p_cursor->>'offset')::integer;
      v_as_of := (p_cursor->>'asOf')::timestamptz;
    exception when invalid_text_representation or numeric_value_out_of_range or invalid_datetime_format or datetime_field_overflow then
      raise exception using errcode='22023',message='SUPPORT_INVALID_INPUT';
    end;
    if v_offset<0 or not isfinite(v_as_of) or v_as_of>v_now then
      raise exception using errcode='22023',message='SUPPORT_INVALID_INPUT';
    end if;
    if v_cursor_generation is distinct from v_generation
       or p_cursor->>'category' is distinct from p_category or (p_cursor->>'management')::boolean is distinct from p_management then
      raise exception using errcode='40001',message='SUPPORT_CURSOR_STALE';
    end if;
    -- Visibility can change with time alone. A page cursor cannot cross that boundary.
    if exists(select from support_private.notice_publications where
      (starts_at > v_as_of and starts_at <= v_now)
      or (expires_at > v_as_of and expires_at <= v_now)) then
      raise exception using errcode='40001',message='SUPPORT_CURSOR_STALE';
    end if;
  end if;
  if p_management then
    select count(*) into v_count from support_private.notice_drafts where deleted_at is null and (p_category is null or category=p_category);
    select coalesce(jsonb_agg(to_jsonb(t)),'[]') into v_items from (
      select id,revision,state,title,body,category,pinned,starts_at,expires_at,updated_at from support_private.notice_drafts
      where deleted_at is null and (p_category is null or category=p_category) order by updated_at desc,id desc limit p_limit offset v_offset
    ) t;
  else
    select count(*) into v_count from support_private.notice_publications p join support_private.notice_drafts d using(id)
      where d.state='published' and (p_category is null or p.category=p_category)
        and (p.starts_at is null or p.starts_at<=v_now) and (p.expires_at is null or p.expires_at>v_now);
    select coalesce(jsonb_agg(to_jsonb(t)),'[]') into v_items from (
      select p.id,p.title,p.category,p.pinned,p.first_published_at,p.updated_at,p.expires_at,r.read_at
      from support_private.notice_publications p join support_private.notice_drafts d using(id)
      left join support_private.notice_reads r on r.notice_id=p.id and r.user_id=v_actor
      where d.state='published' and (p_category is null or p.category=p_category)
        and (p.starts_at is null or p.starts_at<=v_now) and (p.expires_at is null or p.expires_at>v_now)
      order by p.pinned desc,p.first_published_at desc,p.id desc limit p_limit offset v_offset
    ) t;
  end if;
  return jsonb_build_object('items',v_items,'count',v_count,'generation',v_generation,'nextCursor',
    case when v_offset+jsonb_array_length(v_items)<v_count then jsonb_build_object('generation',v_generation,'offset',v_offset+jsonb_array_length(v_items),'category',p_category,'management',p_management,'asOf',v_now) else null end);
end $$;
commit;
