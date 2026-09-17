begin;

-- This non-login executor owns only the Guide gateway, never a protected table.
-- SECURITY DEFINER changes to this role, not postgres; Guide RLS remains active.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'nuri_guide_executor') then
    create role nuri_guide_executor nologin noinherit nobypassrls;
  end if;
end $$;
grant nuri_guide_executor to postgres;
create schema if not exists guide_private;
revoke all on schema guide_private from public, anon, authenticated, service_role;
grant usage on schema public, guide_private, extensions, auth to nuri_guide_executor;

create table guide_private.request_keys (
  key_id text primary key,
  secret text not null check (length(secret) >= 64),
  enabled boolean not null default true
);
create table guide_private.used_requests (
  request_id uuid primary key,
  expires_at timestamptz not null
);
create table guide_private.operation_audit (
  request_id uuid primary key,
  operator_id uuid not null references public.admin_operator_accounts(id),
  guide_id uuid not null,
  action text not null check (action in ('create', 'update', 'archive')),
  previous_updated_at timestamptz,
  resulting_updated_at timestamptz not null,
  created_at timestamptz not null default clock_timestamp()
);
alter table guide_private.request_keys enable row level security;
alter table guide_private.used_requests enable row level security;
alter table guide_private.operation_audit enable row level security;
create policy guide_keys_executor_read on guide_private.request_keys
  for select to nuri_guide_executor using (true);
create policy guide_requests_executor on guide_private.used_requests
  for all to nuri_guide_executor using (true) with check (true);
create policy guide_audit_executor_insert on guide_private.operation_audit
  for insert to nuri_guide_executor with check (
    operator_id = nullif(current_setting('nuri.guide_actor', true), '')::uuid);
grant select on guide_private.request_keys to nuri_guide_executor;
grant insert, delete on guide_private.used_requests to nuri_guide_executor;
grant select (expires_at) on guide_private.used_requests to nuri_guide_executor;
grant insert on guide_private.operation_audit to nuri_guide_executor;
revoke all on all tables in schema guide_private from public, anon, authenticated, service_role;

alter table public.pet_care_guides
  add column created_by_operator_id uuid references public.admin_operator_accounts(id),
  add column updated_by_operator_id uuid references public.admin_operator_accounts(id);

-- Credential and MFA secrets are not granted. Only the signed subject's status
-- is readable by the gateway's non-login role; client roles keep zero access.
grant select (id, role, capabilities, auth_version, must_change_password, disabled_at)
  on public.admin_operator_accounts to nuri_guide_executor;
create policy guide_executor_subject_status on public.admin_operator_accounts
  for select to nuri_guide_executor using (
    id = nullif(current_setting('nuri.guide_actor', true), '')::uuid);
grant select (operator_account_id, enabled_at, disabled_at)
  on public.admin_operator_mfa_factors to nuri_guide_executor;
create policy guide_executor_subject_mfa on public.admin_operator_mfa_factors
  for select to nuri_guide_executor using (
    operator_account_id = nullif(current_setting('nuri.guide_actor', true), '')::uuid);

grant select, insert, update on public.pet_care_guides to nuri_guide_executor;
create policy pet_care_guides_operator_gateway on public.pet_care_guides
  for all to nuri_guide_executor using (
    nullif(current_setting('nuri.guide_actor', true), '') is not null)
  with check (nullif(current_setting('nuri.guide_actor', true), '') is not null);

create function public.pack04_track_guide_actor() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare v_actor uuid;
begin
  if current_user = 'nuri_guide_executor' then
    v_actor := nullif(current_setting('nuri.guide_actor', true), '')::uuid;
    if v_actor is null then raise exception 'GUIDE_OPERATOR_REQUIRED' using errcode = '42501'; end if;
    if tg_op = 'INSERT' then
      new.created_by := null;
      new.created_by_operator_id := v_actor;
      new.created_at := clock_timestamp();
    else
      new.created_by := old.created_by;
      new.created_by_operator_id := old.created_by_operator_id;
      new.created_at := old.created_at;
    end if;
    new.updated_by := null;
    new.updated_by_operator_id := v_actor;
    new.updated_at := clock_timestamp();
  elsif auth.uid() is not null then
    -- The legacy authenticated mobile/admin path keeps its auth.users contract.
    if tg_op = 'INSERT' then
      new.created_by := auth.uid();
      new.created_by_operator_id := null;
      new.created_at := clock_timestamp();
    else
      new.created_by := old.created_by;
      new.created_by_operator_id := old.created_by_operator_id;
      new.created_at := old.created_at;
    end if;
    new.updated_by := auth.uid();
    new.updated_by_operator_id := null;
    new.updated_at := clock_timestamp();
  end if;
  return new;
end $$;
create trigger zz_pack04_guide_actor before insert or update on public.pet_care_guides
  for each row execute function public.pack04_track_guide_actor();

create function public.guide_operator_request_v1(p_body text, p_signature text)
returns jsonb language plpgsql security definer
set search_path = '' set row_security = on as $$
declare
  v_claims jsonb;
  v_input jsonb;
  v_key text;
  v_now bigint := floor(extract(epoch from clock_timestamp()))::bigint;
  v_actor uuid;
  v_account record;
  v_action text;
  v_before public.pet_care_guides%rowtype;
  v_row public.pet_care_guides%rowtype;
  v_id uuid;
  v_result jsonb;
  v_query text;
begin
  if p_body is null or p_signature is null or length(p_body) > 350000
    or p_signature !~ '^[0-9a-f]{64}$' then
    raise exception 'GUIDE_REQUEST_INVALID' using errcode = '42501';
  end if;
  begin
    v_claims := convert_from(decode(p_body, 'base64'), 'UTF8')::jsonb;
  exception when others then
    raise exception 'GUIDE_REQUEST_INVALID' using errcode = '42501';
  end;
  select secret into v_key from guide_private.request_keys
    where key_id = v_claims->>'keyId' and enabled;
  if v_key is null or encode(extensions.hmac(p_body, v_key, 'sha256'), 'hex') <> p_signature then
    raise exception 'GUIDE_REQUEST_INVALID' using errcode = '42501';
  end if;
  if v_claims->>'audience' is distinct from 'nuri-guide-operator-v1'
    or coalesce((v_claims->>'issuedAt')::bigint, 0) < v_now - 60
    or coalesce((v_claims->>'issuedAt')::bigint, 0) > v_now + 5
    or coalesce((v_claims->>'expiresAt')::bigint, 0) <= v_now
    or (v_claims->>'expiresAt')::bigint > (v_claims->>'issuedAt')::bigint + 60 then
    raise exception 'GUIDE_REQUEST_EXPIRED' using errcode = '42501';
  end if;
  v_actor := (v_claims->>'operatorId')::uuid;
  perform set_config('nuri.guide_actor', v_actor::text, true);
  select id, role, capabilities, auth_version, must_change_password, disabled_at
    into v_account from public.admin_operator_accounts where id = v_actor;
  if not found or v_account.disabled_at is not null or v_account.must_change_password
    or v_account.auth_version is distinct from (v_claims->>'authVersion')::integer
    or not ('guides.manage' = any(v_account.capabilities)
      or (cardinality(v_account.capabilities) = 0 and v_account.role in ('admin', 'super_admin', 'owner'))) then
    raise exception 'GUIDE_PERMISSION_DENIED' using errcode = '42501';
  end if;
  if exists (select 1 from public.admin_operator_mfa_factors
    where operator_account_id = v_actor and enabled_at is not null and disabled_at is null
      and coalesce(to_timestamp((v_claims->>'mfaVerifiedAt')::bigint / 1000.0), '-infinity'::timestamptz) < enabled_at) then
    raise exception 'GUIDE_MFA_REQUIRED' using errcode = '42501';
  end if;
  v_action := v_claims->>'action';
  v_input := v_claims->'input';
  if jsonb_typeof(v_input) is distinct from 'object' then
    raise exception 'GUIDE_INPUT_INVALID' using errcode = '22023';
  end if;
  if v_action = 'list' then
    v_query := '%' || replace(replace(replace(coalesce(v_input->>'query', ''), E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%';
    select coalesce(jsonb_agg(to_jsonb(g)), '[]'::jsonb) into v_result from (
      select * from public.pet_care_guides where deleted_at is null
        and (coalesce(v_input->>'query', '') = '' or title ilike v_query or summary ilike v_query or slug ilike v_query or category ilike v_query)
        and (coalesce(v_input->>'status', 'all') = 'all' or status::text = v_input->>'status')
        and (coalesce(v_input->>'activity', 'all') = 'all' or is_active = ((v_input->>'activity') = 'active'))
      order by case when v_input->>'sort' = 'priority_desc' then priority end desc,
        case when v_input->>'sort' = 'sort_order_asc' then sort_order end asc, updated_at desc
      limit 100
    ) g;
    return v_result;
  elsif v_action = 'detail' then
    select to_jsonb(g) into v_result from public.pet_care_guides g
      where id = (v_input->>'id')::uuid and deleted_at is null;
    return v_result;
  elsif v_action = 'summary' then
    return jsonb_build_object('total', (select count(*) from public.pet_care_guides where deleted_at is null),
      'published', (select count(*) from public.pet_care_guides where deleted_at is null and status = 'published'));
  elsif v_action not in ('create', 'update', 'archive') then
    raise exception 'GUIDE_ACTION_INVALID' using errcode = '22023';
  end if;

  delete from guide_private.used_requests where expires_at < clock_timestamp();
  insert into guide_private.used_requests values ((v_claims->>'requestId')::uuid,
    to_timestamp((v_claims->>'expiresAt')::bigint));
  v_id := (v_input->>'id')::uuid;
  if v_action <> 'create' then
    select * into v_before from public.pet_care_guides where id = v_id and deleted_at is null for update;
    if not found then raise exception 'GUIDE_NOT_FOUND' using errcode = 'P0002'; end if;
  end if;
  if v_action = 'archive' then
    update public.pet_care_guides set status = 'archived', is_active = false,
      archived_at = clock_timestamp(), deleted_at = clock_timestamp()
      where id = v_id returning * into v_row;
  else
    -- Populate only editable fields: caller-provided author/timestamp/audit values
    -- are never used, including legacy auth.users IDs.
    select * into v_row from jsonb_populate_record(null::public.pet_care_guides, v_input);
    if v_action = 'create' then
      insert into public.pet_care_guides (id, slug, title, summary, body, body_preview, category,
        tags, target_species, species_keys, content_blocks, source_references,
        species_keywords, search_keywords, age_policy_type, age_policy_life_stage,
        age_policy_min_months, age_policy_max_months, status, is_active, priority,
        sort_order, rotation_weight, published_at, archived_at,
        thumbnail_image_url, cover_image_url, image_alt)
      values (v_id, v_row.slug, v_row.title, v_row.summary, v_row.body, v_row.body_preview,
        v_row.category, v_row.tags, v_row.target_species, v_row.species_keys,
        v_row.content_blocks, v_row.source_references, v_row.species_keywords,
        v_row.search_keywords, v_row.age_policy_type, v_row.age_policy_life_stage,
        v_row.age_policy_min_months, v_row.age_policy_max_months, v_row.status,
        v_row.is_active, v_row.priority, v_row.sort_order, v_row.rotation_weight,
        v_row.published_at, v_row.archived_at, v_row.thumbnail_image_url,
        v_row.cover_image_url, v_row.image_alt) returning * into v_row;
    else
      update public.pet_care_guides set slug = v_row.slug, title = v_row.title,
        summary = v_row.summary, body = v_row.body, body_preview = v_row.body_preview,
        category = v_row.category, tags = v_row.tags, target_species = v_row.target_species,
        species_keys = v_row.species_keys, content_blocks = v_row.content_blocks,
        source_references = v_row.source_references, species_keywords = v_row.species_keywords,
        search_keywords = v_row.search_keywords, age_policy_type = v_row.age_policy_type,
        age_policy_life_stage = v_row.age_policy_life_stage,
        age_policy_min_months = v_row.age_policy_min_months,
        age_policy_max_months = v_row.age_policy_max_months, status = v_row.status,
        is_active = v_row.is_active, priority = v_row.priority, sort_order = v_row.sort_order,
        rotation_weight = v_row.rotation_weight, published_at = v_row.published_at,
        archived_at = v_row.archived_at, thumbnail_image_url = v_row.thumbnail_image_url,
        cover_image_url = v_row.cover_image_url, image_alt = v_row.image_alt
        where id = v_id returning * into v_row;
    end if;
  end if;
  insert into guide_private.operation_audit (request_id, operator_id, guide_id, action,
    previous_updated_at, resulting_updated_at)
    values ((v_claims->>'requestId')::uuid, v_actor, v_id, v_action,
      v_before.updated_at, v_row.updated_at);
  return to_jsonb(v_row);
end $$;
grant create on schema public to nuri_guide_executor;
alter function public.guide_operator_request_v1(text, text) owner to nuri_guide_executor;
revoke create on schema public from nuri_guide_executor;
revoke all on function public.guide_operator_request_v1(text, text) from public, anon, authenticated, service_role;
grant execute on function public.guide_operator_request_v1(text, text) to anon, authenticated;
revoke all on function public.pack04_track_guide_actor() from public, anon, authenticated, service_role;

comment on function public.guide_operator_request_v1(text, text) is
  'Guide-only signed requests from an already verified admin session. Non-owner NOBYPASSRLS executor; no service-role gateway, no actor supplied outside the signed envelope.';
comment on column public.pet_care_guides.created_by_operator_id is
  'Authenticated custom CMS operator identity; additive and distinct from legacy created_by auth.users.';

commit;
