begin;

create schema if not exists tutorial_private;
revoke all on schema tutorial_private from public, anon, authenticated;

create table tutorial_private.activation (
  singleton boolean primary key default true check (singleton),
  active_since timestamptz
);
insert into tutorial_private.activation(singleton) values (true);

create table tutorial_private.progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null check (topic in ('home', 'record', 'timeline', 'schedule-list', 'schedule-create')),
  state text not null check (state in ('completed', 'skipped')),
  primary key (user_id, topic)
);
alter table tutorial_private.activation enable row level security;
alter table tutorial_private.progress enable row level security;
revoke all on all tables in schema tutorial_private from public, anon, authenticated;

create function public.tutorial_progress_v1(p_topic text default null, p_state text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  eligible boolean;
  starting_at timestamptz;
  result jsonb;
begin
  select active_since into starting_at from tutorial_private.activation where singleton;
  select coalesce(u.created_at >= starting_at, false) into eligible
    from auth.users u join auth.sessions s on s.user_id = u.id
    where u.id = actor and s.id = nullif(auth.jwt()->>'session_id', '')::uuid
      and coalesce(s.not_after, 'infinity'::timestamptz) > statement_timestamp()
      and coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false;
  if not found then raise insufficient_privilege using message = 'TUTORIAL_AUTH_REQUIRED'; end if;
  if (p_topic is null) <> (p_state is null) or
     (p_topic is not null and (p_topic not in ('home','record','timeline','schedule-list','schedule-create')
       or p_state not in ('completed','skipped'))) then
    raise invalid_parameter_value using message = 'TUTORIAL_INVALID_INPUT';
  end if;
  if eligible and p_topic is not null then
    insert into tutorial_private.progress as current_state(user_id, topic, state)
    values (actor, p_topic, p_state)
    on conflict (user_id, topic) do update set state = excluded.state
    where current_state.state = 'skipped' and excluded.state = 'completed';
  end if;
  select coalesce(jsonb_object_agg(topic,state), '{}'::jsonb) into result
    from tutorial_private.progress where user_id = actor and eligible;
  return jsonb_build_object('eligible',eligible,'states',result);
end $$;

revoke all on function public.tutorial_progress_v1(text,text) from public, anon, authenticated, service_role;
grant execute on function public.tutorial_progress_v1(text,text) to authenticated;
notify pgrst, 'reload schema';
commit;
