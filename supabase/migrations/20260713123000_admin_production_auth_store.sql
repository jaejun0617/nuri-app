begin;

create table if not exists public.admin_operator_accounts (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  display_name text not null default 'NURI 관리자',
  password_algorithm text not null default 'scrypt',
  password_salt text not null,
  password_hash text not null,
  password_key_length integer not null default 64,
  password_params jsonb not null default '{"N":16384,"r":8,"p":1,"maxmem":67108864}'::jsonb,
  role text not null default 'admin',
  capabilities text[] not null default '{}'::text[],
  must_change_password boolean not null default true,
  auth_version integer not null default 1,
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  last_login_at timestamptz,
  password_changed_at timestamptz,
  disabled_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint admin_operator_accounts_username_not_blank
    check (btrim(username) <> ''),
  constraint admin_operator_accounts_password_algorithm_check
    check (password_algorithm = 'scrypt'),
  constraint admin_operator_accounts_password_material_not_blank
    check (btrim(password_salt) <> '' and btrim(password_hash) <> ''),
  constraint admin_operator_accounts_password_key_length_check
    check (password_key_length between 32 and 128),
  constraint admin_operator_accounts_password_params_object_check
    check (jsonb_typeof(password_params) = 'object'),
  constraint admin_operator_accounts_role_check
    check (role in ('viewer', 'operator', 'moderator', 'hospital_reviewer', 'admin', 'super_admin', 'owner')),
  constraint admin_operator_accounts_auth_version_check
    check (auth_version >= 1),
  constraint admin_operator_accounts_failed_attempts_check
    check (failed_attempts between 0 and 5)
);

create unique index if not exists idx_admin_operator_accounts_username_ci
  on public.admin_operator_accounts (lower(username));

create index if not exists idx_admin_operator_accounts_active
  on public.admin_operator_accounts (disabled_at, locked_until);

drop trigger if exists trg_admin_operator_accounts_updated_at
  on public.admin_operator_accounts;
create trigger trg_admin_operator_accounts_updated_at
before update on public.admin_operator_accounts
for each row execute function public.set_updated_at();

alter table public.admin_operator_accounts enable row level security;

revoke all on table public.admin_operator_accounts from public, anon, authenticated;
grant select, insert, update on table public.admin_operator_accounts to service_role;

comment on table public.admin_operator_accounts is
  'Server-only persistent credential store for the NURI production admin console. RLS has no client policy; plaintext passwords, session tokens, and provider secrets are forbidden.';

comment on column public.admin_operator_accounts.password_hash is
  'Base64url scrypt output only. Never stores plaintext passwords.';

comment on column public.admin_operator_accounts.auth_version is
  'Incremented on password or account security changes to invalidate previously issued admin sessions.';

commit;
