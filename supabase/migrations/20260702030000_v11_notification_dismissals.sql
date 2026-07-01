begin;

alter table public.user_notifications
  add column if not exists dismissed_at timestamptz;

create index if not exists idx_user_notifications_user_visible_created
  on public.user_notifications (user_id, dismissed_at, created_at desc);

create table if not exists public.user_notification_dismissals (
  user_id uuid not null references auth.users(id) on delete cascade,
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  dismissed_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, announcement_id)
);

alter table public.user_notification_dismissals enable row level security;

drop policy if exists user_notification_dismissals_select_own
  on public.user_notification_dismissals;
create policy user_notification_dismissals_select_own
  on public.user_notification_dismissals
  for select
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.get_user_notification_unread_count_v1()
returns integer
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
declare
  v_actor_id uuid := auth.uid();
  v_count integer;
begin
  if v_actor_id is null then
    raise exception 'NURI_AUTH_REQUIRED'
      using errcode = '42501';
  end if;

  select (
    select count(*)::integer
    from public.user_notifications n
    where n.user_id = v_actor_id
      and n.read_at is null
      and n.dismissed_at is null
  ) + (
    select count(*)::integer
    from public.announcements a
    where a.is_active = true
      and a.target_scope = 'all'
      and (a.starts_at is null or a.starts_at <= timezone('utc', now()))
      and (a.expires_at is null or a.expires_at > timezone('utc', now()))
      and not exists (
        select 1
        from public.user_notification_reads r
        where r.user_id = v_actor_id
          and r.announcement_id = a.id
      )
      and not exists (
        select 1
        from public.user_notification_dismissals d
        where d.user_id = v_actor_id
          and d.announcement_id = a.id
      )
  )
    into v_count;

  return coalesce(v_count, 0);
end;
$$;

create or replace function public.get_user_notifications_v1(
  p_limit integer default 50
)
returns table (
  notification_id uuid,
  notification_source text,
  title text,
  body text,
  type text,
  read_at timestamptz,
  created_at timestamptz
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
        n.created_at
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
        a.created_at
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

create or replace function public.dismiss_user_notification_v1(
  p_notification_id uuid,
  p_notification_source text default 'user'
)
returns integer
language plpgsql
volatile
security definer
set search_path = public, pg_catalog
as $$
declare
  v_actor_id uuid := auth.uid();
  v_source text := nullif(btrim(coalesce(p_notification_source, '')), '');
begin
  if v_actor_id is null then
    raise exception 'NURI_AUTH_REQUIRED'
      using errcode = '42501';
  end if;

  if p_notification_id is null then
    raise exception 'NURI_NOTIFICATION_INVALID'
      using errcode = '22023';
  end if;

  if v_source = 'user' then
    update public.user_notifications
      set
        read_at = coalesce(read_at, timezone('utc', now())),
        dismissed_at = coalesce(dismissed_at, timezone('utc', now()))
    where id = p_notification_id
      and user_id = v_actor_id;
  elsif v_source = 'announcement' then
    insert into public.user_notification_dismissals (
      user_id,
      announcement_id,
      dismissed_at
    )
    select
      v_actor_id,
      a.id,
      timezone('utc', now())
    from public.announcements a
    where a.id = p_notification_id
      and a.is_active = true
      and a.target_scope = 'all'
      and (a.starts_at is null or a.starts_at <= timezone('utc', now()))
      and (a.expires_at is null or a.expires_at > timezone('utc', now()))
    on conflict (user_id, announcement_id) do update
      set dismissed_at = excluded.dismissed_at;
  else
    raise exception 'NURI_NOTIFICATION_INVALID'
      using errcode = '22023';
  end if;

  return public.get_user_notification_unread_count_v1();
end;
$$;

create or replace function public.dismiss_all_user_notifications_v1()
returns integer
language plpgsql
volatile
security definer
set search_path = public, pg_catalog
as $$
declare
  v_actor_id uuid := auth.uid();
begin
  if v_actor_id is null then
    raise exception 'NURI_AUTH_REQUIRED'
      using errcode = '42501';
  end if;

  update public.user_notifications
    set
      read_at = coalesce(read_at, timezone('utc', now())),
      dismissed_at = coalesce(dismissed_at, timezone('utc', now()))
  where user_id = v_actor_id
    and dismissed_at is null;

  insert into public.user_notification_dismissals (
    user_id,
    announcement_id,
    dismissed_at
  )
  select
    v_actor_id,
    a.id,
    timezone('utc', now())
  from public.announcements a
  where a.is_active = true
    and a.target_scope = 'all'
    and (a.starts_at is null or a.starts_at <= timezone('utc', now()))
    and (a.expires_at is null or a.expires_at > timezone('utc', now()))
  on conflict (user_id, announcement_id) do update
    set dismissed_at = excluded.dismissed_at;

  return public.get_user_notification_unread_count_v1();
end;
$$;

revoke all on table public.user_notification_dismissals from public, anon;
revoke all on function public.dismiss_user_notification_v1(uuid, text)
  from public, anon, authenticated, service_role;
revoke all on function public.dismiss_all_user_notifications_v1()
  from public, anon, authenticated, service_role;

grant execute on function public.dismiss_user_notification_v1(uuid, text)
  to authenticated;
grant execute on function public.dismiss_all_user_notifications_v1()
  to authenticated;

comment on column public.user_notifications.dismissed_at
  is 'User-scoped notification dismiss timestamp. Rows are hidden from app read path without deleting notification evidence.';
comment on table public.user_notification_dismissals
  is 'User-scoped announcement dismiss ledger. Hides global announcements for one user without mutating the announcement.';

commit;
