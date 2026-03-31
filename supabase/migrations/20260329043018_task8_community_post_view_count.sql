begin;

alter table public.posts
  add column if not exists view_count integer not null default 0;

create table if not exists public.community_post_view_events (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  viewer_user_id uuid references auth.users(id) on delete cascade,
  guest_session_id text,
  dedupe_window_start timestamptz not null,
  created_at timestamptz not null default timezone('utc', now())
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'community_post_view_events_viewer_check'
      and conrelid = 'public.community_post_view_events'::regclass
  ) then
    alter table public.community_post_view_events
      add constraint community_post_view_events_viewer_check
      check (
        (viewer_user_id is not null and guest_session_id is null)
        or (
          viewer_user_id is null
          and guest_session_id is not null
          and btrim(guest_session_id) <> ''
        )
      );
  end if;
end
$$;

create index if not exists idx_community_post_view_events_post_created_at
  on public.community_post_view_events (post_id, created_at desc);

create unique index if not exists uq_community_post_view_events_user_window
  on public.community_post_view_events (post_id, viewer_user_id, dedupe_window_start)
  where viewer_user_id is not null;

create unique index if not exists uq_community_post_view_events_guest_window
  on public.community_post_view_events (post_id, guest_session_id, dedupe_window_start)
  where guest_session_id is not null;

alter table public.community_post_view_events enable row level security;

drop policy if exists "community_post_view_events_select_own_or_admin" on public.community_post_view_events;
create policy "community_post_view_events_select_own_or_admin"
on public.community_post_view_events for select
using (public.is_community_admin() or auth.uid() = viewer_user_id);

create or replace function public.community_post_view_window_start(
  p_recorded_at timestamptz default timezone('utc', now())
)
returns timestamptz
language sql
stable
as $$
  select date_bin(
    interval '6 hours',
    coalesce(p_recorded_at, timezone('utc', now())),
    timestamptz '2000-01-01 00:00:00+00'
  );
$$;

create or replace function public.record_community_post_view(
  p_post_id uuid,
  p_guest_session_id text default null
)
returns table (
  counted boolean,
  view_count integer,
  viewer_type text,
  dedupe_window_start timestamptz,
  reason text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  normalized_guest_session_id text := nullif(btrim(coalesce(p_guest_session_id, '')), '');
  target_post public.posts%rowtype;
  resolved_view_count integer := 0;
  inserted_rows integer := 0;
  window_start timestamptz := public.community_post_view_window_start(timezone('utc', now()));
  resolved_viewer_type text := case when actor_id is null then 'guest' else 'user' end;
begin
  select *
  into target_post
  from public.posts p
  where p.id = p_post_id
  limit 1;

  if target_post.id is null then
    return query
    select false, 0, resolved_viewer_type, window_start, 'post_not_found';
    return;
  end if;

  resolved_view_count := coalesce(target_post.view_count, 0);

  if actor_id is not null and target_post.user_id = actor_id then
    return query
    select false, resolved_view_count, 'user', window_start, 'self_view';
    return;
  end if;

  if target_post.visibility is distinct from 'public'
     or target_post.status is distinct from 'active'
     or target_post.deleted_at is not null then
    return query
    select false, resolved_view_count, resolved_viewer_type, window_start, 'post_ineligible';
    return;
  end if;

  if actor_id is null and normalized_guest_session_id is null then
    return query
    select false, resolved_view_count, 'guest', window_start, 'missing_guest_session';
    return;
  end if;

  if actor_id is not null then
    insert into public.community_post_view_events (
      post_id,
      viewer_user_id,
      dedupe_window_start
    )
    values (
      p_post_id,
      actor_id,
      window_start
    )
    on conflict do nothing;
  else
    insert into public.community_post_view_events (
      post_id,
      guest_session_id,
      dedupe_window_start
    )
    values (
      p_post_id,
      normalized_guest_session_id,
      window_start
    )
    on conflict do nothing;
  end if;

  get diagnostics inserted_rows = row_count;

  if inserted_rows > 0 then
    update public.posts
    set view_count = public.posts.view_count + 1
    where id = p_post_id
    returning public.posts.view_count into resolved_view_count;

    return query
    select true, coalesce(resolved_view_count, 0), resolved_viewer_type, window_start, 'counted';
    return;
  end if;

  select p.view_count
  into resolved_view_count
  from public.posts p
  where p.id = p_post_id;

  return query
  select false, coalesce(resolved_view_count, 0), resolved_viewer_type, window_start, 'deduped';
end;
$$;

grant execute on function public.record_community_post_view(uuid, text) to anon, authenticated;

commit;
