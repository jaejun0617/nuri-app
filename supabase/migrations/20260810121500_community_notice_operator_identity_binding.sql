begin;

-- Bind the approved app auth identity to the existing operator capability
-- catalog without placing an auth UUID in source or granting a global role.
create table if not exists public.community_notice_operator_bindings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  actor_label text not null references public.admin_operator_role_assignments(actor_label) on delete restrict,
  capability text not null default 'community_notice_operator',
  is_active boolean not null default true,
  assigned_by text not null default 'NURI-09',
  operator_note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint community_notice_binding_capability_check
    check (capability = 'community_notice_operator'),
  constraint community_notice_binding_actor_not_blank
    check (btrim(actor_label) <> '')
);

drop trigger if exists trg_community_notice_operator_bindings_updated_at
  on public.community_notice_operator_bindings;
create trigger trg_community_notice_operator_bindings_updated_at
before update on public.community_notice_operator_bindings
for each row execute function public.set_updated_at();

alter table public.community_notice_operator_bindings enable row level security;
revoke all on table public.community_notice_operator_bindings from public, anon, authenticated;
grant select on table public.community_notice_operator_bindings to service_role;

insert into public.community_notice_operator_bindings (
  user_id,
  actor_label,
  capability,
  is_active,
  assigned_by,
  operator_note
)
select
  p.user_id,
  'adminQA',
  'community_notice_operator',
  true,
  'NURI-09',
  'Identity binding for the narrow community notice capability only.'
from public.profiles p
where lower(p.nickname) = 'adminqa'
  and p.role = 'user'
on conflict (user_id)
do update set
  actor_label = excluded.actor_label,
  capability = excluded.capability,
  is_active = excluded.is_active,
  assigned_by = excluded.assigned_by,
  operator_note = excluded.operator_note,
  updated_at = timezone('utc', now());

do $$
begin
  if not exists (
    select 1
    from public.community_notice_operator_bindings b
    join public.admin_operator_role_assignments a
      on a.actor_label = b.actor_label
    where b.actor_label = 'adminQA'
      and b.capability = 'community_notice_operator'
      and b.is_active = true
      and a.is_active = true
      and 'community_notice_operator' = any(a.capabilities)
  ) then
    raise exception 'community_notice_operator_identity_missing'
      using errcode = '42501';
  end if;
end
$$;

create or replace function public.is_community_notice_operator()
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select public.is_nuri_ops_admin_v1()
    or exists (
      select 1
      from public.community_notice_operator_bindings b
      join public.admin_operator_role_assignments a
        on a.actor_label = b.actor_label
      where b.user_id = auth.uid()
        and b.capability = 'community_notice_operator'
        and b.is_active = true
        and a.is_active = true
        and 'community_notice_operator' = any(a.capabilities)
    );
$$;

revoke all on function public.is_community_notice_operator() from public, anon, authenticated;
grant execute on function public.is_community_notice_operator() to service_role;

commit;
