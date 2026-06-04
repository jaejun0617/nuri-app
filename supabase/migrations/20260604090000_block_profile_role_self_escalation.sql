begin;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'app_role'
  ) then
    create type public.app_role as enum ('user', 'admin', 'super_admin');
  end if;
end
$$;

alter table public.profiles
  add column if not exists role public.app_role not null default 'user';

-- V1.0 P0 corrective guard:
-- public client profile updates may edit normal profile fields, but role changes
-- must stay server-controlled. RLS alone cannot compare OLD.role and NEW.role,
-- so this trigger blocks role escalation at the DB boundary.
create or replace function public.prevent_profile_role_self_escalation()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
declare
  jwt_role text := coalesce(auth.role(), '');
  db_role text := current_user;
  privileged boolean :=
    jwt_role = 'service_role'
    or db_role in ('postgres', 'service_role', 'supabase_admin');
begin
  if tg_op = 'INSERT' then
    if not privileged and coalesce(new.role::text, 'user') <> 'user' then
      raise exception using
        errcode = '42501',
        message = 'PROFILE_ROLE_UPDATE_FORBIDDEN';
    end if;

    return new;
  end if;

  if tg_op = 'UPDATE' and old.role is distinct from new.role and not privileged then
    raise exception using
      errcode = '42501',
      message = 'PROFILE_ROLE_UPDATE_FORBIDDEN';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prevent_profile_role_self_escalation on public.profiles;
create trigger trg_prevent_profile_role_self_escalation
before insert or update on public.profiles
for each row
execute function public.prevent_profile_role_self_escalation();

comment on function public.prevent_profile_role_self_escalation()
  is 'Blocks anon/authenticated public clients from inserting or updating elevated profiles.role values while preserving service_role/postgres role administration.';

commit;
