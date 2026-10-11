-- Bounded view accounting, not proof of unique human visitors.
create table public.community_view_budgets (
  bucket_key text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  period_start timestamptz not null,
  day_start timestamptz not null,
  period_count integer not null default 0 check(period_count>=0),
  day_count integer not null default 0 check(day_count>=0)
);
alter table public.community_view_budgets enable row level security;
revoke all on public.community_view_budgets from public,anon,authenticated,service_role;
revoke insert,update,delete,truncate,references,trigger on public.community_post_view_events from anon,authenticated;

create function public.claim_community_view_budget_v1(p_actor uuid,p_post uuid,p_window timestamptz)
returns boolean language plpgsql security definer set search_path=public,pg_catalog as $$
declare
  minute_start timestamptz:=date_trunc('minute',now());
  today_start timestamptz:=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC';
  keys text[]; starts timestamptz[]; period_limits integer[]; day_limits integer[];
  item public.community_view_budgets%rowtype; i integer;
begin
  -- Caller RPC holds one lock for dedupe, all counters, event insert and aggregate.
  if p_actor is null then
    keys:=array['global:guest','post:'||p_post::text];
    starts:=array[minute_start,p_window]; period_limits:=array[120,100]; day_limits:=array[10000,400];
  else
    keys:=array['global:user','user:'||p_actor::text];
    starts:=array[minute_start,minute_start]; period_limits:=array[600,30]; day_limits:=array[20000,500];
  end if;
  for i in 1..2 loop
    insert into public.community_view_budgets(bucket_key,user_id,post_id,period_start,day_start)
      values(keys[i],case when i=2 then p_actor end,case when i=2 and p_actor is null then p_post end,starts[i],today_start)
      on conflict(bucket_key) do nothing;
    select * into item from public.community_view_budgets where bucket_key=keys[i];
    if (item.period_start=starts[i] and item.period_count>=period_limits[i])
       or (item.day_start=today_start and item.day_count>=day_limits[i]) then return false; end if;
  end loop;
  for i in 1..2 loop
    update public.community_view_budgets
      set period_count=case when period_start=starts[i] then period_count+1 else 1 end,
          day_count=case when day_start=today_start then day_count+1 else 1 end,
          period_start=starts[i],day_start=today_start where bucket_key=keys[i];
  end loop;
  return true;
end;
$$;
revoke all on function public.claim_community_view_budget_v1(uuid,uuid,timestamptz) from public,anon,authenticated,service_role;

create or replace function public.record_community_post_view(p_post_id uuid,p_guest_session_id text default null)
returns table(counted boolean,view_count integer,viewer_type text,dedupe_window_start timestamptz,reason text)
language plpgsql security definer set search_path=public,pg_catalog as $$
declare
  actor uuid:=auth.uid(); guest_id text:=nullif(btrim(p_guest_session_id),'');
  viewer text:=case when actor is null then 'guest' else 'user' end;
  window_start timestamptz:=public.community_post_view_window_start(now());
  target public.posts%rowtype; duplicate_view boolean;
begin
  -- Eligibility always precedes existence/count/self-view responses.
  if not public.community_parent_post_visible_to_current_user(p_post_id) then
    return query select false,0,viewer,window_start,'post_ineligible'::text; return;
  end if;
  if actor is not null and not exists(select 1 from auth.users where id=actor and deleted_at is null) then
    raise exception 'NURI_AUTH_REQUIRED' using errcode='42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('nuri:community-view-budget',0));
  select * into target from public.posts where id=p_post_id for update;
  if target.id is null or not public.community_parent_post_visible_to_current_user(p_post_id) then
    return query select false,0,viewer,window_start,'post_ineligible'::text; return;
  end if;
  if actor=target.user_id then
    return query select false,target.view_count,viewer,window_start,'self_view'::text; return;
  end if;
  if actor is null then
    -- IDs are only dedupe hints. Rotation cannot create an unbounded event budget.
    if guest_id is null or guest_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      return query select false,target.view_count,viewer,window_start,'missing_guest_session'::text; return;
    end if;
    select exists(select 1 from public.community_post_view_events e
      where e.post_id=p_post_id and e.guest_session_id=guest_id and e.dedupe_window_start=window_start)
      into duplicate_view;
  else
    select exists(select 1 from public.community_post_view_events e
      where e.post_id=p_post_id and e.viewer_user_id=actor and e.dedupe_window_start=window_start)
      into duplicate_view;
  end if;
  if duplicate_view then
    return query select false,target.view_count,viewer,window_start,'deduped'::text; return;
  end if;
  if not public.claim_community_view_budget_v1(actor,p_post_id,window_start) then
    return query select false,target.view_count,viewer,window_start,'view_limited'::text; return;
  end if;
  insert into public.community_post_view_events(post_id,viewer_user_id,guest_session_id,dedupe_window_start)
    values(p_post_id,actor,case when actor is null then guest_id end,window_start);
  update public.posts set view_count=public.posts.view_count+1 where id=p_post_id
    returning public.posts.view_count into target.view_count;
  return query select true,target.view_count,viewer,window_start,'counted'::text;
end;
$$;
revoke all on function public.record_community_post_view(uuid,text) from public;
grant execute on function public.record_community_post_view(uuid,text) to anon,authenticated;
