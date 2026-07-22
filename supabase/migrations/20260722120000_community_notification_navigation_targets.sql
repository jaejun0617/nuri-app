begin;

create or replace function public.get_user_notifications_v2(
  p_limit integer default 50
)
returns table (
  notification_id uuid,
  notification_source text,
  title text,
  body text,
  type text,
  read_at timestamptz,
  created_at timestamptz,
  target_post_id text,
  target_comment_id text
)
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
declare
  v_actor_id uuid := auth.uid();
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
begin
  if v_actor_id is null then
    raise exception 'NURI_AUTH_REQUIRED'
      using errcode = '42501';
  end if;

  return query
    select *
    from (
      select
        n.id as notification_id,
        'user'::text as notification_source,
        n.title,
        n.body,
        n.type,
        n.read_at,
        n.created_at,
        case
          when n.metadata ->> 'kind' in ('community_comment', 'community_reply')
            and coalesce(n.metadata ->> 'post_id', '')
              ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          then n.metadata ->> 'post_id'
          else null
        end as target_post_id,
        case
          when n.metadata ->> 'kind' in ('community_comment', 'community_reply')
            and coalesce(n.metadata ->> 'comment_id', '')
              ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          then n.metadata ->> 'comment_id'
          else null
        end as target_comment_id
      from public.user_notifications n
      where n.user_id = v_actor_id
        and n.dismissed_at is null

      union all

      select
        a.id as notification_id,
        'announcement'::text as notification_source,
        a.title,
        a.body,
        a.type,
        r.read_at,
        a.created_at,
        null::text as target_post_id,
        null::text as target_comment_id
      from public.announcements a
      left join public.user_notification_reads r
        on r.announcement_id = a.id
       and r.user_id = v_actor_id
      where a.is_active = true
        and a.target_scope = 'all'
        and (a.starts_at is null or a.starts_at <= timezone('utc', now()))
        and (a.expires_at is null or a.expires_at > timezone('utc', now()))
        and not exists (
          select 1
          from public.user_notification_dismissals d
          where d.user_id = v_actor_id
            and d.announcement_id = a.id
        )
    ) rows
    order by rows.created_at desc, rows.notification_id desc
    limit v_limit;
end;
$$;

revoke all on function public.get_user_notifications_v2(integer)
  from public, anon, authenticated, service_role;
grant execute on function public.get_user_notifications_v2(integer)
  to authenticated;

comment on function public.get_user_notifications_v2(integer)
  is 'Authenticated notification read model with validated community post/comment navigation targets. Raw metadata remains server-side.';

commit;
