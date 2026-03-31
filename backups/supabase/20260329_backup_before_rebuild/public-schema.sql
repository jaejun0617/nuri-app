--
-- PostgreSQL database dump
--

\restrict GMnWsNGONOVAost0PihH23fnTEHhsoQZtvD7Qow0m15yo8ei4Hypgq09w3JOmhX

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";

--
-- Name: SCHEMA "public"; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA "public" IS 'standard public schema';


--
-- Name: app_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."app_role" AS ENUM (
    'user',
    'admin',
    'super_admin'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";

--
-- Name: emotion_tag; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."emotion_tag" AS ENUM (
    'happy',
    'calm',
    'excited',
    'neutral',
    'sad',
    'anxious',
    'angry',
    'tired'
);


ALTER TYPE "public"."emotion_tag" OWNER TO "postgres";

--
-- Name: guide_age_policy_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."guide_age_policy_type" AS ENUM (
    'all',
    'lifeStage',
    'ageRange'
);


ALTER TYPE "public"."guide_age_policy_type" OWNER TO "postgres";

--
-- Name: guide_content_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."guide_content_status" AS ENUM (
    'draft',
    'published',
    'archived'
);


ALTER TYPE "public"."guide_content_status" OWNER TO "postgres";

--
-- Name: guide_event_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."guide_event_type" AS ENUM (
    'home_impression',
    'list_click',
    'detail_view'
);


ALTER TYPE "public"."guide_event_type" OWNER TO "postgres";

--
-- Name: guide_life_stage_key; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."guide_life_stage_key" AS ENUM (
    'baby',
    'adult',
    'senior'
);


ALTER TYPE "public"."guide_life_stage_key" OWNER TO "postgres";

--
-- Name: memory_image_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."memory_image_status" AS ENUM (
    'pending',
    'ready',
    'failed'
);


ALTER TYPE "public"."memory_image_status" OWNER TO "postgres";

--
-- Name: notification_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."notification_type" AS ENUM (
    'system',
    'anniversary',
    'daily_recall',
    'community_comment',
    'community_like',
    'subscription',
    'support'
);


ALTER TYPE "public"."notification_type" OWNER TO "postgres";

--
-- Name: pet_gender; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."pet_gender" AS ENUM (
    'male',
    'female',
    'unknown'
);


ALTER TYPE "public"."pet_gender" OWNER TO "postgres";

--
-- Name: pet_species_group; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."pet_species_group" AS ENUM (
    'dog',
    'cat',
    'other'
);


ALTER TYPE "public"."pet_species_group" OWNER TO "postgres";

--
-- Name: recall_mode; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."recall_mode" AS ENUM (
    'anniversary',
    'random',
    'emotion_based'
);


ALTER TYPE "public"."recall_mode" OWNER TO "postgres";

--
-- Name: subscription_tier; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."subscription_tier" AS ENUM (
    'free',
    'plus',
    'pro'
);


ALTER TYPE "public"."subscription_tier" OWNER TO "postgres";

--
-- Name: visibility; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."visibility" AS ENUM (
    'public',
    'private'
);


ALTER TYPE "public"."visibility" OWNER TO "postgres";

--
-- Name: account_deletion_column_exists("text", "text", "text"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."account_deletion_column_exists"("p_schema" "text", "p_table" "text", "p_column" "text") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select exists (
    select 1
    from information_schema.columns
    where table_schema = p_schema
      and table_name = p_table
      and column_name = p_column
  );
$$;


ALTER FUNCTION "public"."account_deletion_column_exists"("p_schema" "text", "p_table" "text", "p_column" "text") OWNER TO "postgres";

--
-- Name: account_deletion_set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."account_deletion_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;


ALTER FUNCTION "public"."account_deletion_set_updated_at"() OWNER TO "postgres";

--
-- Name: account_deletion_table_exists("text", "text"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."account_deletion_table_exists"("p_schema" "text", "p_table" "text") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select to_regclass(format('%I.%I', p_schema, p_table)) is not null;
$$;


ALTER FUNCTION "public"."account_deletion_table_exists"("p_schema" "text", "p_table" "text") OWNER TO "postgres";

--
-- Name: apply_community_moderation_action("text", "uuid", "text", "text", "uuid", "text", "text", "text", "text"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."apply_community_moderation_action"("p_target_type" "text", "p_target_id" "uuid", "p_after_status" "text", "p_reason_code" "text" DEFAULT NULL::"text", "p_source_report_id" "uuid" DEFAULT NULL::"uuid", "p_operator_memo" "text" DEFAULT NULL::"text", "p_queue_status" "text" DEFAULT 'resolved'::"text", "p_report_status" "text" DEFAULT NULL::"text", "p_decision" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_now timestamptz := timezone('utc', now());
  v_next_report_status text := coalesce(
    p_report_status,
    case
      when p_after_status = 'active' then 'resolved_no_action'
      else 'resolved_actioned'
    end
  );
begin
  if not public.is_community_admin() then
    raise exception '운영 권한이 필요합니다.';
  end if;

  perform public.set_community_target_status(
    p_target_type,
    p_target_id,
    p_after_status,
    case
      when p_after_status = 'active' then 'restore'
      else 'manual_moderation'
    end,
    p_reason_code,
    p_source_report_id,
    p_operator_memo,
    auth.uid(),
    p_queue_status,
    coalesce(
      p_decision,
      case
        when p_after_status = 'active' then 'restored'
        else p_after_status
      end
    )
  );

  if p_source_report_id is not null then
    update public.reports
    set
      status = v_next_report_status,
      resolved_by = auth.uid(),
      resolved_at = v_now,
      operator_memo = coalesce(nullif(btrim(coalesce(p_operator_memo, '')), ''), operator_memo)
    where id = p_source_report_id;
  end if;
end;
$$;


ALTER FUNCTION "public"."apply_community_moderation_action"("p_target_type" "text", "p_target_id" "uuid", "p_after_status" "text", "p_reason_code" "text", "p_source_report_id" "uuid", "p_operator_memo" "text", "p_queue_status" "text", "p_report_status" "text", "p_decision" "text") OWNER TO "postgres";

--
-- Name: assert_community_actor_id_is_active("uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."assert_community_actor_id_is_active"("target_actor_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
declare
  actor_deleted_at timestamptz := null;
  actor_banned_until timestamptz := null;
begin
  if target_actor_id is null then
    raise exception '로그인 후 다시 시도해 주세요.';
  end if;

  begin
    select u.deleted_at, u.banned_until
    into actor_deleted_at, actor_banned_until
    from auth.users u
    where u.id = target_actor_id;

    if actor_deleted_at is not null then
      raise exception '현재 계정 상태로는 커뮤니티 작업을 할 수 없어요. 운영팀에 문의해 주세요.';
    end if;

    if actor_banned_until is not null and actor_banned_until > timezone('utc', now()) then
      raise exception '현재 계정 상태로는 커뮤니티 작업을 할 수 없어요. 운영팀에 문의해 주세요.';
    end if;
  exception
    when undefined_column then
      return;
  end;
end;
$$;


ALTER FUNCTION "public"."assert_community_actor_id_is_active"("target_actor_id" "uuid") OWNER TO "postgres";

--
-- Name: assert_community_actor_is_active(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."assert_community_actor_is_active"() RETURNS "void"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
begin
  perform public.assert_community_actor_id_is_active(auth.uid());
end;
$$;


ALTER FUNCTION "public"."assert_community_actor_is_active"() OWNER TO "postgres";

--
-- Name: assert_community_content_policy("text", "text", "text"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."assert_community_content_policy"("p_target_type" "text", "p_title" "text" DEFAULT NULL::"text", "p_content" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  raw_title text := btrim(coalesce(p_title, ''));
  raw_content text := btrim(coalesce(p_content, ''));
  normalized_title text := public.community_normalize_text(p_title);
  normalized_content text := public.community_normalize_text(p_content);
  matched_term_id bigint := null;
  matched_pattern_id bigint := null;
  violation_message constant text := '운영 정책상 등록할 수 없는 표현이 포함되어 있어요. 표현을 조금만 수정해 다시 시도해 주세요.';
begin
  if p_target_type not in ('post', 'comment') then
    return;
  end if;

  if p_target_type = 'post' and raw_title <> '' then
    select t.id
    into matched_term_id
    from public.community_blocked_terms t
    where t.is_active = true
      and t.target_type in ('all', p_target_type)
      and t.target_field in ('all', 'title')
      and (
        (
          t.match_mode = 'exact'
          and (
            btrim(t.term) = raw_title
            or public.community_normalize_text(t.term) = normalized_title
          )
        )
        or (
          t.match_mode = 'contains'
          and (
            position(btrim(t.term) in raw_title) > 0
            or position(public.community_normalize_text(t.term) in normalized_title) > 0
          )
        )
      )
    order by
      case when t.target_type = 'all' then 1 else 0 end,
      case when t.target_field = 'all' then 1 else 0 end,
      t.id
    limit 1;

    if matched_term_id is not null then
      perform public.raise_community_write_error(
        'community_content_policy_violation',
        violation_message,
        p_target_type,
        'title',
        'term',
        '표현을 조금만 수정한 뒤 다시 시도해 주세요.'
      );
    end if;

    select p.id
    into matched_pattern_id
    from public.community_blocked_term_patterns p
    where p.is_active = true
      and p.target_type in ('all', p_target_type)
      and p.target_field in ('all', 'title')
      and (raw_title ~* p.pattern or normalized_title ~* p.pattern)
    order by
      case when p.target_type = 'all' then 1 else 0 end,
      case when p.target_field = 'all' then 1 else 0 end,
      p.id
    limit 1;

    if matched_pattern_id is not null then
      perform public.raise_community_write_error(
        'community_content_policy_violation',
        violation_message,
        p_target_type,
        'title',
        'pattern',
        '표현을 조금만 수정한 뒤 다시 시도해 주세요.'
      );
    end if;
  end if;

  if raw_content <> '' then
    select t.id
    into matched_term_id
    from public.community_blocked_terms t
    where t.is_active = true
      and t.target_type in ('all', p_target_type)
      and t.target_field in ('all', 'content')
      and (
        (
          t.match_mode = 'exact'
          and (
            btrim(t.term) = raw_content
            or public.community_normalize_text(t.term) = normalized_content
          )
        )
        or (
          t.match_mode = 'contains'
          and (
            position(btrim(t.term) in raw_content) > 0
            or position(public.community_normalize_text(t.term) in normalized_content) > 0
          )
        )
      )
    order by
      case when t.target_type = 'all' then 1 else 0 end,
      case when t.target_field = 'all' then 1 else 0 end,
      t.id
    limit 1;

    if matched_term_id is not null then
      perform public.raise_community_write_error(
        'community_content_policy_violation',
        violation_message,
        p_target_type,
        'content',
        'term',
        '표현을 조금만 수정한 뒤 다시 시도해 주세요.'
      );
    end if;

    select p.id
    into matched_pattern_id
    from public.community_blocked_term_patterns p
    where p.is_active = true
      and p.target_type in ('all', p_target_type)
      and p.target_field in ('all', 'content')
      and (raw_content ~* p.pattern or normalized_content ~* p.pattern)
    order by
      case when p.target_type = 'all' then 1 else 0 end,
      case when p.target_field = 'all' then 1 else 0 end,
      p.id
    limit 1;

    if matched_pattern_id is not null then
      perform public.raise_community_write_error(
        'community_content_policy_violation',
        violation_message,
        p_target_type,
        'content',
        'pattern',
        '표현을 조금만 수정한 뒤 다시 시도해 주세요.'
      );
    end if;
  end if;
end;
$$;


ALTER FUNCTION "public"."assert_community_content_policy"("p_target_type" "text", "p_title" "text", "p_content" "text") OWNER TO "postgres";

--
-- Name: build_account_deletion_response("uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."build_account_deletion_response"("p_request_id" "uuid") RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  select coalesce(
    (
      select jsonb_build_object(
        'request_id', r.id,
        'status', r.status,
        'storage_cleanup_pending', r.storage_cleanup_pending,
        'cleanup_item_count', r.cleanup_item_count,
        'cleanup_completed_count', r.cleanup_completed_count,
        'requested_at', r.requested_at,
        'completed_at', r.completed_at,
        'last_error_code', r.last_error_code,
        'last_error_message', r.last_error_message
      )
      from public.account_deletion_requests r
      where r.id = p_request_id
    ),
    '{}'::jsonb
  );
$$;


ALTER FUNCTION "public"."build_account_deletion_response"("p_request_id" "uuid") OWNER TO "postgres";

--
-- Name: bump_community_reporter_rate_limit("uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."bump_community_reporter_rate_limit"("target_reporter_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  -- 주의:
  -- - report insert trigger 안에서 이 함수를 호출하면 failed transaction과 함께 rollback된다.
  -- - 실제 rate-limit trace 영속화는 차단 응답 직후 follow-up RPC에서 이 함수를 다시 호출하는 경로를 기준으로 본다.
  if target_reporter_id is null then
    return;
  end if;

  insert into public.community_reporter_flags (
    reporter_id,
    flag_status,
    rate_limit_hit_count,
    last_reported_at,
    last_rate_limited_at
  )
  values (
    target_reporter_id,
    'watch',
    1,
    timezone('utc', now()),
    timezone('utc', now())
  )
  on conflict (reporter_id) do update
  set
    flag_status = 'watch',
    rate_limit_hit_count = public.community_reporter_flags.rate_limit_hit_count + 1,
    last_reported_at = timezone('utc', now()),
    last_rate_limited_at = timezone('utc', now()),
    updated_at = timezone('utc', now());
end;
$$;


ALTER FUNCTION "public"."bump_community_reporter_rate_limit"("target_reporter_id" "uuid") OWNER TO "postgres";

--
-- Name: bump_community_reporter_rejected_abuse("uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."bump_community_reporter_rejected_abuse"("target_reporter_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if target_reporter_id is null then
    return;
  end if;

  insert into public.community_reporter_flags (
    reporter_id,
    flag_status,
    rejected_abuse_count,
    last_reported_at,
    last_rejected_abuse_at
  )
  values (
    target_reporter_id,
    'watch',
    1,
    timezone('utc', now()),
    timezone('utc', now())
  )
  on conflict (reporter_id) do update
  set
    flag_status = 'watch',
    rejected_abuse_count = public.community_reporter_flags.rejected_abuse_count + 1,
    last_reported_at = timezone('utc', now()),
    last_rejected_abuse_at = timezone('utc', now()),
    updated_at = timezone('utc', now());
end;
$$;


ALTER FUNCTION "public"."bump_community_reporter_rejected_abuse"("target_reporter_id" "uuid") OWNER TO "postgres";

--
-- Name: can_insert_community_comment("uuid", "uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."can_insert_community_comment"("target_post_id" "uuid", "target_parent_comment_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if target_parent_comment_id is null then
    return exists (
      select 1
      from public.posts p
      where p.id = target_post_id
        and (
          public.is_community_admin()
          or p.user_id = auth.uid()
          or (
            p.visibility = 'public'
            and p.status = 'active'
            and p.deleted_at is null
          )
        )
    );
  end if;

  return exists (
    select 1
    from public.posts p
    join public.comments parent on parent.post_id = p.id
    where p.id = target_post_id
      and parent.id = target_parent_comment_id
      and parent.post_id = target_post_id
      and parent.parent_comment_id is null
      and parent.depth = 0
      and parent.deleted_at is null
      and parent.status = 'active'
      and (
        public.is_community_admin()
        or p.user_id = auth.uid()
        or (
          p.visibility = 'public'
          and p.status = 'active'
          and p.deleted_at is null
        )
      )
  );
end;
$$;


ALTER FUNCTION "public"."can_insert_community_comment"("target_post_id" "uuid", "target_parent_comment_id" "uuid") OWNER TO "postgres";

--
-- Name: cascade_comment_soft_delete(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."cascade_comment_soft_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if new.parent_comment_id is not null then
    return null;
  end if;

  if old.status = new.status and old.deleted_at is not distinct from new.deleted_at then
    return null;
  end if;

  if new.status = 'deleted' and new.deleted_at is not null then
    update public.comments
    set
      status = 'deleted',
      deleted_at = coalesce(deleted_at, new.deleted_at),
      updated_at = timezone('utc', now())
    where parent_comment_id = new.id
      and deleted_at is null
      and status <> 'deleted';
  elsif new.status in ('hidden', 'auto_hidden') then
    update public.comments
    set
      status = new.status,
      updated_at = timezone('utc', now())
    where parent_comment_id = new.id
      and deleted_at is null
      and status = 'active';
  elsif new.status = 'active' and new.deleted_at is null then
    update public.comments
    set
      status = 'active',
      updated_at = timezone('utc', now())
    where parent_comment_id = new.id
      and deleted_at is null
      and status in ('hidden', 'auto_hidden');
  end if;

  return null;
end;
$$;


ALTER FUNCTION "public"."cascade_comment_soft_delete"() OWNER TO "postgres";

--
-- Name: check_nickname_availability("text", "uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."check_nickname_availability"("p_nickname" "text", "p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS TABLE("available" boolean, "code" "text", "normalized" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
  declare
    raw_v text;
    v text;
  begin
    if p_user_id is null then
      return query select false, 'not_authenticated'::text, ''::text;
      return;
    end if;

    raw_v := btrim(coalesce(p_nickname, ''));
    v := public.normalize_nickname_for_policy(raw_v);

    if raw_v = '' then
      return query select false, 'empty'::text, ''::text; return;
    end if;

    if char_length(raw_v) < 2 then
      return query select false, 'too_short'::text, v; return;
    end if;

    if char_length(raw_v) > 8 then
      return query select false, 'too_long'::text, v; return;
    end if;

    if raw_v !~ '^[A-Za-z0-9가-힣ㄱ-ㅎㅏ-ㅣ]+$' then
      return query select false, 'invalid_chars'::text, v; return;
    end if;

    if exists (
      select 1
      from public.blocked_nicknames bn
      where bn.is_active = true
        and (
          (bn.match_mode = 'exact' and bn.term = raw_v::citext)
          or (bn.match_mode = 'contains' and position(bn.term::text in raw_v) > 0)
          or (bn.match_mode = 'contains' and position(bn.term::text in v) > 0)
        )
    ) then
      return query select false, 'blocked'::text, v; return;
    end if;

    if exists (
      select 1
      from public.blocked_nickname_patterns bp
      where bp.is_active = true
        and (raw_v ~* bp.pattern or v ~* bp.pattern)
    ) then
      return query select false, 'blocked'::text, v; return;
    end if;

    if exists (
      select 1
      from public.profiles p
      where p.nickname = raw_v::citext
        and p.user_id <> p_user_id
    ) then
      return query select false, 'taken'::text, v; return;
    end if;

    return query select true, 'ok'::text, v;
  end;
  $_$;


ALTER FUNCTION "public"."check_nickname_availability"("p_nickname" "text", "p_user_id" "uuid") OWNER TO "postgres";

--
-- Name: claim_account_deletion_cleanup_items(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."claim_account_deletion_cleanup_items"("p_limit" integer DEFAULT 20) RETURNS TABLE("cleanup_item_id" "uuid", "request_id" "uuid", "bucket_name" "text", "storage_path" "text", "attempts" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_limit integer := greatest(coalesce(p_limit, 20), 1);
  v_now timestamptz := timezone('utc', now());
begin
  return query
  with picked as (
    select item.id
    from public.account_deletion_cleanup_items item
    where item.status in ('pending', 'failed')
    order by
      case when item.status = 'pending' then 0 else 1 end,
      item.created_at asc,
      item.id asc
    limit v_limit
    for update skip locked
  ),
  updated_items as (
    update public.account_deletion_cleanup_items item
    set status = 'processing',
        attempts = item.attempts + 1,
        processing_started_at = v_now,
        last_attempted_at = v_now,
        last_error_code = null,
        last_error_message = null
    from picked
    where item.id = picked.id
    returning item.id, item.request_id, item.bucket_name, item.storage_path, item.attempts
  ),
  touched_requests as (
    update public.account_deletion_requests req
    set cleanup_started_at = coalesce(req.cleanup_started_at, v_now),
        status = case
          when req.status = 'completed_with_cleanup_pending'
            then 'cleanup_pending'
          else req.status
        end,
        last_status_changed_at = case
          when req.status = 'completed_with_cleanup_pending'
            then v_now
          else req.last_status_changed_at
        end
    where req.id in (select request_id from updated_items)
    returning req.id
  )
  select
    updated_items.id,
    updated_items.request_id,
    updated_items.bucket_name,
    updated_items.storage_path,
    updated_items.attempts
  from updated_items;
end;
$$;


ALTER FUNCTION "public"."claim_account_deletion_cleanup_items"("p_limit" integer) OWNER TO "postgres";

--
-- Name: community_normalize_text("text"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."community_normalize_text"("input_text" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select regexp_replace(lower(btrim(coalesce(input_text, ''))), '\s+', ' ', 'g');
$$;


ALTER FUNCTION "public"."community_normalize_text"("input_text" "text") OWNER TO "postgres";

--
-- Name: community_post_view_window_start(timestamp with time zone); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."community_post_view_window_start"("p_recorded_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())) RETURNS timestamp with time zone
    LANGUAGE "sql" STABLE
    AS $$
  select date_bin(
    interval '6 hours',
    coalesce(p_recorded_at, timezone('utc', now())),
    timestamptz '2000-01-01 00:00:00+00'
  );
$$;


ALTER FUNCTION "public"."community_post_view_window_start"("p_recorded_at" timestamp with time zone) OWNER TO "postgres";

--
-- Name: complete_account_deletion_cleanup_item("uuid", boolean, "text", "text"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."complete_account_deletion_cleanup_item"("p_cleanup_item_id" "uuid", "p_success" boolean, "p_error_code" "text" DEFAULT NULL::"text", "p_error_message" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_request_id uuid;
  v_now timestamptz := timezone('utc', now());
begin
  update public.account_deletion_cleanup_items
  set status = case when p_success then 'completed' else 'failed' end,
      cleanup_completed_at = case when p_success then v_now else cleanup_completed_at end,
      processing_started_at = null,
      last_attempted_at = v_now,
      last_error_code = case
        when p_success then null
        else nullif(btrim(coalesce(p_error_code, '')), '')
      end,
      last_error_message = case
        when p_success then null
        else nullif(btrim(coalesce(p_error_message, '')), '')
      end
  where id = p_cleanup_item_id
  returning request_id
    into v_request_id;

  if v_request_id is null then
    raise exception 'account_deletion_cleanup_item_not_found';
  end if;

  perform public.sync_account_deletion_cleanup_summary(v_request_id);
  return public.build_account_deletion_response(v_request_id);
end;
$$;


ALTER FUNCTION "public"."complete_account_deletion_cleanup_item"("p_cleanup_item_id" "uuid", "p_success" boolean, "p_error_code" "text", "p_error_message" "text") OWNER TO "postgres";

--
-- Name: create_account_deletion_request("text", "text"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."create_account_deletion_request"("p_idempotency_key" "text" DEFAULT NULL::"text", "p_request_origin" "text" DEFAULT 'app'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id uuid := auth.uid();
  v_request public.account_deletion_requests%rowtype;
  v_idempotency_key text := nullif(btrim(coalesce(p_idempotency_key, '')), '');
  v_request_origin text := btrim(coalesce(p_request_origin, 'app'));
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if v_request_origin = '' then
    v_request_origin := 'app';
  end if;

  if v_idempotency_key is not null then
    select *
      into v_request
    from public.account_deletion_requests
    where user_id = v_user_id
      and idempotency_key = v_idempotency_key
    order by requested_at desc
    limit 1;

    if found then
      return public.build_account_deletion_response(v_request.id);
    end if;
  end if;

  select *
    into v_request
  from public.account_deletion_requests
  where user_id = v_user_id
    and status in (
      'requested',
      'in_progress',
      'db_deleted',
      'cleanup_pending',
      'completed_with_cleanup_pending',
      'unknown_pending_confirmation'
    )
  order by requested_at desc
  limit 1;

  if found then
    return public.build_account_deletion_response(v_request.id);
  end if;

  insert into public.account_deletion_requests (
    user_id,
    request_origin,
    idempotency_key,
    status
  )
  values (
    v_user_id,
    v_request_origin,
    v_idempotency_key,
    'requested'
  )
  returning *
    into v_request;

  return public.build_account_deletion_response(v_request.id);
end;
$$;


ALTER FUNCTION "public"."create_account_deletion_request"("p_idempotency_key" "text", "p_request_origin" "text") OWNER TO "postgres";

--
-- Name: current_user_id(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."current_user_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE
    AS $$
  select auth.uid();
$$;


ALTER FUNCTION "public"."current_user_id"() OWNER TO "postgres";

--
-- Name: delete_my_account(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."delete_my_account"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  delete from public.user_consent_history where user_id = v_user_id;
  delete from public.memories where pet_id in (select id from public.pets where user_id = v_user_id);
  delete from public.pet_schedules where user_id = v_user_id;
  delete from public.pets where user_id = v_user_id;
  delete from public.profiles where user_id = v_user_id;

  delete from auth.users where id = v_user_id;
end;
$$;


ALTER FUNCTION "public"."delete_my_account"() OWNER TO "postgres";

--
-- Name: delete_my_account("uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."delete_my_account"("p_request_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
declare
  v_user_id uuid := auth.uid();
  v_request public.account_deletion_requests%rowtype;
  v_now timestamptz := timezone('utc', now());
  v_retained_subject_id uuid := gen_random_uuid();
  v_error_code text;
  v_error_message text;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if p_request_id is null then
    select *
      into v_request
    from public.account_deletion_requests
    where user_id = v_user_id
      and status in (
        'requested',
        'in_progress',
        'db_deleted',
        'cleanup_pending',
        'completed_with_cleanup_pending',
        'unknown_pending_confirmation'
      )
    order by requested_at desc
    limit 1;

    if not found then
      insert into public.account_deletion_requests (
        user_id,
        request_origin,
        status
      )
      values (
        v_user_id,
        'app',
        'requested'
      )
      returning *
        into v_request;
    end if;
  else
    select *
      into v_request
    from public.account_deletion_requests
    where id = p_request_id
      and user_id = v_user_id
    limit 1;

    if not found then
      raise exception 'account_deletion_request_not_found';
    end if;
  end if;

  if v_request.status in ('completed', 'completed_with_cleanup_pending') then
    return public.build_account_deletion_response(v_request.id);
  end if;

  update public.account_deletion_requests
  set status = 'in_progress',
      started_at = coalesce(started_at, v_now),
      last_status_changed_at = v_now,
      last_error_code = null,
      last_error_message = null
  where id = v_request.id;

  if public.account_deletion_table_exists('public', 'pets')
    and public.account_deletion_column_exists('public', 'pets', 'profile_image_url') then
    execute $sql$
      insert into public.account_deletion_cleanup_items (request_id, bucket_name, storage_path)
      select $1, 'pet-profiles', btrim(profile_image_url)
      from public.pets
      where user_id = $2
        and profile_image_url is not null
        and btrim(profile_image_url) <> ''
      on conflict (request_id, bucket_name, storage_path) do nothing
    $sql$
    using v_request.id, v_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'memories')
    and public.account_deletion_column_exists('public', 'memories', 'image_url') then
    execute $sql$
      insert into public.account_deletion_cleanup_items (request_id, bucket_name, storage_path)
      select $1, 'memory-images', btrim(image_url)
      from public.memories
      where user_id = $2
        and image_url is not null
        and btrim(image_url) <> ''
      on conflict (request_id, bucket_name, storage_path) do nothing
    $sql$
    using v_request.id, v_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'memories')
    and public.account_deletion_column_exists('public', 'memories', 'image_urls') then
    execute $sql$
      insert into public.account_deletion_cleanup_items (request_id, bucket_name, storage_path)
      select distinct $1, 'memory-images', btrim(path_value)
      from public.memories m
      cross join lateral unnest(coalesce(m.image_urls, '{}'::text[])) as path_value
      where m.user_id = $2
        and btrim(path_value) <> ''
      on conflict (request_id, bucket_name, storage_path) do nothing
    $sql$
    using v_request.id, v_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'memory_images') then
    execute $sql$
      insert into public.account_deletion_cleanup_items (request_id, bucket_name, storage_path)
      select $1, 'memory-images', btrim(original_path)
      from public.memory_images
      where user_id = $2
        and btrim(original_path) <> ''
      on conflict (request_id, bucket_name, storage_path) do nothing
    $sql$
    using v_request.id, v_user_id;

    execute $sql$
      insert into public.account_deletion_cleanup_items (request_id, bucket_name, storage_path)
      select $1, 'memory-images', btrim(timeline_thumb_path)
      from public.memory_images
      where user_id = $2
        and timeline_thumb_path is not null
        and btrim(timeline_thumb_path) <> ''
      on conflict (request_id, bucket_name, storage_path) do nothing
    $sql$
    using v_request.id, v_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'posts')
    and public.account_deletion_column_exists('public', 'posts', 'image_url') then
    execute $sql$
      insert into public.account_deletion_cleanup_items (request_id, bucket_name, storage_path)
      select $1, 'community-images', btrim(image_url)
      from public.posts
      where user_id = $2
        and image_url is not null
        and btrim(image_url) <> ''
      on conflict (request_id, bucket_name, storage_path) do nothing
    $sql$
    using v_request.id, v_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'posts')
    and public.account_deletion_column_exists('public', 'posts', 'image_urls') then
    execute $sql$
      insert into public.account_deletion_cleanup_items (request_id, bucket_name, storage_path)
      select distinct $1, 'community-images', btrim(path_value)
      from public.posts p
      cross join lateral unnest(coalesce(p.image_urls, '{}'::text[])) as path_value
      where p.user_id = $2
        and btrim(path_value) <> ''
      on conflict (request_id, bucket_name, storage_path) do nothing
    $sql$
    using v_request.id, v_user_id;
  end if;

  perform public.sync_account_deletion_cleanup_summary(v_request.id);

  if public.account_deletion_table_exists('public', 'user_consent_history') then
    update public.user_consent_history
    set user_id = null,
        anonymized_subject_id = coalesce(anonymized_subject_id, v_retained_subject_id),
        anonymized_at = coalesce(anonymized_at, v_now),
        source = 'account_deletion_retained',
        retention_note = coalesce(
          retention_note,
          'account deletion retained record'
        )
    where user_id = v_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'reports') then
    update public.reports
    set reporter_id = null
    where reporter_id = v_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'pet_place_user_reports') then
    update public.pet_place_user_reports
    set user_id = null
    where user_id = v_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'pet_travel_user_reports') then
    update public.pet_travel_user_reports
    set user_id = null
    where user_id = v_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'pet_care_guide_events') then
    update public.pet_care_guide_events
    set user_id = null
    where user_id = v_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'audit_logs') then
    update public.audit_logs
    set user_id = null
    where user_id = v_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'pet_place_search_logs') then
    update public.pet_place_search_logs
    set user_id = null,
        session_id = gen_random_uuid()
    where user_id = v_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'pet_place_verification_logs') then
    update public.pet_place_verification_logs
    set actor_user_id = null
    where actor_user_id = v_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'pet_place_bookmarks') then
    delete from public.pet_place_bookmarks
    where user_id = v_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'comment_likes') then
    delete from public.comment_likes
    where user_id = v_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'likes') then
    delete from public.likes
    where user_id = v_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'comments') then
    delete from public.comments
    where user_id = v_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'posts') then
    delete from public.posts
    where user_id = v_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'letters') then
    delete from public.letters
    where user_id = v_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'emotions') then
    delete from public.emotions
    where user_id = v_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'daily_recall') then
    delete from public.daily_recall
    where user_id = v_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'ai_messages') then
    delete from public.ai_messages
    where user_id = v_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'anniversaries') then
    delete from public.anniversaries
    where user_id = v_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'notifications') then
    delete from public.notifications
    where user_id = v_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'billing_events') then
    delete from public.billing_events
    where user_id = v_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'subscriptions') then
    delete from public.subscriptions
    where user_id = v_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'pet_schedules') then
    delete from public.pet_schedules
    where user_id = v_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'memory_images') then
    delete from public.memory_images
    where user_id = v_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'memories') then
    delete from public.memories
    where user_id = v_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'pets') then
    delete from public.pets
    where user_id = v_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'profiles') then
    delete from public.profiles
    where user_id = v_user_id;
  end if;

  update public.account_deletion_requests
  set status = 'db_deleted',
      db_deleted_at = v_now,
      last_status_changed_at = v_now
  where id = v_request.id;

  perform public.sync_account_deletion_cleanup_summary(v_request.id);

  update public.account_deletion_requests
  set status = case
        when cleanup_item_count > cleanup_completed_count
          then 'completed_with_cleanup_pending'
        else 'completed'
      end,
      storage_cleanup_pending = (cleanup_item_count > cleanup_completed_count),
      completed_at = coalesce(completed_at, v_now),
      cleanup_completed_at = case
        when cleanup_item_count = cleanup_completed_count
          then coalesce(cleanup_completed_at, v_now)
        else cleanup_completed_at
      end,
      last_status_changed_at = v_now
  where id = v_request.id;

  delete from auth.users
  where id = v_user_id;

  return public.build_account_deletion_response(v_request.id);
exception
  when others then
    get stacked diagnostics
      v_error_code = returned_sqlstate,
      v_error_message = message_text;

    if v_request.id is not null then
      update public.account_deletion_requests
      set status = 'failed',
          last_error_code = nullif(btrim(coalesce(v_error_code, '')), ''),
          last_error_message = nullif(btrim(coalesce(v_error_message, '')), ''),
          last_status_changed_at = timezone('utc', now())
      where id = v_request.id;

      return public.build_account_deletion_response(v_request.id);
    end if;

    raise;
end;
$_$;


ALTER FUNCTION "public"."delete_my_account"("p_request_id" "uuid") OWNER TO "postgres";

--
-- Name: enforce_comment_thread_integrity(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."enforce_comment_thread_integrity"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  parent_comment_record public.comments%rowtype;
begin
  if new.parent_comment_id is null then
    new.depth := 0;
    return new;
  end if;

  select *
  into parent_comment_record
  from public.comments
  where id = new.parent_comment_id;

  if not found then
    raise exception 'parent comment not found';
  end if;

  if parent_comment_record.post_id <> new.post_id then
    raise exception 'reply must reference a comment in the same post';
  end if;

  if parent_comment_record.parent_comment_id is not null or parent_comment_record.depth <> 0 then
    raise exception 'reply depth exceeds supported range';
  end if;

  if parent_comment_record.deleted_at is not null or parent_comment_record.status <> 'active' then
    raise exception 'cannot reply to inactive parent comment';
  end if;

  new.depth := 1;
  return new;
end;
$$;


ALTER FUNCTION "public"."enforce_comment_thread_integrity"() OWNER TO "postgres";

--
-- Name: enforce_profile_nickname_policy(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."enforce_profile_nickname_policy"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
  declare
    raw_v text;
    v text;
  begin
    raw_v := btrim(new.nickname::text);
    v := public.normalize_nickname_for_policy(raw_v);

    if raw_v is null or raw_v = '' then
      raise exception using errcode = '22023', message = 'nickname_empty';
    end if;

    if char_length(raw_v) < 2 then
      raise exception using errcode = '22023', message = 'nickname_too_short';
    end if;

    if char_length(raw_v) > 8 then
      raise exception using errcode = '22023', message = 'nickname_too_long';
    end if;

    if raw_v !~ '^[A-Za-z0-9가-힣ㄱ-ㅎㅏ-ㅣ]+$' then
      raise exception using errcode = '22023', message = 'nickname_invalid_chars';
    end if;

    if exists (
      select 1
      from public.blocked_nicknames bn
      where bn.is_active = true
        and (
          (bn.match_mode = 'exact' and bn.term = raw_v::citext)
          or (bn.match_mode = 'contains' and position(bn.term::text in raw_v) > 0)
          or (bn.match_mode = 'contains' and position(bn.term::text in v) > 0)
        )
    ) then
      raise exception using errcode = '22023', message = 'nickname_blocked';
    end if;

    if exists (
      select 1
      from public.blocked_nickname_patterns bp
      where bp.is_active = true
        and (raw_v ~* bp.pattern or v ~* bp.pattern)
    ) then
      raise exception using errcode = '22023', message = 'nickname_blocked';
    end if;

    new.nickname := raw_v::citext;
    return new;
  end;
  $_$;


ALTER FUNCTION "public"."enforce_profile_nickname_policy"() OWNER TO "postgres";

--
-- Name: enqueue_account_deletion_cleanup_item("uuid", "text", "text"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."enqueue_account_deletion_cleanup_item"("p_request_id" "uuid", "p_bucket_name" "text", "p_storage_path" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_bucket_name text := btrim(coalesce(p_bucket_name, ''));
  v_storage_path text := btrim(coalesce(p_storage_path, ''));
begin
  if p_request_id is null or v_bucket_name = '' or v_storage_path = '' then
    return;
  end if;

  insert into public.account_deletion_cleanup_items (
    request_id,
    bucket_name,
    storage_path
  )
  values (
    p_request_id,
    v_bucket_name,
    v_storage_path
  )
  on conflict (request_id, bucket_name, storage_path) do nothing;
end;
$$;


ALTER FUNCTION "public"."enqueue_account_deletion_cleanup_item"("p_request_id" "uuid", "p_bucket_name" "text", "p_storage_path" "text") OWNER TO "postgres";

--
-- Name: get_pet_care_guide_popular_searches("public"."pet_species_group", integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."get_pet_care_guide_popular_searches"("p_species_group" "public"."pet_species_group" DEFAULT NULL::"public"."pet_species_group", "p_limit" integer DEFAULT 8) RETURNS TABLE("keyword" "text", "search_count" bigint, "source" "text")
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  with normalized as (
    select greatest(1, least(coalesce(p_limit, 8), 20)) as limit_count
  ),
  event_keywords as (
    select
      lower(regexp_replace(btrim(e.search_query), '\s+', ' ', 'g')) as keyword,
      count(*)::bigint as search_count,
      'event'::text as source,
      1 as source_priority
    from public.pet_care_guide_events e
    where e.search_query is not null
      and char_length(btrim(e.search_query)) between 2 and 32
      and e.occurred_at >= timezone('utc', now()) - interval '60 days'
      and (
        p_species_group is null
        or e.context_species_group = p_species_group
        or e.context_species_group is null
      )
    group by 1
  ),
  catalog_keywords as (
    select
      lower(keyword) as keyword,
      sum(weight)::bigint as search_count,
      'catalog'::text as source,
      2 as source_priority
    from (
      select
        unnest(coalesce(g.search_keywords, '{}'::text[])) as keyword,
        greatest(1, coalesce(g.priority, 0) + 4) as weight
      from public.pet_care_guides g
      where g.deleted_at is null
        and g.is_active = true
        and g.status = 'published'
        and (g.published_at is null or g.published_at <= timezone('utc', now()))
        and (
          p_species_group is null
          or g.target_species @> array[p_species_group::text]
          or g.target_species @> array['common']::text[]
        )

      union all

      select
        unnest(coalesce(g.tags, '{}'::text[])) as keyword,
        greatest(1, coalesce(g.priority, 0) + 2) as weight
      from public.pet_care_guides g
      where g.deleted_at is null
        and g.is_active = true
        and g.status = 'published'
        and (g.published_at is null or g.published_at <= timezone('utc', now()))
        and (
          p_species_group is null
          or g.target_species @> array[p_species_group::text]
          or g.target_species @> array['common']::text[]
        )
    ) seed
    where char_length(btrim(keyword)) between 2 and 32
    group by 1
  ),
  combined as (
    select * from event_keywords
    union all
    select * from catalog_keywords
  ),
  deduped as (
    select
      c.keyword,
      c.search_count,
      c.source,
      row_number() over (
        partition by c.keyword
        order by c.source_priority asc, c.search_count desc, c.keyword asc
      ) as dedupe_rank
    from combined c
  )
  select
    d.keyword,
    d.search_count,
    d.source
  from deduped d
  where d.dedupe_rank = 1
  order by d.search_count desc, d.keyword asc
  limit (select limit_count from normalized);
$$;


ALTER FUNCTION "public"."get_pet_care_guide_popular_searches"("p_species_group" "public"."pet_species_group", "p_limit" integer) OWNER TO "postgres";

--
-- Name: guard_community_comment_insert(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."guard_community_comment_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  actor_id uuid := auth.uid();
  recent_1m_count integer := 0;
  recent_10m_count integer := 0;
  payload_hash text := '';
begin
  new.content := btrim(new.content);
  new.status := coalesce(nullif(btrim(coalesce(new.status, '')), ''), 'active');

  perform public.assert_community_actor_is_active();

  if actor_id is null or new.user_id is distinct from actor_id then
    perform public.raise_community_write_error(
      'community_comment_write_forbidden',
      '본인 계정으로만 댓글을 작성할 수 있어요.',
      'comment'
    );
  end if;

  payload_hash := md5(public.community_normalize_text(new.content));

  select count(*)
  into recent_1m_count
  from public.comments c
  where c.user_id = actor_id
    and c.created_at >= timezone('utc', now()) - interval '1 minute';

  select count(*)
  into recent_10m_count
  from public.comments c
  where c.user_id = actor_id
    and c.created_at >= timezone('utc', now()) - interval '10 minutes';

  if recent_1m_count >= 5 or recent_10m_count >= 20 then
    perform public.raise_community_write_error(
      'community_comment_rate_limited',
      '댓글은 1분에 5개, 10분에 20개까지 작성할 수 있어요. 잠시 후 다시 시도해 주세요.',
      'comment'
    );
  end if;

  if exists (
    select 1
    from public.comments c
    where c.user_id = actor_id
      and c.post_id = new.post_id
      and c.created_at >= timezone('utc', now()) - interval '30 seconds'
      and md5(public.community_normalize_text(c.content)) = payload_hash
  ) then
    perform public.raise_community_write_error(
      'community_comment_duplicate_recent',
      '같은 게시글에는 같은 댓글을 30초 안에 다시 등록할 수 없어요.',
      'comment'
    );
  end if;

  perform public.assert_community_content_policy('comment', null, new.content);
  return new;
end;
$$;


ALTER FUNCTION "public"."guard_community_comment_insert"() OWNER TO "postgres";

--
-- Name: guard_community_comment_update(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."guard_community_comment_update"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  actor_id uuid := auth.uid();
begin
  new.content := btrim(new.content);

  if new.content is not distinct from old.content then
    return new;
  end if;

  perform public.assert_community_actor_is_active();

  if not public.is_community_admin()
     and (actor_id is null or old.user_id is distinct from actor_id) then
    perform public.raise_community_write_error(
      'community_comment_write_forbidden',
      '본인 계정으로만 댓글을 수정할 수 있어요.',
      'comment'
    );
  end if;

  perform public.assert_community_content_policy('comment', null, new.content);
  return new;
end;
$$;


ALTER FUNCTION "public"."guard_community_comment_update"() OWNER TO "postgres";

--
-- Name: guard_community_image_upload(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."guard_community_image_upload"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'storage'
    AS $$
declare
  actor_id uuid := auth.uid();
  owner_id_candidate text := nullif(btrim(coalesce(new.owner_id, '')), '');
  path_segments text[];
  target_post_id uuid := null;
  recent_upload_count integer := 0;
  current_post_upload_count integer := 0;
begin
  if new.bucket_id <> 'community-images' then
    return new;
  end if;

  if actor_id is null and owner_id_candidate is not null then
    begin
      actor_id := owner_id_candidate::uuid;
    exception
      when invalid_text_representation then
        actor_id := null;
    end;
  end if;

  actor_id := coalesce(actor_id, new.owner);

  perform public.assert_community_actor_id_is_active(actor_id);

  path_segments := storage.foldername(new.name);
  if coalesce(array_length(path_segments, 1), 0) < 2 then
    raise exception '커뮤니티 이미지 경로가 올바르지 않아요.';
  end if;

  if actor_id is null or path_segments[1] <> actor_id::text then
    raise exception '본인 경로에만 이미지를 업로드할 수 있어요.';
  end if;

  begin
    target_post_id := path_segments[2]::uuid;
  exception
    when invalid_text_representation then
      raise exception '커뮤니티 이미지 경로가 올바르지 않아요.';
  end;

  perform 1
  from public.posts p
  where p.id = target_post_id
    and p.user_id = actor_id
    and p.deleted_at is null
    and p.status = 'active';

  if not found then
    raise exception '이미지 업로드 대상 게시글을 확인할 수 없어요.';
  end if;

  select count(*)
  into recent_upload_count
  from public.community_image_assets a
  where a.user_id = actor_id
    and a.created_at >= timezone('utc', now()) - interval '10 minutes';

  if recent_upload_count >= 10 then
    raise exception '이미지 업로드는 10분에 10장까지 가능해요. 잠시 후 다시 시도해 주세요.';
  end if;

  select count(*)
  into current_post_upload_count
  from public.community_image_assets a
  where a.post_id = target_post_id
    and a.upload_status in ('uploaded', 'attached');

  if current_post_upload_count >= 3 then
    raise exception '게시글당 이미지는 최대 3장까지 첨부할 수 있어요.';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."guard_community_image_upload"() OWNER TO "postgres";

--
-- Name: guard_community_post_insert(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."guard_community_post_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  actor_id uuid := auth.uid();
  recent_5m_count integer := 0;
  recent_1h_count integer := 0;
  payload_hash text := '';
begin
  new.title := btrim(new.title);
  new.content := btrim(new.content);
  new.status := coalesce(nullif(btrim(coalesce(new.status, '')), ''), 'active');
  new.visibility := coalesce(new.visibility, 'public');

  perform public.assert_community_actor_is_active();

  if actor_id is null or new.user_id is distinct from actor_id then
    perform public.raise_community_write_error(
      'community_post_write_forbidden',
      '본인 계정으로만 게시글을 작성할 수 있어요.',
      'post'
    );
  end if;

  payload_hash := md5(
    public.community_normalize_text(new.title) || '|' || public.community_normalize_text(new.content)
  );

  select count(*)
  into recent_5m_count
  from public.posts p
  where p.user_id = actor_id
    and p.created_at >= timezone('utc', now()) - interval '5 minutes';

  select count(*)
  into recent_1h_count
  from public.posts p
  where p.user_id = actor_id
    and p.created_at >= timezone('utc', now()) - interval '1 hour';

  if recent_5m_count >= 3 or recent_1h_count >= 10 then
    perform public.raise_community_write_error(
      'community_post_rate_limited',
      '게시글은 5분에 3개, 1시간에 10개까지 작성할 수 있어요. 잠시 후 다시 시도해 주세요.',
      'post'
    );
  end if;

  if exists (
    select 1
    from public.posts p
    where p.user_id = actor_id
      and p.created_at >= timezone('utc', now()) - interval '30 seconds'
      and md5(
        public.community_normalize_text(p.title) || '|' || public.community_normalize_text(p.content)
      ) = payload_hash
  ) then
    perform public.raise_community_write_error(
      'community_post_duplicate_recent',
      '같은 제목과 본문은 30초 안에 다시 등록할 수 없어요.',
      'post'
    );
  end if;

  perform public.assert_community_content_policy('post', new.title, new.content);
  return new;
end;
$$;


ALTER FUNCTION "public"."guard_community_post_insert"() OWNER TO "postgres";

--
-- Name: guard_community_post_update(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."guard_community_post_update"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  actor_id uuid := auth.uid();
begin
  new.title := btrim(new.title);
  new.content := btrim(new.content);

  if new.title is not distinct from old.title
     and new.content is not distinct from old.content then
    return new;
  end if;

  perform public.assert_community_actor_is_active();

  if not public.is_community_admin()
     and (actor_id is null or old.user_id is distinct from actor_id) then
    perform public.raise_community_write_error(
      'community_post_write_forbidden',
      '본인 계정으로만 게시글을 수정할 수 있어요.',
      'post'
    );
  end if;

  perform public.assert_community_content_policy('post', new.title, new.content);
  return new;
end;
$$;


ALTER FUNCTION "public"."guard_community_post_update"() OWNER TO "postgres";

--
-- Name: guard_community_report_insert(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."guard_community_report_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  actor_id uuid := auth.uid();
  recent_10m_count integer := 0;
  recent_1d_count integer := 0;
  target_owner_id uuid := null;
  target_status text := null;
  target_deleted_at timestamptz := null;
begin
  perform public.assert_community_actor_is_active();

  if actor_id is null or new.reporter_id is distinct from actor_id then
    raise exception '본인 계정으로만 신고할 수 있어요.';
  end if;

  if new.target_type = 'post' then
    select p.user_id, p.status, p.deleted_at
    into target_owner_id, target_status, target_deleted_at
    from public.posts p
    where p.id = new.target_id;
  elsif new.target_type = 'comment' then
    select c.user_id, c.status, c.deleted_at
    into target_owner_id, target_status, target_deleted_at
    from public.comments c
    where c.id = new.target_id;
  else
    raise exception '지원하지 않는 신고 대상입니다.';
  end if;

  if target_owner_id is null then
    raise exception '신고 대상이 이미 삭제되었거나 존재하지 않아요.';
  end if;

  if target_owner_id = actor_id then
    raise exception '본인이 작성한 글이나 댓글은 신고할 수 없어요.';
  end if;

  if target_deleted_at is not null or target_status <> 'active' then
    raise exception '신고 대상이 이미 삭제되었거나 존재하지 않아요.';
  end if;

  if exists (
    select 1
    from public.reports r
    where r.reporter_id = actor_id
      and r.target_type = new.target_type
      and r.target_id = new.target_id
  ) then
    return new;
  end if;

  select count(*)
  into recent_10m_count
  from public.reports r
  where r.reporter_id = actor_id
    and r.created_at >= timezone('utc', now()) - interval '10 minutes';

  select count(*)
  into recent_1d_count
  from public.reports r
  where r.reporter_id = actor_id
    and r.created_at >= timezone('utc', now()) - interval '1 day';

  if recent_10m_count >= 5 or recent_1d_count >= 20 then
    raise exception '신고는 10분에 5건, 하루에 20건까지 접수할 수 있어요. 잠시 후 다시 시도해 주세요.';
  end if;

  new.status := coalesce(nullif(btrim(coalesce(new.status, '')), ''), 'open');
  new.reason := btrim(coalesce(new.reason, ''));
  return new;
end;
$$;


ALTER FUNCTION "public"."guard_community_report_insert"() OWNER TO "postgres";

--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  raw_email text;
  seed text;
  base text;
  candidate text;
  i int;
begin
  raw_email := new.email;

  seed := coalesce(
    new.raw_user_meta_data->>'nickname',
    split_part(coalesce(raw_email, 'nuriuser'), '@', 1),
    'nuriuser'
  );

  base := regexp_replace(seed, '[^A-Za-z0-9가-힣ㄱ-ㅎㅏ-ㅣ]', '', 'g');
  base := btrim(base);
  if base = '' then base := 'nuri'; end if;
  if char_length(base) = 1 then base := base || '1'; end if;
  base := left(base, 8);

  candidate := base;
  for i in 0..20 loop
    begin
      insert into public.profiles (
        user_id,
        email,
        nickname,
        nickname_confirmed,
        avatar_url
      )
      values (
        new.id,
        raw_email,
        candidate::citext,
        false,
        new.raw_user_meta_data->>'avatar_url'
      )
      on conflict (user_id) do nothing;
      return new;
    exception
      when unique_violation then
        candidate := left(base, 6) || lpad((i % 100)::text, 2, '0');
    end;
  end loop;

  candidate := 'u' || substr(replace(new.id::text, '-', ''), 1, 7);
  insert into public.profiles (
    user_id,
    email,
    nickname,
    nickname_confirmed,
    avatar_url
  )
  values (
    new.id,
    raw_email,
    candidate::citext,
    false,
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";

--
-- Name: is_active_community_report_status("text"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."is_active_community_report_status"("target_status" "text") RETURNS boolean
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select coalesce(target_status, 'open') in ('open', 'triaged', 'reviewing');
$$;


ALTER FUNCTION "public"."is_active_community_report_status"("target_status" "text") OWNER TO "postgres";

--
-- Name: is_community_admin(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."is_community_admin"() RETURNS boolean
    LANGUAGE "plpgsql" STABLE
    AS $$
declare
  is_admin boolean := false;
begin
  begin
    select exists (
      select 1
      from public.profiles
      where user_id = auth.uid()
        and role in ('admin', 'super_admin')
    )
    into is_admin;
  exception
    when undefined_column then
      return false;
  end;

  return coalesce(is_admin, false);
end;
$$;


ALTER FUNCTION "public"."is_community_admin"() OWNER TO "postgres";

--
-- Name: is_guide_admin(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."is_guide_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.role in ('admin', 'super_admin')
  );
$$;


ALTER FUNCTION "public"."is_guide_admin"() OWNER TO "postgres";

--
-- Name: is_pet_place_admin(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."is_pet_place_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.role in ('admin', 'super_admin')
  );
$$;


ALTER FUNCTION "public"."is_pet_place_admin"() OWNER TO "postgres";

--
-- Name: is_pet_travel_admin(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."is_pet_travel_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.role in ('admin', 'super_admin')
  );
$$;


ALTER FUNCTION "public"."is_pet_travel_admin"() OWNER TO "postgres";

--
-- Name: mark_account_deletion_unknown("uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."mark_account_deletion_unknown"("p_request_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id uuid := auth.uid();
  v_request public.account_deletion_requests%rowtype;
  v_now timestamptz := timezone('utc', now());
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  select *
    into v_request
  from public.account_deletion_requests
  where id = p_request_id
    and user_id = v_user_id
  limit 1;

  if not found then
    raise exception 'account_deletion_request_not_found';
  end if;

  if v_request.status in ('completed', 'completed_with_cleanup_pending') then
    return public.build_account_deletion_response(v_request.id);
  end if;

  update public.account_deletion_requests
  set status = 'unknown_pending_confirmation',
      last_status_changed_at = v_now
  where id = v_request.id;

  return public.build_account_deletion_response(v_request.id);
end;
$$;


ALTER FUNCTION "public"."mark_account_deletion_unknown"("p_request_id" "uuid") OWNER TO "postgres";

--
-- Name: normalize_nickname_for_policy("text"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."normalize_nickname_for_policy"("p_input" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $_$
  declare
    v text;
  begin
    v := lower(coalesce(p_input, ''));
    v := btrim(v);

    -- 공백/구분자 제거
    v := regexp_replace(v, '[[:space:][:punct:]_·ㆍ•…]+', '', 'g');

    -- leet 치환
    v := replace(v, '0', 'o');
    v := replace(v, '1', 'i');
    v := replace(v, '!', 'i');
    v := replace(v, '3', 'e');
    v := replace(v, '4', 'a');
    v := replace(v, '5', 's');
    v := replace(v, '7', 't');
    v := replace(v, '@', 'a');
    v := replace(v, '$', 's');

    -- 반복 축소
    v := regexp_replace(v, '(.)\1{2,}', '\1\1', 'g');

    return v;
  end;
  $_$;


ALTER FUNCTION "public"."normalize_nickname_for_policy"("p_input" "text") OWNER TO "postgres";

--
-- Name: owns_pet("uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."owns_pet"("target_pet_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select exists (
    select 1
    from public.pets p
    where p.id = target_pet_id
      and p.user_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."owns_pet"("target_pet_id" "uuid") OWNER TO "postgres";

--
-- Name: raise_community_write_error("text", "text", "text", "text", "text", "text"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."raise_community_write_error"("p_app_code" "text", "p_message" "text", "p_target_type" "text" DEFAULT NULL::"text", "p_target_field" "text" DEFAULT NULL::"text", "p_match_source" "text" DEFAULT NULL::"text", "p_hint" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  raise exception using
    errcode = 'P0001',
    message = p_message,
    detail = json_build_object(
      'app_code', p_app_code,
      'target_type', p_target_type,
      'target_field', p_target_field,
      'match_source', p_match_source
    )::text,
    hint = p_hint;
end;
$$;


ALTER FUNCTION "public"."raise_community_write_error"("p_app_code" "text", "p_message" "text", "p_target_type" "text", "p_target_field" "text", "p_match_source" "text", "p_hint" "text") OWNER TO "postgres";

--
-- Name: record_community_post_view("uuid", "text"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."record_community_post_view"("p_post_id" "uuid", "p_guest_session_id" "text" DEFAULT NULL::"text") RETURNS TABLE("counted" boolean, "view_count" integer, "viewer_type" "text", "dedupe_window_start" timestamp with time zone, "reason" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."record_community_post_view"("p_post_id" "uuid", "p_guest_session_id" "text") OWNER TO "postgres";

--
-- Name: refresh_community_moderation_queue("text", "uuid", "uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."refresh_community_moderation_queue"("p_target_type" "text", "p_target_id" "uuid", "p_source_report_id" "uuid" DEFAULT NULL::"uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_now timestamptz := timezone('utc', now());
  v_current_status text := null;
  v_report_count integer := 0;
  v_unique_reporter_count integer := 0;
  v_latest_reported_at timestamptz := null;
  v_has_personal_info boolean := false;
  v_has_hate boolean := false;
  v_priority integer := 0;
begin
  if p_target_type = 'post' then
    select status into v_current_status
    from public.posts
    where id = p_target_id;
  elsif p_target_type = 'comment' then
    select status into v_current_status
    from public.comments
    where id = p_target_id;
  else
    return;
  end if;

  if v_current_status is null then
    return;
  end if;

  select
    count(*),
    count(distinct reporter_id),
    max(created_at),
    coalesce(bool_or(reason_category = 'personal_info'), false),
    coalesce(bool_or(reason_category = 'hate'), false)
  into
    v_report_count,
    v_unique_reporter_count,
    v_latest_reported_at,
    v_has_personal_info,
    v_has_hate
  from public.reports
  where target_type = p_target_type
    and target_id = p_target_id
    and public.is_active_community_report_status(status);

  if v_report_count = 0 then
    update public.community_moderation_queue
    set
      report_count = 0,
      unique_reporter_count = 0,
      latest_reported_at = null,
      content_status_snapshot = v_current_status,
      updated_at = v_now
    where target_type = p_target_type
      and target_id = p_target_id;
    return;
  end if;

  v_priority := (
    case
      when v_has_personal_info or v_has_hate then 400
      when v_current_status = 'auto_hidden' then 300
      else 100
    end
  ) + least(v_unique_reporter_count, 99);

  insert into public.community_moderation_queue (
    target_type,
    target_id,
    content_status_snapshot,
    report_count,
    unique_reporter_count,
    latest_reported_at,
    queue_status,
    priority
  )
  values (
    p_target_type,
    p_target_id,
    v_current_status,
    v_report_count,
    v_unique_reporter_count,
    v_latest_reported_at,
    'open',
    v_priority
  )
  on conflict (target_type, target_id) do update
  set
    content_status_snapshot = excluded.content_status_snapshot,
    report_count = excluded.report_count,
    unique_reporter_count = excluded.unique_reporter_count,
    latest_reported_at = excluded.latest_reported_at,
    queue_status = case
      when public.community_moderation_queue.queue_status = 'resolved' then 'open'
      else public.community_moderation_queue.queue_status
    end,
    decision = case
      when public.community_moderation_queue.queue_status = 'resolved' then null
      else public.community_moderation_queue.decision
    end,
    decision_reason = case
      when public.community_moderation_queue.queue_status = 'resolved' then null
      else public.community_moderation_queue.decision_reason
    end,
    resolved_at = case
      when public.community_moderation_queue.queue_status = 'resolved' then null
      else public.community_moderation_queue.resolved_at
    end,
    priority = excluded.priority,
    updated_at = v_now;

  if p_target_type = 'post'
     and v_unique_reporter_count >= 3
     and v_current_status = 'active'
  then
    perform public.set_community_target_status(
      p_target_type,
      p_target_id,
      'auto_hidden',
      'auto_hide',
      'auto_hide_threshold',
      p_source_report_id,
      '신고 누적 기준으로 자동 숨김 처리됐어요.',
      null,
      'open',
      null
    );

    update public.community_moderation_queue
    set
      content_status_snapshot = 'auto_hidden',
      priority = greatest(priority, 300 + least(v_unique_reporter_count, 99)),
      updated_at = v_now
    where target_type = p_target_type
      and target_id = p_target_id;
  elsif p_target_type = 'comment'
     and v_unique_reporter_count >= 2
     and v_current_status = 'active'
  then
    perform public.set_community_target_status(
      p_target_type,
      p_target_id,
      'auto_hidden',
      'auto_hide',
      'auto_hide_threshold',
      p_source_report_id,
      '신고 누적 기준으로 자동 숨김 처리됐어요.',
      null,
      'open',
      null
    );

    update public.community_moderation_queue
    set
      content_status_snapshot = 'auto_hidden',
      priority = greatest(priority, 300 + least(v_unique_reporter_count, 99)),
      updated_at = v_now
    where target_type = p_target_type
      and target_id = p_target_id;
  end if;
end;
$$;


ALTER FUNCTION "public"."refresh_community_moderation_queue"("p_target_type" "text", "p_target_id" "uuid", "p_source_report_id" "uuid") OWNER TO "postgres";

--
-- Name: refresh_pet_care_guide_search_document(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."refresh_pet_care_guide_search_document"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.search_document :=
    setweight(to_tsvector('simple', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.summary, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.body_preview, '')), 'B') ||
    setweight(to_tsvector('simple', array_to_string(coalesce(new.tags, '{}'::text[]), ' ')), 'B') ||
    setweight(to_tsvector('simple', array_to_string(coalesce(new.species_keywords, '{}'::text[]), ' ')), 'B') ||
    setweight(to_tsvector('simple', array_to_string(coalesce(new.search_keywords, '{}'::text[]), ' ')), 'C') ||
    setweight(to_tsvector('simple', coalesce(new.category, '')), 'C');

  return new;
end;
$$;


ALTER FUNCTION "public"."refresh_pet_care_guide_search_document"() OWNER TO "postgres";

--
-- Name: repair_post_counts("uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."repair_post_counts"("target_post_id" "uuid" DEFAULT NULL::"uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  update public.posts p
  set
    like_count = (
      select count(*)
      from public.likes l
      where l.post_id = p.id
    ),
    comment_count = (
      select count(*)
      from public.comments c
      where c.post_id = p.id
        and c.deleted_at is null
        and c.status = 'active'
    ),
    report_count = (
      select count(*)
      from public.reports r
      where r.target_type = 'post'
        -- 현재 seed 스키마 기준 public.reports.target_id 는 uuid다.
        -- 따라서 캐스팅 없이 uuid = uuid 비교를 유지해 인덱스 활용을 보장한다.
        and r.target_id = p.id
    )
  where target_post_id is null
    or p.id = target_post_id;
end;
$$;


ALTER FUNCTION "public"."repair_post_counts"("target_post_id" "uuid") OWNER TO "postgres";

--
-- Name: rls_auto_enable(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";

--
-- Name: search_pet_care_guides("text", "public"."pet_species_group", integer, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."search_pet_care_guides"("p_query" "text", "p_species_group" "public"."pet_species_group" DEFAULT NULL::"public"."pet_species_group", "p_age_in_months" integer DEFAULT NULL::integer, "p_limit" integer DEFAULT 24) RETURNS TABLE("id" "uuid", "slug" "text", "title" "text", "summary" "text", "body_preview" "text", "category" "text", "tags" "text"[], "target_species" "text"[], "species_keywords" "text"[], "search_keywords" "text"[], "age_policy_type" "public"."guide_age_policy_type", "age_policy_life_stage" "public"."guide_life_stage_key", "age_policy_min_months" integer, "age_policy_max_months" integer, "status" "public"."guide_content_status", "is_active" boolean, "priority" integer, "sort_order" integer, "rotation_weight" integer, "thumbnail_image_url" "text", "cover_image_url" "text", "image_alt" "text", "published_at" timestamp with time zone, "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "match_score" real)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  with normalized as (
    select
      nullif(regexp_replace(lower(coalesce(p_query, '')), '\s+', ' ', 'g'), '') as query,
      greatest(1, least(coalesce(p_limit, 24), 50)) as limit_count
  ),
  candidate_guides as (
    select
      g.*,
      n.query,
      plainto_tsquery('simple', n.query) as ts_query
    from public.pet_care_guides g
    cross join normalized n
    where n.query is not null
      and g.deleted_at is null
      and g.is_active = true
      and g.status = 'published'
      and (g.published_at is null or g.published_at <= timezone('utc', now()))
      and (
        p_species_group is null
        or g.target_species @> array[p_species_group::text]
        or g.target_species @> array['common']::text[]
      )
      and (
        p_age_in_months is null
        or g.age_policy_type = 'all'
        or (
          g.age_policy_type = 'lifeStage'
          and (
            (g.age_policy_life_stage = 'baby' and p_age_in_months < 12)
            or (g.age_policy_life_stage = 'adult' and p_age_in_months between 12 and 95)
            or (g.age_policy_life_stage = 'senior' and p_age_in_months >= 96)
          )
        )
        or (
          g.age_policy_type = 'ageRange'
          and (g.age_policy_min_months is null or p_age_in_months >= g.age_policy_min_months)
          and (g.age_policy_max_months is null or p_age_in_months <= g.age_policy_max_months)
        )
      )
  ),
  matched_guides as (
    select
      g.*,
      ts_rank_cd(g.search_document, g.ts_query, 32) as text_rank,
      greatest(
        similarity(lower(g.title), g.query),
        similarity(lower(g.summary), g.query),
        similarity(lower(g.body_preview), g.query),
        similarity(lower(array_to_string(coalesce(g.tags, '{}'::text[]), ' ')), g.query),
        similarity(lower(array_to_string(coalesce(g.search_keywords, '{}'::text[]), ' ')), g.query),
        similarity(lower(array_to_string(coalesce(g.species_keywords, '{}'::text[]), ' ')), g.query)
      ) as similarity_rank
    from candidate_guides g
    where g.search_document @@ g.ts_query
      or lower(g.title) % g.query
      or lower(g.summary) like '%' || g.query || '%'
      or lower(g.body_preview) like '%' || g.query || '%'
      or exists (
        select 1
        from unnest(coalesce(g.tags, '{}'::text[])) as keyword
        where lower(keyword) like '%' || g.query || '%'
      )
      or exists (
        select 1
        from unnest(coalesce(g.search_keywords, '{}'::text[])) as keyword
        where lower(keyword) like '%' || g.query || '%'
      )
      or exists (
        select 1
        from unnest(coalesce(g.species_keywords, '{}'::text[])) as keyword
        where lower(keyword) like '%' || g.query || '%'
      )
  )
  select
    g.id,
    g.slug,
    g.title,
    g.summary,
    g.body_preview,
    g.category,
    g.tags,
    g.target_species,
    g.species_keywords,
    g.search_keywords,
    g.age_policy_type,
    g.age_policy_life_stage,
    g.age_policy_min_months,
    g.age_policy_max_months,
    g.status,
    g.is_active,
    g.priority,
    g.sort_order,
    g.rotation_weight,
    g.thumbnail_image_url,
    g.cover_image_url,
    g.image_alt,
    g.published_at,
    g.created_at,
    g.updated_at,
    (
      (g.text_rank * 120)::real +
      (g.similarity_rank * 45)::real +
      (case when lower(g.title) = g.query then 80 else 0 end)::real +
      (case when lower(g.title) like g.query || '%' then 24 else 0 end)::real +
      (case when p_species_group is not null and g.target_species @> array[p_species_group::text] then 18 else 6 end)::real +
      (case
        when p_age_in_months is null or g.age_policy_type = 'all' then 8
        when g.age_policy_type = 'lifeStage' then 12
        when g.age_policy_type = 'ageRange' then 10
        else 0
      end)::real +
      (coalesce(g.priority, 0) * 0.8)::real -
      (coalesce(g.sort_order, 0) * 0.05)::real
    ) as match_score
  from matched_guides g
  order by
    match_score desc,
    g.priority desc,
    g.sort_order asc,
    g.published_at desc nulls last,
    g.updated_at desc
  limit (select limit_count from normalized);
$$;


ALTER FUNCTION "public"."search_pet_care_guides"("p_query" "text", "p_species_group" "public"."pet_species_group", "p_age_in_months" integer, "p_limit" integer) OWNER TO "postgres";

--
-- Name: set_community_target_status("text", "uuid", "text", "text", "text", "uuid", "text", "uuid", "text", "text"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."set_community_target_status"("p_target_type" "text", "p_target_id" "uuid", "p_after_status" "text", "p_action_type" "text", "p_reason_code" "text" DEFAULT NULL::"text", "p_source_report_id" "uuid" DEFAULT NULL::"uuid", "p_memo" "text" DEFAULT NULL::"text", "p_actor_id" "uuid" DEFAULT NULL::"uuid", "p_queue_status" "text" DEFAULT NULL::"text", "p_decision" "text" DEFAULT NULL::"text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_now timestamptz := timezone('utc', now());
  v_before_status text := null;
  v_trimmed_memo text := nullif(btrim(coalesce(p_memo, '')), '');
begin
  if p_target_type not in ('post', 'comment') then
    raise exception '지원하지 않는 moderation 대상입니다.';
  end if;

  if p_target_type = 'post' then
    if p_after_status not in ('active', 'hidden', 'auto_hidden', 'deleted', 'banned') then
      raise exception '지원하지 않는 게시글 상태입니다.';
    end if;

    select status into v_before_status
    from public.posts
    where id = p_target_id;

    if v_before_status is null then
      raise exception 'moderation 대상 게시글을 찾을 수 없어요.';
    end if;

    update public.posts
    set
      status = p_after_status,
      deleted_at = case
        when p_after_status = 'deleted' then coalesce(deleted_at, v_now)
        else null
      end,
      moderated_at = v_now,
      moderated_by = p_actor_id,
      operator_memo = coalesce(v_trimmed_memo, operator_memo)
    where id = p_target_id;
  else
    if p_after_status not in ('active', 'hidden', 'auto_hidden', 'deleted') then
      raise exception '지원하지 않는 댓글 상태입니다.';
    end if;

    select status into v_before_status
    from public.comments
    where id = p_target_id;

    if v_before_status is null then
      raise exception 'moderation 대상 댓글을 찾을 수 없어요.';
    end if;

    update public.comments
    set
      status = p_after_status,
      deleted_at = case
        when p_after_status = 'deleted' then coalesce(deleted_at, v_now)
        else null
      end,
      updated_at = v_now
    where id = p_target_id;
  end if;

  insert into public.community_moderation_actions (
    action_type,
    actor_id,
    target_type,
    target_id,
    before_status,
    after_status,
    source_report_id,
    reason_code,
    memo
  )
  values (
    p_action_type,
    p_actor_id,
    p_target_type,
    p_target_id,
    v_before_status,
    p_after_status,
    p_source_report_id,
    p_reason_code,
    v_trimmed_memo
  );

  update public.community_moderation_queue
  set
    content_status_snapshot = p_after_status,
    queue_status = coalesce(p_queue_status, queue_status),
    decision = coalesce(p_decision, decision),
    decision_reason = coalesce(p_reason_code, decision_reason),
    operator_memo = coalesce(v_trimmed_memo, operator_memo),
    resolved_at = case
      when coalesce(p_queue_status, queue_status) = 'resolved' or p_decision is not null
        then coalesce(resolved_at, v_now)
      else resolved_at
    end,
    updated_at = v_now
  where target_type = p_target_type
    and target_id = p_target_id;

  return v_before_status;
end;
$$;


ALTER FUNCTION "public"."set_community_target_status"("p_target_type" "text", "p_target_id" "uuid", "p_after_status" "text", "p_action_type" "text", "p_reason_code" "text", "p_source_report_id" "uuid", "p_memo" "text", "p_actor_id" "uuid", "p_queue_status" "text", "p_decision" "text") OWNER TO "postgres";

--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";

--
-- Name: set_updated_at_blocked_nicknames(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."set_updated_at_blocked_nicknames"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
  begin
    new.updated_at = now();
    return new;
  end;
  $$;


ALTER FUNCTION "public"."set_updated_at_blocked_nicknames"() OWNER TO "postgres";

--
-- Name: sync_account_deletion_cleanup_summary("uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."sync_account_deletion_cleanup_summary"("p_request_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_total_count integer := 0;
  v_completed_count integer := 0;
  v_pending_count integer := 0;
  v_now timestamptz := timezone('utc', now());
begin
  if p_request_id is null then
    return;
  end if;

  select
    count(*)::integer,
    count(*) filter (where status = 'completed')::integer,
    count(*) filter (where status <> 'completed')::integer
  into
    v_total_count,
    v_completed_count,
    v_pending_count
  from public.account_deletion_cleanup_items
  where request_id = p_request_id;

  update public.account_deletion_requests
  set cleanup_item_count = v_total_count,
      cleanup_completed_count = v_completed_count,
      storage_cleanup_pending = (v_pending_count > 0),
      cleanup_completed_at = case
        when v_total_count > 0 and v_pending_count = 0
          then coalesce(cleanup_completed_at, v_now)
        else cleanup_completed_at
      end,
      completed_at = case
        when v_total_count > 0
          and v_pending_count = 0
          and status in ('cleanup_pending', 'completed_with_cleanup_pending')
          then coalesce(completed_at, v_now)
        else completed_at
      end,
      status = case
        when v_total_count > 0
          and v_pending_count = 0
          and status in ('cleanup_pending', 'completed_with_cleanup_pending')
          then 'completed'
        when v_total_count > 0
          and v_pending_count > 0
          and status in ('db_deleted', 'completed', 'completed_with_cleanup_pending')
          then 'completed_with_cleanup_pending'
        else status
      end,
      last_status_changed_at = case
        when v_total_count > 0
          and v_pending_count = 0
          and status in ('cleanup_pending', 'completed_with_cleanup_pending')
          then v_now
        when v_total_count > 0
          and v_pending_count > 0
          and status in ('db_deleted', 'completed', 'completed_with_cleanup_pending')
          then v_now
        else last_status_changed_at
      end
  where id = p_request_id;
end;
$$;


ALTER FUNCTION "public"."sync_account_deletion_cleanup_summary"("p_request_id" "uuid") OWNER TO "postgres";

--
-- Name: sync_comment_like_count(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."sync_comment_like_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if tg_op = 'INSERT' then
    update public.comments
    set like_count = like_count + 1
    where id = new.comment_id;
  elsif tg_op = 'DELETE' then
    update public.comments
    set like_count = greatest(like_count - 1, 0)
    where id = old.comment_id;
  end if;
  return null;
end;
$$;


ALTER FUNCTION "public"."sync_comment_like_count"() OWNER TO "postgres";

--
-- Name: sync_comment_reply_count(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."sync_comment_reply_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  target_parent_id uuid := null;
  alternate_parent_id uuid := null;
begin
  if tg_op <> 'INSERT' then
    target_parent_id := old.parent_comment_id;
  end if;

  if tg_op <> 'DELETE' then
    if target_parent_id is null then
      target_parent_id := new.parent_comment_id;
    elsif new.parent_comment_id is distinct from old.parent_comment_id then
      alternate_parent_id := new.parent_comment_id;
    end if;
  end if;

  if target_parent_id is not null then
    update public.comments parent
    set reply_count = (
      select count(*)
      from public.comments child
      where child.parent_comment_id = target_parent_id
        and child.deleted_at is null
        and child.status = 'active'
    )
    where parent.id = target_parent_id;
  end if;

  if alternate_parent_id is not null then
    update public.comments parent
    set reply_count = (
      select count(*)
      from public.comments child
      where child.parent_comment_id = alternate_parent_id
        and child.deleted_at is null
        and child.status = 'active'
    )
    where parent.id = alternate_parent_id;
  end if;

  return null;
end;
$$;


ALTER FUNCTION "public"."sync_comment_reply_count"() OWNER TO "postgres";

--
-- Name: sync_community_image_asset_from_storage(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."sync_community_image_asset_from_storage"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'storage'
    AS $$
declare
  path_segments text[];
  target_post_id uuid := null;
  target_user_id uuid := null;
begin
  if tg_op = 'INSERT' and new.bucket_id <> 'community-images' then
    return null;
  end if;

  if tg_op = 'DELETE' and old.bucket_id <> 'community-images' then
    return null;
  end if;

  path_segments := storage.foldername(coalesce(new.name, old.name));

  begin
    if coalesce(array_length(path_segments, 1), 0) >= 1 then
      target_user_id := path_segments[1]::uuid;
    end if;
  exception
    when invalid_text_representation then
      target_user_id := null;
  end;

  begin
    if coalesce(array_length(path_segments, 1), 0) >= 2 then
      target_post_id := path_segments[2]::uuid;
    end if;
  exception
    when invalid_text_representation then
      target_post_id := null;
  end;

  if tg_op = 'INSERT' then
    insert into public.community_image_assets (
      storage_path,
      user_id,
      post_id,
      upload_status,
      created_at,
      updated_at
    )
    values (
      new.name,
      target_user_id,
      target_post_id,
      'uploaded',
      coalesce(new.created_at, timezone('utc', now())),
      timezone('utc', now())
    )
    on conflict (storage_path) do update
    set
      user_id = coalesce(excluded.user_id, public.community_image_assets.user_id),
      post_id = coalesce(excluded.post_id, public.community_image_assets.post_id),
      upload_status = 'uploaded',
      updated_at = timezone('utc', now());

    return null;
  end if;

  update public.community_image_assets
  set
    upload_status = 'cleaned_up',
    cleanup_completed_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  where storage_path = old.name;

  return null;
end;
$$;


ALTER FUNCTION "public"."sync_community_image_asset_from_storage"() OWNER TO "postgres";

--
-- Name: sync_community_post_image_assets(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."sync_community_post_image_assets"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  active_paths text[] := array(
    select distinct btrim(path)
    from unnest(
      case
        when new.image_urls is not null and coalesce(array_length(new.image_urls, 1), 0) > 0
          then new.image_urls
        when new.image_url is not null and btrim(new.image_url) <> ''
          then array[new.image_url]
        else array[]::text[]
      end
    ) as path
    where btrim(path) <> ''
  );
  current_post_status text := new.status;
  next_cleanup_reason text := case
    when new.status = 'active' then 'detached'
    else new.status
  end;
begin
  update public.community_image_assets
  set
    source_post_status = current_post_status,
    upload_status = case
      when current_post_status = 'active' and storage_path = any(active_paths) then 'attached'
      else 'cleanup_pending'
    end,
    attached_at = case
      when current_post_status = 'active' and storage_path = any(active_paths)
        then coalesce(attached_at, timezone('utc', now()))
      else attached_at
    end,
    cleanup_reason = case
      when current_post_status = 'active' and storage_path = any(active_paths) then null
      else next_cleanup_reason
    end,
    cleanup_requested_at = case
      when current_post_status = 'active' and storage_path = any(active_paths) then null
      else coalesce(cleanup_requested_at, timezone('utc', now()))
    end,
    cleanup_completed_at = case
      when current_post_status = 'active' and storage_path = any(active_paths) then null
      else cleanup_completed_at
    end,
    updated_at = timezone('utc', now())
  where post_id = new.id
    and upload_status <> 'cleaned_up';

  return null;
end;
$$;


ALTER FUNCTION "public"."sync_community_post_image_assets"() OWNER TO "postgres";

--
-- Name: sync_community_report_change(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."sync_community_report_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if tg_op = 'INSERT' then
    perform public.refresh_community_moderation_queue(new.target_type, new.target_id, new.id);
    return null;
  end if;

  if tg_op = 'DELETE' then
    perform public.refresh_community_moderation_queue(old.target_type, old.target_id, null);
    return null;
  end if;

  if tg_op = 'UPDATE' then
    if new.status = 'rejected_abuse' and old.status is distinct from 'rejected_abuse' then
      perform public.bump_community_reporter_rejected_abuse(new.reporter_id);
    end if;

    if new.status is distinct from old.status
       or new.reason_category is distinct from old.reason_category
    then
      perform public.refresh_community_moderation_queue(new.target_type, new.target_id, new.id);
    end if;
  end if;

  return null;
end;
$$;


ALTER FUNCTION "public"."sync_community_report_change"() OWNER TO "postgres";

--
-- Name: sync_memory_image_owner_fields(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."sync_memory_image_owner_fields"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_memory public.memories%rowtype;
begin
  select *
    into v_memory
  from public.memories
  where id = new.memory_id;

  if not found then
    raise exception 'memory_id % does not exist', new.memory_id;
  end if;

  new.user_id := v_memory.user_id;
  new.pet_id := v_memory.pet_id;
  return new;
end;
$$;


ALTER FUNCTION "public"."sync_memory_image_owner_fields"() OWNER TO "postgres";

--
-- Name: sync_pet_place_meta_counters(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."sync_pet_place_meta_counters"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_meta_id uuid;
  v_old_meta_id uuid;
begin
  if tg_op = 'DELETE' then
    v_meta_id := old.pet_place_meta_id;
    v_old_meta_id := null;
  elsif tg_op = 'UPDATE' then
    v_meta_id := new.pet_place_meta_id;
    v_old_meta_id := old.pet_place_meta_id;
  else
    v_meta_id := new.pet_place_meta_id;
    v_old_meta_id := null;
  end if;

  update public.pet_place_service_meta m
  set
    bookmarked_count = (
      select count(*)
      from public.pet_place_bookmarks b
      where b.pet_place_meta_id = v_meta_id
    ),
    user_report_count = (
      select count(*)
      from public.pet_place_user_reports r
      where r.pet_place_meta_id = v_meta_id
    ),
    updated_at = timezone('utc', now())
  where m.id = v_meta_id;

  if v_old_meta_id is not null and v_old_meta_id <> v_meta_id then
    update public.pet_place_service_meta m
    set
      bookmarked_count = (
        select count(*)
        from public.pet_place_bookmarks b
        where b.pet_place_meta_id = v_old_meta_id
      ),
      user_report_count = (
        select count(*)
        from public.pet_place_user_reports r
        where r.pet_place_meta_id = v_old_meta_id
      ),
      updated_at = timezone('utc', now())
    where m.id = v_old_meta_id;
  end if;

  return null;
end;
$$;


ALTER FUNCTION "public"."sync_pet_place_meta_counters"() OWNER TO "postgres";

--
-- Name: sync_post_comment_count(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."sync_post_comment_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  old_countable boolean := false;
  new_countable boolean := false;
begin
  if tg_op <> 'INSERT' then
    old_countable := old.deleted_at is null and old.status = 'active';
  end if;

  if tg_op <> 'DELETE' then
    new_countable := new.deleted_at is null and new.status = 'active';
  end if;

  if tg_op = 'INSERT' and new_countable then
    update public.posts
    set comment_count = comment_count + 1
    where id = new.post_id;
  elsif tg_op = 'DELETE' and old_countable then
    update public.posts
    set comment_count = greatest(comment_count - 1, 0)
    where id = old.post_id;
  elsif tg_op = 'UPDATE' and old_countable = true and new_countable = false then
    update public.posts
    set comment_count = greatest(comment_count - 1, 0)
    where id = new.post_id;
  elsif tg_op = 'UPDATE' and old_countable = false and new_countable = true then
    update public.posts
    set comment_count = comment_count + 1
    where id = new.post_id;
  end if;
  return null;
end;
$$;


ALTER FUNCTION "public"."sync_post_comment_count"() OWNER TO "postgres";

--
-- Name: sync_post_like_count(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."sync_post_like_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if tg_op = 'INSERT' then
    update public.posts
    set like_count = like_count + 1
    where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.posts
    set like_count = greatest(like_count - 1, 0)
    where id = old.post_id;
  end if;
  return null;
end;
$$;


ALTER FUNCTION "public"."sync_post_like_count"() OWNER TO "postgres";

--
-- Name: sync_post_report_count(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."sync_post_report_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if tg_op = 'INSERT' and new.target_type = 'post' then
    update public.posts
    set report_count = report_count + 1
    where id = new.target_id;
  elsif tg_op = 'DELETE' and old.target_type = 'post' then
    update public.posts
    set report_count = greatest(report_count - 1, 0)
    where id = old.target_id;
  end if;
  return null;
end;
$$;


ALTER FUNCTION "public"."sync_post_report_count"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";

--
-- Name: account_deletion_cleanup_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."account_deletion_cleanup_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "uuid" NOT NULL,
    "bucket_name" "text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "cleanup_action" "text" DEFAULT 'delete_object'::"text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "attempts" integer DEFAULT 0 NOT NULL,
    "last_attempted_at" timestamp with time zone,
    "processing_started_at" timestamp with time zone,
    "cleanup_completed_at" timestamp with time zone,
    "last_error_code" "text",
    "last_error_message" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "account_deletion_cleanup_items_attempts_check" CHECK (("attempts" >= 0)),
    CONSTRAINT "account_deletion_cleanup_items_bucket_name_not_blank_check" CHECK (("char_length"("btrim"("bucket_name")) > 0)),
    CONSTRAINT "account_deletion_cleanup_items_cleanup_action_check" CHECK (("cleanup_action" = 'delete_object'::"text")),
    CONSTRAINT "account_deletion_cleanup_items_last_error_code_not_blank_check" CHECK ((("last_error_code" IS NULL) OR ("char_length"("btrim"("last_error_code")) > 0))),
    CONSTRAINT "account_deletion_cleanup_items_last_error_message_not_blank_che" CHECK ((("last_error_message" IS NULL) OR ("char_length"("btrim"("last_error_message")) > 0))),
    CONSTRAINT "account_deletion_cleanup_items_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text"]))),
    CONSTRAINT "account_deletion_cleanup_items_storage_path_not_blank_check" CHECK (("char_length"("btrim"("storage_path")) > 0))
);


ALTER TABLE "public"."account_deletion_cleanup_items" OWNER TO "postgres";

--
-- Name: account_deletion_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."account_deletion_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "request_origin" "text" DEFAULT 'app'::"text" NOT NULL,
    "idempotency_key" "text",
    "status" "text" DEFAULT 'requested'::"text" NOT NULL,
    "storage_cleanup_pending" boolean DEFAULT false NOT NULL,
    "cleanup_item_count" integer DEFAULT 0 NOT NULL,
    "cleanup_completed_count" integer DEFAULT 0 NOT NULL,
    "requested_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "started_at" timestamp with time zone,
    "db_deleted_at" timestamp with time zone,
    "cleanup_started_at" timestamp with time zone,
    "cleanup_completed_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "last_status_changed_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "last_error_code" "text",
    "last_error_message" "text",
    CONSTRAINT "account_deletion_requests_cleanup_counts_check" CHECK ((("cleanup_item_count" >= 0) AND ("cleanup_completed_count" >= 0) AND ("cleanup_completed_count" <= "cleanup_item_count"))),
    CONSTRAINT "account_deletion_requests_last_error_code_not_blank_check" CHECK ((("last_error_code" IS NULL) OR ("char_length"("btrim"("last_error_code")) > 0))),
    CONSTRAINT "account_deletion_requests_last_error_message_not_blank_check" CHECK ((("last_error_message" IS NULL) OR ("char_length"("btrim"("last_error_message")) > 0))),
    CONSTRAINT "account_deletion_requests_request_origin_not_blank_check" CHECK ((("char_length"("btrim"("request_origin")) >= 1) AND ("char_length"("btrim"("request_origin")) <= 80))),
    CONSTRAINT "account_deletion_requests_status_check" CHECK (("status" = ANY (ARRAY['requested'::"text", 'in_progress'::"text", 'db_deleted'::"text", 'cleanup_pending'::"text", 'completed'::"text", 'completed_with_cleanup_pending'::"text", 'failed'::"text", 'unknown_pending_confirmation'::"text"])))
);


ALTER TABLE "public"."account_deletion_requests" OWNER TO "postgres";

--
-- Name: ai_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."ai_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "pet_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "kind" "text" NOT NULL,
    "message" "text" NOT NULL,
    "model" "text",
    "prompt" "jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "ai_messages_kind_length_check" CHECK ((("char_length"("btrim"("kind")) >= 1) AND ("char_length"("btrim"("kind")) <= 50)))
);


ALTER TABLE "public"."ai_messages" OWNER TO "postgres";

--
-- Name: anniversaries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."anniversaries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "pet_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "date" "date" NOT NULL,
    "title" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "anniversaries_type_length_check" CHECK ((("char_length"("btrim"("type")) >= 1) AND ("char_length"("btrim"("type")) <= 40)))
);


ALTER TABLE "public"."anniversaries" OWNER TO "postgres";

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "action" "text" NOT NULL,
    "payload" "jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "audit_logs_action_length_check" CHECK ((("char_length"("btrim"("action")) >= 1) AND ("char_length"("btrim"("action")) <= 80)))
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";

--
-- Name: billing_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."billing_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "payload" "jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "billing_events_event_type_length_check" CHECK ((("char_length"("btrim"("event_type")) >= 1) AND ("char_length"("btrim"("event_type")) <= 50)))
);


ALTER TABLE "public"."billing_events" OWNER TO "postgres";

--
-- Name: blocked_nickname_patterns; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."blocked_nickname_patterns" (
    "id" bigint NOT NULL,
    "pattern" "text" NOT NULL,
    "reason" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."blocked_nickname_patterns" OWNER TO "postgres";

--
-- Name: blocked_nickname_patterns_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE "public"."blocked_nickname_patterns_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."blocked_nickname_patterns_id_seq" OWNER TO "postgres";

--
-- Name: blocked_nickname_patterns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE "public"."blocked_nickname_patterns_id_seq" OWNED BY "public"."blocked_nickname_patterns"."id";


--
-- Name: blocked_nicknames; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."blocked_nicknames" (
    "term" "public"."citext" NOT NULL,
    "reason" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "match_mode" "text" DEFAULT 'exact'::"text" NOT NULL,
    CONSTRAINT "blocked_nicknames_match_mode_check" CHECK (("match_mode" = ANY (ARRAY['exact'::"text", 'contains'::"text"])))
);


ALTER TABLE "public"."blocked_nicknames" OWNER TO "postgres";

--
-- Name: comment_likes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."comment_likes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "comment_id" "uuid" NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."comment_likes" OWNER TO "postgres";

--
-- Name: comments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "deleted_at" timestamp with time zone,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "parent_comment_id" "uuid",
    "depth" smallint DEFAULT 0 NOT NULL,
    "reply_count" integer DEFAULT 0 NOT NULL,
    "like_count" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "comments_content_length_check" CHECK ((("char_length"("btrim"("content")) >= 1) AND ("char_length"("btrim"("content")) <= 2000))),
    CONSTRAINT "comments_deleted_consistency_check" CHECK (((("deleted_at" IS NULL) AND ("status" <> 'deleted'::"text")) OR (("deleted_at" IS NOT NULL) AND ("status" = 'deleted'::"text")))),
    CONSTRAINT "comments_depth_check" CHECK (("depth" = ANY (ARRAY[0, 1]))),
    CONSTRAINT "comments_depth_parent_consistency_check" CHECK (((("depth" = 0) AND ("parent_comment_id" IS NULL)) OR (("depth" = 1) AND ("parent_comment_id" IS NOT NULL)))),
    CONSTRAINT "comments_parent_not_self_check" CHECK ((("parent_comment_id" IS NULL) OR ("parent_comment_id" <> "id"))),
    CONSTRAINT "comments_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'hidden'::"text", 'auto_hidden'::"text", 'deleted'::"text"])))
);


ALTER TABLE "public"."comments" OWNER TO "postgres";

--
-- Name: community_blocked_term_patterns; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."community_blocked_term_patterns" (
    "id" bigint NOT NULL,
    "pattern" "text" NOT NULL,
    "reason" "text",
    "target_type" "text" DEFAULT 'all'::"text" NOT NULL,
    "target_field" "text" DEFAULT 'all'::"text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "community_blocked_term_patterns_pattern_not_blank_check" CHECK (("char_length"("btrim"("pattern")) > 0)),
    CONSTRAINT "community_blocked_term_patterns_target_field_check" CHECK (("target_field" = ANY (ARRAY['all'::"text", 'title'::"text", 'content'::"text"]))),
    CONSTRAINT "community_blocked_term_patterns_target_type_check" CHECK (("target_type" = ANY (ARRAY['all'::"text", 'post'::"text", 'comment'::"text"])))
);


ALTER TABLE "public"."community_blocked_term_patterns" OWNER TO "postgres";

--
-- Name: community_blocked_term_patterns_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE "public"."community_blocked_term_patterns" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."community_blocked_term_patterns_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: community_blocked_terms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."community_blocked_terms" (
    "id" bigint NOT NULL,
    "term" "text" NOT NULL,
    "reason" "text",
    "target_type" "text" DEFAULT 'all'::"text" NOT NULL,
    "target_field" "text" DEFAULT 'all'::"text" NOT NULL,
    "match_mode" "text" DEFAULT 'contains'::"text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "community_blocked_terms_match_mode_check" CHECK (("match_mode" = ANY (ARRAY['exact'::"text", 'contains'::"text"]))),
    CONSTRAINT "community_blocked_terms_target_field_check" CHECK (("target_field" = ANY (ARRAY['all'::"text", 'title'::"text", 'content'::"text"]))),
    CONSTRAINT "community_blocked_terms_target_type_check" CHECK (("target_type" = ANY (ARRAY['all'::"text", 'post'::"text", 'comment'::"text"]))),
    CONSTRAINT "community_blocked_terms_term_not_blank_check" CHECK (("char_length"("btrim"("term")) > 0))
);


ALTER TABLE "public"."community_blocked_terms" OWNER TO "postgres";

--
-- Name: community_blocked_terms_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE "public"."community_blocked_terms" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."community_blocked_terms_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: community_image_assets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."community_image_assets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "storage_path" "text" NOT NULL,
    "storage_bucket" "text" DEFAULT 'community-images'::"text" NOT NULL,
    "user_id" "uuid",
    "post_id" "uuid",
    "upload_status" "text" DEFAULT 'uploaded'::"text" NOT NULL,
    "source_post_status" "text",
    "cleanup_reason" "text",
    "attached_at" timestamp with time zone,
    "cleanup_requested_at" timestamp with time zone,
    "cleanup_completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "community_image_assets_status_check" CHECK (("upload_status" = ANY (ARRAY['uploaded'::"text", 'attached'::"text", 'cleanup_pending'::"text", 'cleaned_up'::"text"])))
);


ALTER TABLE "public"."community_image_assets" OWNER TO "postgres";

--
-- Name: community_moderation_actions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."community_moderation_actions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "action_type" "text" NOT NULL,
    "actor_id" "uuid",
    "target_type" "text" NOT NULL,
    "target_id" "uuid" NOT NULL,
    "before_status" "text",
    "after_status" "text",
    "source_report_id" "uuid",
    "reason_code" "text",
    "memo" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "community_moderation_actions_target_type_check" CHECK (("target_type" = ANY (ARRAY['post'::"text", 'comment'::"text"])))
);


ALTER TABLE "public"."community_moderation_actions" OWNER TO "postgres";

--
-- Name: community_moderation_queue; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."community_moderation_queue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "target_type" "text" NOT NULL,
    "target_id" "uuid" NOT NULL,
    "content_status_snapshot" "text" NOT NULL,
    "report_count" integer DEFAULT 0 NOT NULL,
    "unique_reporter_count" integer DEFAULT 0 NOT NULL,
    "latest_reported_at" timestamp with time zone,
    "queue_status" "text" DEFAULT 'open'::"text" NOT NULL,
    "priority" integer DEFAULT 0 NOT NULL,
    "assigned_to" "uuid",
    "decision" "text",
    "decision_reason" "text",
    "operator_memo" "text",
    "resolved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "community_moderation_queue_status_check" CHECK (("queue_status" = ANY (ARRAY['open'::"text", 'triaged'::"text", 'reviewing'::"text", 'resolved'::"text"]))),
    CONSTRAINT "community_moderation_queue_target_type_check" CHECK (("target_type" = ANY (ARRAY['post'::"text", 'comment'::"text"])))
);


ALTER TABLE "public"."community_moderation_queue" OWNER TO "postgres";

--
-- Name: community_post_view_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."community_post_view_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "viewer_user_id" "uuid",
    "guest_session_id" "text",
    "dedupe_window_start" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "community_post_view_events_viewer_check" CHECK (((("viewer_user_id" IS NOT NULL) AND ("guest_session_id" IS NULL)) OR (("viewer_user_id" IS NULL) AND ("guest_session_id" IS NOT NULL) AND ("btrim"("guest_session_id") <> ''::"text"))))
);


ALTER TABLE "public"."community_post_view_events" OWNER TO "postgres";

--
-- Name: community_reporter_flags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."community_reporter_flags" (
    "reporter_id" "uuid" NOT NULL,
    "flag_status" "text" DEFAULT 'clear'::"text" NOT NULL,
    "rate_limit_hit_count" integer DEFAULT 0 NOT NULL,
    "rejected_abuse_count" integer DEFAULT 0 NOT NULL,
    "last_reported_at" timestamp with time zone,
    "last_rate_limited_at" timestamp with time zone,
    "last_rejected_abuse_at" timestamp with time zone,
    "operator_memo" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "community_reporter_flags_status_check" CHECK (("flag_status" = ANY (ARRAY['clear'::"text", 'watch'::"text"])))
);


ALTER TABLE "public"."community_reporter_flags" OWNER TO "postgres";

--
-- Name: daily_recall; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."daily_recall" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "pet_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "memory_id" "uuid",
    "mode" "public"."recall_mode" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."daily_recall" OWNER TO "postgres";

--
-- Name: emotions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."emotions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "pet_id" "uuid" NOT NULL,
    "memory_id" "uuid",
    "score" numeric(5,2),
    "primary_emotion" "public"."emotion_tag",
    "raw" "jsonb",
    "analyzed_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."emotions" OWNER TO "postgres";

--
-- Name: letters; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."letters" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "pet_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "is_ai_generated" boolean DEFAULT false NOT NULL,
    "ai_model" "text",
    "ai_context" "jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "letters_content_length_check" CHECK ((("char_length"("btrim"("content")) >= 1) AND ("char_length"("btrim"("content")) <= 5000)))
);


ALTER TABLE "public"."letters" OWNER TO "postgres";

--
-- Name: likes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."likes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."likes" OWNER TO "postgres";

--
-- Name: memories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."memories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "pet_id" "uuid" NOT NULL,
    "image_url" "text",
    "title" "text" NOT NULL,
    "content" "text",
    "emotion" "public"."emotion_tag",
    "tags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "occurred_at" "date",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "image_urls" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "category" "text",
    "sub_category" "text",
    "price" integer,
    CONSTRAINT "memories_content_length_check" CHECK ((("content" IS NULL) OR ("char_length"("content") <= 5000))),
    CONSTRAINT "memories_price_check" CHECK ((("price" IS NULL) OR ("price" >= 0))),
    CONSTRAINT "memories_title_length_check" CHECK ((("char_length"("btrim"("title")) >= 1) AND ("char_length"("btrim"("title")) <= 100)))
);


ALTER TABLE "public"."memories" OWNER TO "postgres";

--
-- Name: memory_images; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."memory_images" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "memory_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "pet_id" "uuid" NOT NULL,
    "sort_order" integer NOT NULL,
    "original_path" "text" NOT NULL,
    "timeline_thumb_path" "text",
    "width" integer,
    "height" integer,
    "status" "public"."memory_image_status" DEFAULT 'pending'::"public"."memory_image_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "retry_count" integer DEFAULT 0 NOT NULL,
    "last_error_code" "text",
    "last_error_message" "text",
    "last_processed_at" timestamp with time zone,
    "processing_started_at" timestamp with time zone,
    CONSTRAINT "memory_images_dimensions_check" CHECK (((("width" IS NULL) AND ("height" IS NULL)) OR (("width" IS NOT NULL) AND ("height" IS NOT NULL) AND ("width" > 0) AND ("height" > 0)))),
    CONSTRAINT "memory_images_last_error_code_not_blank_check" CHECK ((("last_error_code" IS NULL) OR ("char_length"("btrim"("last_error_code")) > 0))),
    CONSTRAINT "memory_images_last_error_message_not_blank_check" CHECK ((("last_error_message" IS NULL) OR ("char_length"("btrim"("last_error_message")) > 0))),
    CONSTRAINT "memory_images_original_path_not_blank_check" CHECK (("char_length"("btrim"("original_path")) > 0)),
    CONSTRAINT "memory_images_ready_requires_thumb_check" CHECK ((("status" <> 'ready'::"public"."memory_image_status") OR ("timeline_thumb_path" IS NOT NULL))),
    CONSTRAINT "memory_images_retry_count_check" CHECK (("retry_count" >= 0)),
    CONSTRAINT "memory_images_sort_order_check" CHECK (("sort_order" >= 0)),
    CONSTRAINT "memory_images_timeline_thumb_path_not_blank_check" CHECK ((("timeline_thumb_path" IS NULL) OR ("char_length"("btrim"("timeline_thumb_path")) > 0)))
);


ALTER TABLE "public"."memory_images" OWNER TO "postgres";

--
-- Name: TABLE "memory_images"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE "public"."memory_images" IS '메모리 이미지 원본/타임라인 썸네일 분리 저장용 테이블';


--
-- Name: COLUMN "memory_images"."original_path"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."memory_images"."original_path" IS '상세 보기에서 사용하는 원본 이미지 storage path';


--
-- Name: COLUMN "memory_images"."timeline_thumb_path"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."memory_images"."timeline_thumb_path" IS '타임라인 목록에서 사용하는 저해상도 썸네일 storage path';


--
-- Name: COLUMN "memory_images"."status"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."memory_images"."status" IS 'pending=썸네일 생성 대기, ready=사용 가능, failed=생성 실패';


--
-- Name: COLUMN "memory_images"."retry_count"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."memory_images"."retry_count" IS '썸네일 worker 재시도 횟수';


--
-- Name: COLUMN "memory_images"."last_error_code"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."memory_images"."last_error_code" IS '마지막 실패 코드(original_not_found, storage_upload_failed 등)';


--
-- Name: COLUMN "memory_images"."last_error_message"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."memory_images"."last_error_message" IS '마지막 실패 상세 메시지';


--
-- Name: COLUMN "memory_images"."last_processed_at"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."memory_images"."last_processed_at" IS 'worker가 마지막으로 처리 시도한 시각';


--
-- Name: COLUMN "memory_images"."processing_started_at"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."memory_images"."processing_started_at" IS '현재 또는 최근 처리 시작 시각(stuck job 회수 판단용)';


--
-- Name: memory_timeline_primary_images; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW "public"."memory_timeline_primary_images" WITH ("security_invoker"='true') AS
 SELECT DISTINCT ON ("memory_id") "memory_id",
    "id" AS "memory_image_id",
    "user_id",
    "pet_id",
    "sort_order",
    "original_path",
    "timeline_thumb_path",
    "status",
    "width",
    "height",
    "created_at"
   FROM "public"."memory_images" "mi"
  ORDER BY "memory_id", "sort_order", "created_at";


ALTER VIEW "public"."memory_timeline_primary_images" OWNER TO "postgres";

--
-- Name: VIEW "memory_timeline_primary_images"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW "public"."memory_timeline_primary_images" IS '타임라인에서 memory_id 당 대표 이미지 1건만 조회하기 위한 뷰';


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "type" "public"."notification_type" NOT NULL,
    "title" "text",
    "body" "text",
    "reference" "jsonb",
    "is_read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";

--
-- Name: pet_care_guide_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."pet_care_guide_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "pet_id" "uuid",
    "guide_id" "uuid" NOT NULL,
    "event_type" "public"."guide_event_type" NOT NULL,
    "placement" "text" NOT NULL,
    "rotation_window_key" "text",
    "search_query" "text",
    "context_species_group" "public"."pet_species_group",
    "context_species_detail_key" "text",
    "context_age_in_months" integer,
    "occurred_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    CONSTRAINT "pet_care_guide_events_context_age_check" CHECK ((("context_age_in_months" IS NULL) OR ("context_age_in_months" >= 0)))
);


ALTER TABLE "public"."pet_care_guide_events" OWNER TO "postgres";

--
-- Name: pet_care_guides; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."pet_care_guides" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "title" "text" NOT NULL,
    "summary" "text" NOT NULL,
    "body" "text" NOT NULL,
    "body_preview" "text" NOT NULL,
    "category" "text" NOT NULL,
    "tags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "target_species" "text"[] DEFAULT '{common}'::"text"[] NOT NULL,
    "species_keywords" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "search_keywords" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "age_policy_type" "public"."guide_age_policy_type" DEFAULT 'all'::"public"."guide_age_policy_type" NOT NULL,
    "age_policy_life_stage" "public"."guide_life_stage_key",
    "age_policy_min_months" integer,
    "age_policy_max_months" integer,
    "status" "public"."guide_content_status" DEFAULT 'draft'::"public"."guide_content_status" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "priority" integer DEFAULT 0 NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "rotation_weight" integer DEFAULT 1 NOT NULL,
    "thumbnail_image_url" "text",
    "cover_image_url" "text",
    "image_alt" "text",
    "published_at" timestamp with time zone,
    "archived_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "search_document" "tsvector" DEFAULT ''::"tsvector" NOT NULL,
    CONSTRAINT "pet_care_guides_age_policy_min_max_check" CHECK ((("age_policy_min_months" IS NULL) OR ("age_policy_max_months" IS NULL) OR ("age_policy_min_months" <= "age_policy_max_months"))),
    CONSTRAINT "pet_care_guides_age_policy_range_check" CHECK ((("age_policy_type" <> 'ageRange'::"public"."guide_age_policy_type") OR ("age_policy_min_months" IS NOT NULL) OR ("age_policy_max_months" IS NOT NULL))),
    CONSTRAINT "pet_care_guides_body_preview_length_check" CHECK ((("char_length"("btrim"("body_preview")) >= 1) AND ("char_length"("btrim"("body_preview")) <= 400))),
    CONSTRAINT "pet_care_guides_category_check" CHECK (("category" = ANY (ARRAY['nutrition'::"text", 'health'::"text", 'behavior'::"text", 'daily-care'::"text", 'environment'::"text", 'safety'::"text", 'seasonal'::"text"]))),
    CONSTRAINT "pet_care_guides_life_stage_check" CHECK ((("age_policy_type" <> 'lifeStage'::"public"."guide_age_policy_type") OR ("age_policy_life_stage" IS NOT NULL))),
    CONSTRAINT "pet_care_guides_summary_length_check" CHECK ((("char_length"("btrim"("summary")) >= 1) AND ("char_length"("btrim"("summary")) <= 400))),
    CONSTRAINT "pet_care_guides_target_species_check" CHECK ((("target_species" <@ ARRAY['dog'::"text", 'cat'::"text", 'other'::"text", 'common'::"text"]) AND ("cardinality"("target_species") > 0))),
    CONSTRAINT "pet_care_guides_title_length_check" CHECK ((("char_length"("btrim"("title")) >= 1) AND ("char_length"("btrim"("title")) <= 120)))
);


ALTER TABLE "public"."pet_care_guides" OWNER TO "postgres";

--
-- Name: pet_place_bookmarks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."pet_place_bookmarks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "pet_place_meta_id" "uuid" NOT NULL,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."pet_place_bookmarks" OWNER TO "postgres";

--
-- Name: TABLE "pet_place_bookmarks"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE "public"."pet_place_bookmarks" IS '사용자별 펫동반 장소 북마크';


--
-- Name: pet_place_external_signals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."pet_place_external_signals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pet_place_meta_id" "uuid" NOT NULL,
    "signal_provider" "text" NOT NULL,
    "signal_key" "text" NOT NULL,
    "signal_value_boolean" boolean,
    "signal_value_text" "text",
    "signal_score" integer DEFAULT 0 NOT NULL,
    "source_note" "text",
    "observed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "pet_place_external_signals_key_check" CHECK (("signal_key" = ANY (ARRAY['allows-dogs'::"text", 'outdoor-seating'::"text", 'good-for-children'::"text", 'official-pet-policy'::"text", 'pet-travel-listing'::"text"]))),
    CONSTRAINT "pet_place_external_signals_provider_check" CHECK (("signal_provider" = ANY (ARRAY['google-places'::"text", 'tour-api'::"text", 'public-data'::"text"]))),
    CONSTRAINT "pet_place_external_signals_score_range_check" CHECK ((("signal_score" >= '-10'::integer) AND ("signal_score" <= 10))),
    CONSTRAINT "pet_place_external_signals_value_presence_check" CHECK ((("signal_value_boolean" IS NOT NULL) OR ("signal_value_text" IS NOT NULL)))
);


ALTER TABLE "public"."pet_place_external_signals" OWNER TO "postgres";

--
-- Name: TABLE "pet_place_external_signals"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE "public"."pet_place_external_signals" IS 'Google Places / 관광공사 / 공공데이터 등 외부 보조 신호 정규화 테이블';


--
-- Name: COLUMN "pet_place_external_signals"."signal_key"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."pet_place_external_signals"."signal_key" IS 'allows-dogs / outdoor-seating / good-for-children / official-pet-policy / pet-travel-listing';


--
-- Name: pet_place_search_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."pet_place_search_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "query_text" "text",
    "source_domain" "text" DEFAULT 'pet-friendly-place'::"text" NOT NULL,
    "anchor_latitude" numeric(9,6),
    "anchor_longitude" numeric(9,6),
    "result_count" integer DEFAULT 0 NOT NULL,
    "provider_mix" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "session_id" "uuid",
    CONSTRAINT "pet_place_search_logs_actor_presence_check" CHECK ((("user_id" IS NOT NULL) OR ("session_id" IS NOT NULL))),
    CONSTRAINT "pet_place_search_logs_anchor_pair_check" CHECK (((("anchor_latitude" IS NULL) AND ("anchor_longitude" IS NULL)) OR (("anchor_latitude" IS NOT NULL) AND ("anchor_longitude" IS NOT NULL)))),
    CONSTRAINT "pet_place_search_logs_domain_check" CHECK (("source_domain" = ANY (ARRAY['pet-friendly-place'::"text", 'pet-travel'::"text"]))),
    CONSTRAINT "pet_place_search_logs_result_count_check" CHECK (("result_count" >= 0))
);


ALTER TABLE "public"."pet_place_search_logs" OWNER TO "postgres";

--
-- Name: TABLE "pet_place_search_logs"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE "public"."pet_place_search_logs" IS '펫동반 장소 검색 로그';


--
-- Name: pet_place_service_meta; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."pet_place_service_meta" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider" "text" NOT NULL,
    "provider_place_id" "text" NOT NULL,
    "canonical_name" "text",
    "canonical_category" "text",
    "canonical_address" "text",
    "canonical_road_address" "text",
    "latitude" numeric(9,6),
    "longitude" numeric(9,6),
    "verification_status" "text" DEFAULT 'unknown'::"text" NOT NULL,
    "source_type" "text" DEFAULT 'system-inference'::"text" NOT NULL,
    "pet_policy_text" "text",
    "operating_status_label" "text",
    "admin_note" "text",
    "user_report_count" integer DEFAULT 0 NOT NULL,
    "bookmarked_count" integer DEFAULT 0 NOT NULL,
    "last_verified_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "primary_source_provider" "text",
    "primary_source_place_id" "text",
    CONSTRAINT "pet_place_service_meta_coordinates_pair_check" CHECK (((("latitude" IS NULL) AND ("longitude" IS NULL)) OR (("latitude" IS NOT NULL) AND ("longitude" IS NOT NULL)))),
    CONSTRAINT "pet_place_service_meta_counts_non_negative_check" CHECK ((("user_report_count" >= 0) AND ("bookmarked_count" >= 0))),
    CONSTRAINT "pet_place_service_meta_primary_source_pair_check" CHECK (((("primary_source_provider" IS NULL) AND ("primary_source_place_id" IS NULL)) OR (("primary_source_provider" IS NOT NULL) AND ("primary_source_place_id" IS NOT NULL)))),
    CONSTRAINT "pet_place_service_meta_provider_not_blank_check" CHECK (("char_length"("btrim"("provider")) > 0)),
    CONSTRAINT "pet_place_service_meta_provider_place_id_not_blank_check" CHECK (("char_length"("btrim"("provider_place_id")) > 0)),
    CONSTRAINT "pet_place_service_meta_source_type_check" CHECK (("source_type" = ANY (ARRAY['system-inference'::"text", 'user-report'::"text", 'admin-review'::"text"]))),
    CONSTRAINT "pet_place_service_meta_verification_status_check" CHECK (("verification_status" = ANY (ARRAY['unknown'::"text", 'keyword-inferred'::"text", 'user-reported'::"text", 'admin-verified'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."pet_place_service_meta" OWNER TO "postgres";

--
-- Name: TABLE "pet_place_service_meta"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE "public"."pet_place_service_meta" IS '펫동반 장소 canonical 메타 본체. 최종 검증 상태와 운영 메모의 source of truth';


--
-- Name: COLUMN "pet_place_service_meta"."provider"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."pet_place_service_meta"."provider" IS 'kakao, google-places, tour-api 등 외부 공급자 식별자';


--
-- Name: COLUMN "pet_place_service_meta"."provider_place_id"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."pet_place_service_meta"."provider_place_id" IS '외부 공급자 원본 place id';


--
-- Name: COLUMN "pet_place_service_meta"."verification_status"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."pet_place_service_meta"."verification_status" IS 'unknown / keyword-inferred / user-reported / admin-verified / rejected';


--
-- Name: COLUMN "pet_place_service_meta"."source_type"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."pet_place_service_meta"."source_type" IS 'system-inference / user-report / admin-review';


--
-- Name: COLUMN "pet_place_service_meta"."primary_source_provider"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."pet_place_service_meta"."primary_source_provider" IS '현재 canonical 대표 source provider. 실제 외부 원본 매핑은 pet_place_source_links에서 관리';


--
-- Name: pet_place_source_links; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."pet_place_source_links" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pet_place_meta_id" "uuid" NOT NULL,
    "provider" "text" NOT NULL,
    "provider_place_id" "text" NOT NULL,
    "source_place_name" "text",
    "source_category_label" "text",
    "source_address" "text",
    "source_road_address" "text",
    "latitude" numeric(9,6),
    "longitude" numeric(9,6),
    "source_payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "matched_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "pet_place_source_links_coordinates_pair_check" CHECK (((("latitude" IS NULL) AND ("longitude" IS NULL)) OR (("latitude" IS NOT NULL) AND ("longitude" IS NOT NULL)))),
    CONSTRAINT "pet_place_source_links_provider_not_blank_check" CHECK (("char_length"("btrim"("provider")) > 0)),
    CONSTRAINT "pet_place_source_links_provider_place_id_not_blank_check" CHECK (("char_length"("btrim"("provider_place_id")) > 0))
);


ALTER TABLE "public"."pet_place_source_links" OWNER TO "postgres";

--
-- Name: TABLE "pet_place_source_links"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE "public"."pet_place_source_links" IS '외부 원본 provider + provider_place_id와 canonical meta를 연결하는 매핑 테이블';


--
-- Name: COLUMN "pet_place_source_links"."provider"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."pet_place_source_links"."provider" IS 'kakao / google-places / tour-api / public-data';


--
-- Name: COLUMN "pet_place_source_links"."source_payload"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."pet_place_source_links"."source_payload" IS '원본 응답 일부를 저장할 수 있는 선택적 jsonb 보조 컬럼';


--
-- Name: pet_place_user_reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."pet_place_user_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "pet_place_meta_id" "uuid" NOT NULL,
    "report_status" "text" NOT NULL,
    "report_text" "text",
    "evidence_url" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "pet_place_user_reports_status_check" CHECK (("report_status" = ANY (ARRAY['pet-friendly'::"text", 'not-pet-friendly'::"text", 'policy-changed'::"text", 'unknown'::"text"])))
);


ALTER TABLE "public"."pet_place_user_reports" OWNER TO "postgres";

--
-- Name: TABLE "pet_place_user_reports"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE "public"."pet_place_user_reports" IS '사용자 제보 원본 테이블';


--
-- Name: pet_place_verification_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."pet_place_verification_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pet_place_meta_id" "uuid" NOT NULL,
    "actor_user_id" "uuid",
    "previous_verification_status" "text",
    "next_verification_status" "text" NOT NULL,
    "source_type" "text" NOT NULL,
    "note" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "pet_place_verification_logs_next_status_check" CHECK (("next_verification_status" = ANY (ARRAY['unknown'::"text", 'keyword-inferred'::"text", 'user-reported'::"text", 'admin-verified'::"text", 'rejected'::"text"]))),
    CONSTRAINT "pet_place_verification_logs_previous_status_check" CHECK ((("previous_verification_status" IS NULL) OR ("previous_verification_status" = ANY (ARRAY['unknown'::"text", 'keyword-inferred'::"text", 'user-reported'::"text", 'admin-verified'::"text", 'rejected'::"text"])))),
    CONSTRAINT "pet_place_verification_logs_source_type_check" CHECK (("source_type" = ANY (ARRAY['system-inference'::"text", 'user-report'::"text", 'admin-review'::"text"])))
);


ALTER TABLE "public"."pet_place_verification_logs" OWNER TO "postgres";

--
-- Name: TABLE "pet_place_verification_logs"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE "public"."pet_place_verification_logs" IS '운영 검수 및 상태 변경 이력';


--
-- Name: pet_schedules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."pet_schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "pet_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "note" "text",
    "starts_at" timestamp with time zone NOT NULL,
    "ends_at" timestamp with time zone,
    "all_day" boolean DEFAULT false NOT NULL,
    "category" "text" NOT NULL,
    "sub_category" "text",
    "icon_key" "text" NOT NULL,
    "color_key" "text" DEFAULT 'brand'::"text" NOT NULL,
    "reminder_minutes" integer[] DEFAULT '{}'::integer[] NOT NULL,
    "repeat_rule" "text" DEFAULT 'none'::"text" NOT NULL,
    "repeat_interval" integer DEFAULT 1 NOT NULL,
    "repeat_until" timestamp with time zone,
    "linked_memory_id" "uuid",
    "completed_at" timestamp with time zone,
    "source" "text" DEFAULT 'manual'::"text" NOT NULL,
    "external_calendar_id" "text",
    "external_event_id" "text",
    "sync_status" "text" DEFAULT 'local'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "pet_schedules_all_day_check" CHECK ((("all_day" = false) OR (("date_trunc"('day'::"text", "starts_at") = "starts_at") AND (("ends_at" IS NULL) OR ("date_trunc"('day'::"text", "ends_at") = "ends_at"))))),
    CONSTRAINT "pet_schedules_category_check" CHECK (("category" = ANY (ARRAY['walk'::"text", 'meal'::"text", 'health'::"text", 'grooming'::"text", 'diary'::"text", 'other'::"text"]))),
    CONSTRAINT "pet_schedules_color_key_check" CHECK (("color_key" = ANY (ARRAY['brand'::"text", 'blue'::"text", 'green'::"text", 'orange'::"text", 'pink'::"text", 'yellow'::"text", 'gray'::"text"]))),
    CONSTRAINT "pet_schedules_completed_at_check" CHECK ((("completed_at" IS NULL) OR ("completed_at" >= "starts_at"))),
    CONSTRAINT "pet_schedules_external_sync_check" CHECK (((("source" = 'manual'::"text") AND ("external_calendar_id" IS NULL) AND ("external_event_id" IS NULL)) OR (("source" = ANY (ARRAY['google_calendar'::"text", 'apple_calendar'::"text", 'imported'::"text"])) AND ((("external_calendar_id" IS NULL) AND ("external_event_id" IS NULL)) OR (("external_calendar_id" IS NOT NULL) AND ("external_event_id" IS NOT NULL)))))),
    CONSTRAINT "pet_schedules_icon_key_check" CHECK (("icon_key" = ANY (ARRAY['walk'::"text", 'meal'::"text", 'bowl'::"text", 'medical-bag'::"text", 'stethoscope'::"text", 'syringe'::"text", 'pill'::"text", 'content-cut'::"text", 'shower'::"text", 'notebook'::"text", 'heart'::"text", 'star'::"text", 'calendar'::"text", 'dots'::"text"]))),
    CONSTRAINT "pet_schedules_note_length_check" CHECK ((("note" IS NULL) OR ("char_length"("note") <= 1000))),
    CONSTRAINT "pet_schedules_repeat_interval_check" CHECK ((("repeat_interval" >= 1) AND ("repeat_interval" <= 365))),
    CONSTRAINT "pet_schedules_repeat_rule_check" CHECK (("repeat_rule" = ANY (ARRAY['none'::"text", 'daily'::"text", 'weekly'::"text", 'monthly'::"text", 'yearly'::"text"]))),
    CONSTRAINT "pet_schedules_repeat_until_check" CHECK (((("repeat_rule" = 'none'::"text") AND ("repeat_until" IS NULL)) OR (("repeat_rule" <> 'none'::"text") AND (("repeat_until" IS NULL) OR ("repeat_until" >= "starts_at"))))),
    CONSTRAINT "pet_schedules_source_check" CHECK (("source" = ANY (ARRAY['manual'::"text", 'google_calendar'::"text", 'apple_calendar'::"text", 'imported'::"text"]))),
    CONSTRAINT "pet_schedules_sub_category_check" CHECK ((("sub_category" IS NULL) OR ("sub_category" = ANY (ARRAY['vaccine'::"text", 'hospital'::"text", 'medicine'::"text", 'checkup'::"text", 'bath'::"text", 'haircut'::"text", 'nail'::"text", 'meal-plan'::"text", 'walk-routine'::"text", 'journal'::"text", 'etc'::"text"])))),
    CONSTRAINT "pet_schedules_sync_status_check" CHECK (("sync_status" = ANY (ARRAY['local'::"text", 'synced'::"text", 'dirty'::"text", 'deleted'::"text"]))),
    CONSTRAINT "pet_schedules_time_range_check" CHECK ((("ends_at" IS NULL) OR ("ends_at" >= "starts_at"))),
    CONSTRAINT "pet_schedules_title_length_check" CHECK ((("char_length"("btrim"("title")) >= 1) AND ("char_length"("btrim"("title")) <= 80)))
);


ALTER TABLE "public"."pet_schedules" OWNER TO "postgres";

--
-- Name: pet_travel_pet_policies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."pet_travel_pet_policies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "place_id" "uuid" NOT NULL,
    "source_type" "text" NOT NULL,
    "policy_status" "text" NOT NULL,
    "policy_note" "text",
    "confidence" numeric(4,3) DEFAULT 0 NOT NULL,
    "requires_onsite_check" boolean DEFAULT true NOT NULL,
    "evidence_summary" "text",
    "evidence_payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "actor_user_id" "uuid",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "pet_travel_pet_policies_confidence_range_check" CHECK ((("confidence" >= (0)::numeric) AND ("confidence" <= (1)::numeric))),
    CONSTRAINT "pet_travel_pet_policies_evidence_payload_object_check" CHECK (("jsonb_typeof"("evidence_payload") = 'object'::"text")),
    CONSTRAINT "pet_travel_pet_policies_policy_status_check" CHECK (("policy_status" = ANY (ARRAY['unknown'::"text", 'allowed'::"text", 'restricted'::"text", 'not_allowed'::"text"]))),
    CONSTRAINT "pet_travel_pet_policies_source_type_check" CHECK (("source_type" = ANY (ARRAY['tour-api'::"text", 'user-report'::"text", 'admin-review'::"text", 'system-inference'::"text"])))
);


ALTER TABLE "public"."pet_travel_pet_policies" OWNER TO "postgres";

--
-- Name: TABLE "pet_travel_pet_policies"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE "public"."pet_travel_pet_policies" IS '반려동물과 여행 Trust Layer 정책 테이블. source별 정책, confidence, 근거를 누적 저장';


--
-- Name: COLUMN "pet_travel_pet_policies"."source_type"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."pet_travel_pet_policies"."source_type" IS 'tour-api / user-report / admin-review / system-inference';


--
-- Name: COLUMN "pet_travel_pet_policies"."policy_status"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."pet_travel_pet_policies"."policy_status" IS 'unknown / allowed / restricted / not_allowed';


--
-- Name: COLUMN "pet_travel_pet_policies"."requires_onsite_check"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."pet_travel_pet_policies"."requires_onsite_check" IS 'allowed여도 현장 확인이 필요하면 true를 유지한다';


--
-- Name: pet_travel_places; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."pet_travel_places" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "canonical_name" "text" NOT NULL,
    "address" "text" NOT NULL,
    "latitude" numeric(9,6) NOT NULL,
    "longitude" numeric(9,6) NOT NULL,
    "place_type" "text" NOT NULL,
    "primary_source" "text" NOT NULL,
    "primary_source_place_id" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "pet_travel_places_address_not_blank_check" CHECK (("char_length"("btrim"("address")) > 0)),
    CONSTRAINT "pet_travel_places_canonical_name_not_blank_check" CHECK (("char_length"("btrim"("canonical_name")) > 0)),
    CONSTRAINT "pet_travel_places_latitude_range_check" CHECK ((("latitude" >= ('-90'::integer)::numeric) AND ("latitude" <= (90)::numeric))),
    CONSTRAINT "pet_travel_places_longitude_range_check" CHECK ((("longitude" >= ('-180'::integer)::numeric) AND ("longitude" <= (180)::numeric))),
    CONSTRAINT "pet_travel_places_place_type_check" CHECK (("place_type" = ANY (ARRAY['travel-attraction'::"text", 'outdoor'::"text", 'stay'::"text", 'restaurant'::"text", 'experience'::"text", 'pet-venue'::"text", 'shopping'::"text", 'mixed'::"text"]))),
    CONSTRAINT "pet_travel_places_primary_source_check" CHECK (("primary_source" = ANY (ARRAY['tour-api'::"text", 'kakao-local'::"text", 'naver-local'::"text", 'google-places'::"text", 'system'::"text"]))),
    CONSTRAINT "pet_travel_places_primary_source_place_id_pair_check" CHECK (((("primary_source" = 'system'::"text") AND ("primary_source_place_id" IS NULL)) OR (("primary_source" <> 'system'::"text") AND ("primary_source_place_id" IS NOT NULL))))
);


ALTER TABLE "public"."pet_travel_places" OWNER TO "postgres";

--
-- Name: TABLE "pet_travel_places"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE "public"."pet_travel_places" IS '반려동물과 여행 canonical place 기준 테이블. 외부 provider id와 분리된 내부 anchor';


--
-- Name: COLUMN "pet_travel_places"."primary_source"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."pet_travel_places"."primary_source" IS '현재 canonical place의 대표 원본 source. dedicated source_links는 다음 단계 확장 대상';


--
-- Name: pet_travel_user_reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."pet_travel_user_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "place_id" "uuid" NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "report_type" "text" NOT NULL,
    "report_note" "text",
    "evidence_payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "report_status" "text" DEFAULT 'submitted'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "pet_travel_user_reports_evidence_payload_object_check" CHECK (("jsonb_typeof"("evidence_payload") = 'object'::"text")),
    CONSTRAINT "pet_travel_user_reports_report_status_check" CHECK (("report_status" = ANY (ARRAY['submitted'::"text", 'reviewed'::"text", 'dismissed'::"text"]))),
    CONSTRAINT "pet_travel_user_reports_report_type_check" CHECK (("report_type" = ANY (ARRAY['pet_allowed'::"text", 'pet_restricted'::"text", 'info_outdated'::"text"])))
);


ALTER TABLE "public"."pet_travel_user_reports" OWNER TO "postgres";

--
-- Name: TABLE "pet_travel_user_reports"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE "public"."pet_travel_user_reports" IS '반려동물과 여행 유저 제보 원본 테이블. Trust Layer confidence 보강 근거';


--
-- Name: COLUMN "pet_travel_user_reports"."report_type"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."pet_travel_user_reports"."report_type" IS 'pet_allowed / pet_restricted / info_outdated';


--
-- Name: COLUMN "pet_travel_user_reports"."report_status"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."pet_travel_user_reports"."report_status" IS 'submitted / reviewed / dismissed';


--
-- Name: pets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."pets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "name" "text" NOT NULL,
    "birth_date" "date",
    "adoption_date" "date",
    "weight_kg" numeric(5,2),
    "gender" "public"."pet_gender" DEFAULT 'unknown'::"public"."pet_gender" NOT NULL,
    "neutered" boolean,
    "breed" "text",
    "profile_image_url" "text",
    "theme_color" "text",
    "likes" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "dislikes" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "hobbies" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "personality_tags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "death_date" "date",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "species_group" "public"."pet_species_group" DEFAULT 'other'::"public"."pet_species_group" NOT NULL,
    "species_detail_key" "text",
    "species_display_name" "text",
    CONSTRAINT "pets_adoption_before_death_check" CHECK ((("adoption_date" IS NULL) OR ("death_date" IS NULL) OR ("adoption_date" <= "death_date"))),
    CONSTRAINT "pets_birth_before_death_check" CHECK ((("birth_date" IS NULL) OR ("death_date" IS NULL) OR ("birth_date" <= "death_date"))),
    CONSTRAINT "pets_name_length_check" CHECK ((("char_length"("btrim"("name")) >= 1) AND ("char_length"("btrim"("name")) <= 40))),
    CONSTRAINT "pets_species_detail_key_length_check" CHECK ((("species_detail_key" IS NULL) OR (("char_length"("btrim"("species_detail_key")) >= 1) AND ("char_length"("btrim"("species_detail_key")) <= 40)))),
    CONSTRAINT "pets_species_display_name_length_check" CHECK ((("species_display_name" IS NULL) OR (("char_length"("btrim"("species_display_name")) >= 1) AND ("char_length"("btrim"("species_display_name")) <= 60)))),
    CONSTRAINT "pets_weight_kg_check" CHECK ((("weight_kg" IS NULL) OR (("weight_kg" >= (0)::numeric) AND ("weight_kg" <= 999.99))))
);


ALTER TABLE "public"."pets" OWNER TO "postgres";

--
-- Name: posts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "pet_id" "uuid",
    "visibility" "public"."visibility" DEFAULT 'public'::"public"."visibility" NOT NULL,
    "content" "text" NOT NULL,
    "image_url" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "category" "text",
    "like_count" integer DEFAULT 0 NOT NULL,
    "comment_count" integer DEFAULT 0 NOT NULL,
    "report_count" integer DEFAULT 0 NOT NULL,
    "deleted_at" timestamp with time zone,
    "moderated_at" timestamp with time zone,
    "moderated_by" "uuid",
    "operator_memo" "text",
    "pet_snapshot_name" "text",
    "pet_snapshot_species" "text",
    "pet_snapshot_breed" "text",
    "pet_snapshot_age_label" "text",
    "pet_snapshot_avatar_path" "text",
    "show_pet_age" boolean DEFAULT true NOT NULL,
    "author_snapshot_nickname" "text",
    "author_snapshot_avatar_url" "text",
    "image_urls" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "title" "text" NOT NULL,
    "view_count" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "posts_category_check" CHECK ((("category" IS NULL) OR ("category" = ANY (ARRAY['free'::"text", 'question'::"text", 'info'::"text", 'daily'::"text"])))),
    CONSTRAINT "posts_content_length_check" CHECK ((("char_length"("btrim"("content")) >= 1) AND ("char_length"("btrim"("content")) <= 5000))),
    CONSTRAINT "posts_deleted_consistency_check" CHECK (((("deleted_at" IS NULL) AND ("status" <> 'deleted'::"text")) OR (("deleted_at" IS NOT NULL) AND ("status" = 'deleted'::"text")))),
    CONSTRAINT "posts_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'hidden'::"text", 'auto_hidden'::"text", 'deleted'::"text", 'banned'::"text"]))),
    CONSTRAINT "posts_title_length_check" CHECK ((("char_length"("btrim"("title")) >= 1) AND ("char_length"("btrim"("title")) <= 80)))
);


ALTER TABLE "public"."posts" OWNER TO "postgres";

--
-- Name: profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."profiles" (
    "user_id" "uuid" NOT NULL,
    "email" "public"."citext",
    "nickname" "public"."citext" NOT NULL,
    "avatar_url" "text",
    "locale" "text" DEFAULT 'ko-KR'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "nickname_confirmed" boolean DEFAULT false NOT NULL,
    "role" "public"."app_role" DEFAULT 'user'::"public"."app_role" NOT NULL,
    CONSTRAINT "profiles_nickname_chars_check" CHECK (("btrim"(("nickname")::"text") ~ '^[A-Za-z0-9가-힣]+$'::"text")),
    CONSTRAINT "profiles_nickname_length_check" CHECK ((("char_length"("btrim"(("nickname")::"text")) >= 2) AND ("char_length"("btrim"(("nickname")::"text")) <= 24))),
    CONSTRAINT "profiles_nickname_not_blank_check" CHECK (("char_length"("btrim"(("nickname")::"text")) > 0))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";

--
-- Name: reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reporter_id" "uuid" DEFAULT "auth"."uid"(),
    "target_type" "text" NOT NULL,
    "target_id" "uuid" NOT NULL,
    "reason" "text" NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "resolved_by" "uuid",
    "resolved_at" timestamp with time zone,
    "operator_memo" "text",
    "reason_category" "text",
    CONSTRAINT "reports_reason_category_check" CHECK ((("reason_category" IS NULL) OR ("reason_category" = ANY (ARRAY['spam'::"text", 'hate'::"text", 'advertising'::"text", 'misinformation'::"text", 'personal_info'::"text", 'other'::"text"])))),
    CONSTRAINT "reports_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'resolved'::"text", 'rejected'::"text"]))),
    CONSTRAINT "reports_target_type_check" CHECK (("target_type" = ANY (ARRAY['post'::"text", 'comment'::"text"])))
);


ALTER TABLE "public"."reports" OWNER TO "postgres";

--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "tier" "public"."subscription_tier" DEFAULT 'free'::"public"."subscription_tier" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "expires_at" timestamp with time zone,
    "store" "text",
    "store_receipt" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";

--
-- Name: user_consent_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."user_consent_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "consent_type" "text" NOT NULL,
    "agreed" boolean NOT NULL,
    "policy_version" "text" NOT NULL,
    "source" "text" DEFAULT 'signup'::"text" NOT NULL,
    "captured_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "anonymized_subject_id" "uuid",
    "anonymized_at" timestamp with time zone,
    "retention_note" "text",
    CONSTRAINT "user_consent_history_consent_type_check" CHECK (("consent_type" = ANY (ARRAY['terms'::"text", 'privacy'::"text", 'marketing'::"text"])))
);


ALTER TABLE "public"."user_consent_history" OWNER TO "postgres";

--
-- Name: v_my_pets_with_days; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW "public"."v_my_pets_with_days" AS
 SELECT "id",
    "user_id",
    "name",
    "birth_date",
    "adoption_date",
    "weight_kg",
    "gender",
    "neutered",
    "breed",
    "profile_image_url",
    "theme_color",
    "likes",
    "dislikes",
    "hobbies",
    "personality_tags",
    "death_date",
    "created_at",
    "updated_at",
        CASE
            WHEN ("adoption_date" IS NULL) THEN NULL::integer
            ELSE (CURRENT_DATE - "adoption_date")
        END AS "together_days"
   FROM "public"."pets" "p"
  WHERE ("user_id" = "auth"."uid"());


ALTER VIEW "public"."v_my_pets_with_days" OWNER TO "postgres";

--
-- Name: blocked_nickname_patterns id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."blocked_nickname_patterns" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."blocked_nickname_patterns_id_seq"'::"regclass");


--
-- Name: account_deletion_cleanup_items account_deletion_cleanup_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."account_deletion_cleanup_items"
    ADD CONSTRAINT "account_deletion_cleanup_items_pkey" PRIMARY KEY ("id");


--
-- Name: account_deletion_cleanup_items account_deletion_cleanup_items_unique_target; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."account_deletion_cleanup_items"
    ADD CONSTRAINT "account_deletion_cleanup_items_unique_target" UNIQUE ("request_id", "bucket_name", "storage_path");


--
-- Name: account_deletion_requests account_deletion_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."account_deletion_requests"
    ADD CONSTRAINT "account_deletion_requests_pkey" PRIMARY KEY ("id");


--
-- Name: ai_messages ai_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."ai_messages"
    ADD CONSTRAINT "ai_messages_pkey" PRIMARY KEY ("id");


--
-- Name: ai_messages ai_messages_user_id_pet_id_date_kind_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."ai_messages"
    ADD CONSTRAINT "ai_messages_user_id_pet_id_date_kind_key" UNIQUE ("user_id", "pet_id", "date", "kind");


--
-- Name: anniversaries anniversaries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."anniversaries"
    ADD CONSTRAINT "anniversaries_pkey" PRIMARY KEY ("id");


--
-- Name: anniversaries anniversaries_user_id_pet_id_type_date_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."anniversaries"
    ADD CONSTRAINT "anniversaries_user_id_pet_id_type_date_key" UNIQUE ("user_id", "pet_id", "type", "date");


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");


--
-- Name: billing_events billing_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."billing_events"
    ADD CONSTRAINT "billing_events_pkey" PRIMARY KEY ("id");


--
-- Name: blocked_nickname_patterns blocked_nickname_patterns_pattern_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."blocked_nickname_patterns"
    ADD CONSTRAINT "blocked_nickname_patterns_pattern_key" UNIQUE ("pattern");


--
-- Name: blocked_nickname_patterns blocked_nickname_patterns_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."blocked_nickname_patterns"
    ADD CONSTRAINT "blocked_nickname_patterns_pkey" PRIMARY KEY ("id");


--
-- Name: blocked_nicknames blocked_nicknames_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."blocked_nicknames"
    ADD CONSTRAINT "blocked_nicknames_pkey" PRIMARY KEY ("term");


--
-- Name: comment_likes comment_likes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."comment_likes"
    ADD CONSTRAINT "comment_likes_pkey" PRIMARY KEY ("id");


--
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_pkey" PRIMARY KEY ("id");


--
-- Name: community_blocked_term_patterns community_blocked_term_patterns_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."community_blocked_term_patterns"
    ADD CONSTRAINT "community_blocked_term_patterns_pkey" PRIMARY KEY ("id");


--
-- Name: community_blocked_terms community_blocked_terms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."community_blocked_terms"
    ADD CONSTRAINT "community_blocked_terms_pkey" PRIMARY KEY ("id");


--
-- Name: community_image_assets community_image_assets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."community_image_assets"
    ADD CONSTRAINT "community_image_assets_pkey" PRIMARY KEY ("id");


--
-- Name: community_image_assets community_image_assets_storage_path_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."community_image_assets"
    ADD CONSTRAINT "community_image_assets_storage_path_key" UNIQUE ("storage_path");


--
-- Name: community_moderation_actions community_moderation_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."community_moderation_actions"
    ADD CONSTRAINT "community_moderation_actions_pkey" PRIMARY KEY ("id");


--
-- Name: community_moderation_queue community_moderation_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."community_moderation_queue"
    ADD CONSTRAINT "community_moderation_queue_pkey" PRIMARY KEY ("id");


--
-- Name: community_post_view_events community_post_view_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."community_post_view_events"
    ADD CONSTRAINT "community_post_view_events_pkey" PRIMARY KEY ("id");


--
-- Name: community_reporter_flags community_reporter_flags_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."community_reporter_flags"
    ADD CONSTRAINT "community_reporter_flags_pkey" PRIMARY KEY ("reporter_id");


--
-- Name: daily_recall daily_recall_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."daily_recall"
    ADD CONSTRAINT "daily_recall_pkey" PRIMARY KEY ("id");


--
-- Name: daily_recall daily_recall_user_id_pet_id_date_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."daily_recall"
    ADD CONSTRAINT "daily_recall_user_id_pet_id_date_key" UNIQUE ("user_id", "pet_id", "date");


--
-- Name: emotions emotions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."emotions"
    ADD CONSTRAINT "emotions_pkey" PRIMARY KEY ("id");


--
-- Name: letters letters_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."letters"
    ADD CONSTRAINT "letters_pkey" PRIMARY KEY ("id");


--
-- Name: likes likes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_pkey" PRIMARY KEY ("id");


--
-- Name: likes likes_post_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_post_id_user_id_key" UNIQUE ("post_id", "user_id");


--
-- Name: memories memories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."memories"
    ADD CONSTRAINT "memories_pkey" PRIMARY KEY ("id");


--
-- Name: memory_images memory_images_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."memory_images"
    ADD CONSTRAINT "memory_images_pkey" PRIMARY KEY ("id");


--
-- Name: memory_images memory_images_unique_memory_original_path; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."memory_images"
    ADD CONSTRAINT "memory_images_unique_memory_original_path" UNIQUE ("memory_id", "original_path");


--
-- Name: memory_images memory_images_unique_memory_sort_order; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."memory_images"
    ADD CONSTRAINT "memory_images_unique_memory_sort_order" UNIQUE ("memory_id", "sort_order");


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");


--
-- Name: pet_care_guide_events pet_care_guide_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."pet_care_guide_events"
    ADD CONSTRAINT "pet_care_guide_events_pkey" PRIMARY KEY ("id");


--
-- Name: pet_care_guides pet_care_guides_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."pet_care_guides"
    ADD CONSTRAINT "pet_care_guides_pkey" PRIMARY KEY ("id");


--
-- Name: pet_care_guides pet_care_guides_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."pet_care_guides"
    ADD CONSTRAINT "pet_care_guides_slug_key" UNIQUE ("slug");


--
-- Name: pet_place_bookmarks pet_place_bookmarks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."pet_place_bookmarks"
    ADD CONSTRAINT "pet_place_bookmarks_pkey" PRIMARY KEY ("id");


--
-- Name: pet_place_bookmarks pet_place_bookmarks_unique_user_place; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."pet_place_bookmarks"
    ADD CONSTRAINT "pet_place_bookmarks_unique_user_place" UNIQUE ("user_id", "pet_place_meta_id");


--
-- Name: pet_place_external_signals pet_place_external_signals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."pet_place_external_signals"
    ADD CONSTRAINT "pet_place_external_signals_pkey" PRIMARY KEY ("id");


--
-- Name: pet_place_external_signals pet_place_external_signals_unique_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."pet_place_external_signals"
    ADD CONSTRAINT "pet_place_external_signals_unique_key" UNIQUE ("pet_place_meta_id", "signal_provider", "signal_key");


--
-- Name: pet_place_search_logs pet_place_search_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."pet_place_search_logs"
    ADD CONSTRAINT "pet_place_search_logs_pkey" PRIMARY KEY ("id");


--
-- Name: pet_place_service_meta pet_place_service_meta_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."pet_place_service_meta"
    ADD CONSTRAINT "pet_place_service_meta_pkey" PRIMARY KEY ("id");


--
-- Name: pet_place_service_meta pet_place_service_meta_unique_provider_place; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."pet_place_service_meta"
    ADD CONSTRAINT "pet_place_service_meta_unique_provider_place" UNIQUE ("provider", "provider_place_id");


--
-- Name: pet_place_source_links pet_place_source_links_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."pet_place_source_links"
    ADD CONSTRAINT "pet_place_source_links_pkey" PRIMARY KEY ("id");


--
-- Name: pet_place_source_links pet_place_source_links_unique_provider_place; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."pet_place_source_links"
    ADD CONSTRAINT "pet_place_source_links_unique_provider_place" UNIQUE ("provider", "provider_place_id");


--
-- Name: pet_place_user_reports pet_place_user_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."pet_place_user_reports"
    ADD CONSTRAINT "pet_place_user_reports_pkey" PRIMARY KEY ("id");


--
-- Name: pet_place_verification_logs pet_place_verification_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."pet_place_verification_logs"
    ADD CONSTRAINT "pet_place_verification_logs_pkey" PRIMARY KEY ("id");


--
-- Name: pet_schedules pet_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."pet_schedules"
    ADD CONSTRAINT "pet_schedules_pkey" PRIMARY KEY ("id");


--
-- Name: pet_travel_pet_policies pet_travel_pet_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."pet_travel_pet_policies"
    ADD CONSTRAINT "pet_travel_pet_policies_pkey" PRIMARY KEY ("id");


--
-- Name: pet_travel_places pet_travel_places_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."pet_travel_places"
    ADD CONSTRAINT "pet_travel_places_pkey" PRIMARY KEY ("id");


--
-- Name: pet_travel_user_reports pet_travel_user_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."pet_travel_user_reports"
    ADD CONSTRAINT "pet_travel_user_reports_pkey" PRIMARY KEY ("id");


--
-- Name: pet_travel_user_reports pet_travel_user_reports_unique_user_place_type; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."pet_travel_user_reports"
    ADD CONSTRAINT "pet_travel_user_reports_unique_user_place_type" UNIQUE ("place_id", "user_id", "report_type");


--
-- Name: pets pets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."pets"
    ADD CONSTRAINT "pets_pkey" PRIMARY KEY ("id");


--
-- Name: posts posts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_pkey" PRIMARY KEY ("id");


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("user_id");


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_pkey" PRIMARY KEY ("id");


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");


--
-- Name: comment_likes uq_comment_likes_comment_user; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."comment_likes"
    ADD CONSTRAINT "uq_comment_likes_comment_user" UNIQUE ("comment_id", "user_id");


--
-- Name: community_moderation_queue uq_community_moderation_queue_target; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."community_moderation_queue"
    ADD CONSTRAINT "uq_community_moderation_queue_target" UNIQUE ("target_type", "target_id");


--
-- Name: user_consent_history user_consent_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."user_consent_history"
    ADD CONSTRAINT "user_consent_history_pkey" PRIMARY KEY ("id");


--
-- Name: idx_account_deletion_cleanup_items_processing_started; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_account_deletion_cleanup_items_processing_started" ON "public"."account_deletion_cleanup_items" USING "btree" ("processing_started_at") WHERE ("processing_started_at" IS NOT NULL);


--
-- Name: idx_account_deletion_cleanup_items_request_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_account_deletion_cleanup_items_request_created" ON "public"."account_deletion_cleanup_items" USING "btree" ("request_id", "created_at");


--
-- Name: idx_account_deletion_cleanup_items_status_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_account_deletion_cleanup_items_status_created" ON "public"."account_deletion_cleanup_items" USING "btree" ("status", "created_at");


--
-- Name: idx_account_deletion_requests_status_requested; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_account_deletion_requests_status_requested" ON "public"."account_deletion_requests" USING "btree" ("status", "requested_at" DESC);


--
-- Name: idx_account_deletion_requests_user_requested; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_account_deletion_requests_user_requested" ON "public"."account_deletion_requests" USING "btree" ("user_id", "requested_at" DESC);


--
-- Name: idx_ai_messages_user_pet_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_ai_messages_user_pet_date" ON "public"."ai_messages" USING "btree" ("user_id", "pet_id", "date" DESC);


--
-- Name: idx_anniversaries_user_pet_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_anniversaries_user_pet_date" ON "public"."anniversaries" USING "btree" ("user_id", "pet_id", "date" DESC);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_audit_logs_created_at" ON "public"."audit_logs" USING "btree" ("created_at" DESC);


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_audit_logs_user_id" ON "public"."audit_logs" USING "btree" ("user_id", "created_at" DESC);


--
-- Name: idx_billing_events_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_billing_events_user" ON "public"."billing_events" USING "btree" ("user_id", "created_at" DESC);


--
-- Name: idx_comment_likes_comment; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_comment_likes_comment" ON "public"."comment_likes" USING "btree" ("comment_id", "created_at" DESC);


--
-- Name: idx_comment_likes_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_comment_likes_user" ON "public"."comment_likes" USING "btree" ("user_id", "created_at" DESC);


--
-- Name: idx_comments_parent_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_comments_parent_created_at" ON "public"."comments" USING "btree" ("parent_comment_id", "created_at", "id") WHERE ("parent_comment_id" IS NOT NULL);


--
-- Name: idx_comments_post_active_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_comments_post_active_created_at" ON "public"."comments" USING "btree" ("post_id", "created_at", "id") WHERE (("status" = 'active'::"text") AND ("deleted_at" IS NULL));


--
-- Name: idx_comments_post_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_comments_post_created_at" ON "public"."comments" USING "btree" ("post_id", "created_at");


--
-- Name: idx_comments_post_like_rank; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_comments_post_like_rank" ON "public"."comments" USING "btree" ("post_id", "like_count" DESC, "created_at", "id") WHERE (("parent_comment_id" IS NULL) AND ("status" = 'active'::"text") AND ("deleted_at" IS NULL));


--
-- Name: idx_comments_post_parent_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_comments_post_parent_created_at" ON "public"."comments" USING "btree" ("post_id", "parent_comment_id", "created_at", "id");


--
-- Name: idx_comments_user_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_comments_user_created_at" ON "public"."comments" USING "btree" ("user_id", "created_at" DESC, "id" DESC);


--
-- Name: idx_community_blocked_term_patterns_active_scope; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_community_blocked_term_patterns_active_scope" ON "public"."community_blocked_term_patterns" USING "btree" ("is_active", "target_type", "target_field");


--
-- Name: idx_community_blocked_terms_active_scope; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_community_blocked_terms_active_scope" ON "public"."community_blocked_terms" USING "btree" ("is_active", "target_type", "target_field", "match_mode");


--
-- Name: idx_community_image_assets_post; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_community_image_assets_post" ON "public"."community_image_assets" USING "btree" ("post_id", "upload_status", "created_at" DESC);


--
-- Name: idx_community_image_assets_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_community_image_assets_user" ON "public"."community_image_assets" USING "btree" ("user_id", "created_at" DESC);


--
-- Name: idx_community_moderation_actions_target; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_community_moderation_actions_target" ON "public"."community_moderation_actions" USING "btree" ("target_type", "target_id", "created_at" DESC);


--
-- Name: idx_community_moderation_queue_priority; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_community_moderation_queue_priority" ON "public"."community_moderation_queue" USING "btree" ("priority" DESC, "latest_reported_at" DESC, "created_at" DESC);


--
-- Name: idx_community_post_view_events_post_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_community_post_view_events_post_created_at" ON "public"."community_post_view_events" USING "btree" ("post_id", "created_at" DESC);


--
-- Name: idx_daily_recall_user_pet_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_daily_recall_user_pet_date" ON "public"."daily_recall" USING "btree" ("user_id", "pet_id", "date" DESC);


--
-- Name: idx_emotions_analyzed_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_emotions_analyzed_at" ON "public"."emotions" USING "btree" ("analyzed_at" DESC);


--
-- Name: idx_emotions_user_pet; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_emotions_user_pet" ON "public"."emotions" USING "btree" ("user_id", "pet_id");


--
-- Name: idx_letters_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_letters_created_at" ON "public"."letters" USING "btree" ("created_at" DESC);


--
-- Name: idx_letters_pet_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_letters_pet_id" ON "public"."letters" USING "btree" ("pet_id");


--
-- Name: idx_letters_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_letters_user_id" ON "public"."letters" USING "btree" ("user_id");


--
-- Name: idx_likes_post; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_likes_post" ON "public"."likes" USING "btree" ("post_id");


--
-- Name: idx_memories_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_memories_created_at" ON "public"."memories" USING "btree" ("created_at" DESC);


--
-- Name: idx_memories_image_urls_gin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_memories_image_urls_gin" ON "public"."memories" USING "gin" ("image_urls");


--
-- Name: idx_memories_occurred_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_memories_occurred_at" ON "public"."memories" USING "btree" ("occurred_at" DESC);


--
-- Name: idx_memories_pet_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_memories_pet_id" ON "public"."memories" USING "btree" ("pet_id");


--
-- Name: idx_memories_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_memories_user_id" ON "public"."memories" USING "btree" ("user_id");


--
-- Name: idx_memory_images_memory_id_ready_sort_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_memory_images_memory_id_ready_sort_order" ON "public"."memory_images" USING "btree" ("memory_id", "sort_order") WHERE (("status" = 'ready'::"public"."memory_image_status") AND ("timeline_thumb_path" IS NOT NULL));


--
-- Name: idx_memory_images_memory_id_sort_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_memory_images_memory_id_sort_order" ON "public"."memory_images" USING "btree" ("memory_id", "sort_order");


--
-- Name: idx_memory_images_pet_id_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_memory_images_pet_id_created_at" ON "public"."memory_images" USING "btree" ("pet_id", "created_at" DESC);


--
-- Name: idx_memory_images_status_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_memory_images_status_created_at" ON "public"."memory_images" USING "btree" ("status", "created_at");


--
-- Name: idx_memory_images_unique_timeline_thumb_path_not_null; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "idx_memory_images_unique_timeline_thumb_path_not_null" ON "public"."memory_images" USING "btree" ("timeline_thumb_path") WHERE ("timeline_thumb_path" IS NOT NULL);


--
-- Name: idx_memory_images_user_id_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_memory_images_user_id_created_at" ON "public"."memory_images" USING "btree" ("user_id", "created_at" DESC);


--
-- Name: idx_memory_images_worker_failed_retry; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_memory_images_worker_failed_retry" ON "public"."memory_images" USING "btree" ("status", "retry_count", "last_processed_at") WHERE ("status" = 'failed'::"public"."memory_image_status");


--
-- Name: idx_memory_images_worker_last_processed_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_memory_images_worker_last_processed_at" ON "public"."memory_images" USING "btree" ("last_processed_at") WHERE ("last_processed_at" IS NOT NULL);


--
-- Name: idx_memory_images_worker_pending; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_memory_images_worker_pending" ON "public"."memory_images" USING "btree" ("status", "created_at") WHERE ("status" = 'pending'::"public"."memory_image_status");


--
-- Name: idx_memory_images_worker_processing_started_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_memory_images_worker_processing_started_at" ON "public"."memory_images" USING "btree" ("processing_started_at") WHERE ("processing_started_at" IS NOT NULL);


--
-- Name: idx_notifications_user_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_notifications_user_created_at" ON "public"."notifications" USING "btree" ("user_id", "created_at" DESC);


--
-- Name: idx_pet_care_guide_events_guide_event_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_pet_care_guide_events_guide_event_type" ON "public"."pet_care_guide_events" USING "btree" ("guide_id", "event_type", "occurred_at" DESC);


--
-- Name: idx_pet_care_guide_events_pet_occurred; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_pet_care_guide_events_pet_occurred" ON "public"."pet_care_guide_events" USING "btree" ("pet_id", "occurred_at" DESC);


--
-- Name: idx_pet_care_guide_events_search_query; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_pet_care_guide_events_search_query" ON "public"."pet_care_guide_events" USING "gin" ("search_query" "public"."gin_trgm_ops");


--
-- Name: idx_pet_care_guide_events_user_occurred; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_pet_care_guide_events_user_occurred" ON "public"."pet_care_guide_events" USING "btree" ("user_id", "occurred_at" DESC);


--
-- Name: idx_pet_care_guides_publish_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_pet_care_guides_publish_order" ON "public"."pet_care_guides" USING "btree" ("is_active", "status", "priority" DESC, "sort_order", "published_at" DESC NULLS LAST) WHERE ("deleted_at" IS NULL);


--
-- Name: idx_pet_care_guides_search_document_gin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_pet_care_guides_search_document_gin" ON "public"."pet_care_guides" USING "gin" ("search_document");


--
-- Name: idx_pet_care_guides_search_keywords_gin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_pet_care_guides_search_keywords_gin" ON "public"."pet_care_guides" USING "gin" ("search_keywords");


--
-- Name: idx_pet_care_guides_tags_gin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_pet_care_guides_tags_gin" ON "public"."pet_care_guides" USING "gin" ("tags");


--
-- Name: idx_pet_care_guides_target_species_gin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_pet_care_guides_target_species_gin" ON "public"."pet_care_guides" USING "gin" ("target_species");


--
-- Name: idx_pet_care_guides_title_trgm; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_pet_care_guides_title_trgm" ON "public"."pet_care_guides" USING "gin" ("title" "public"."gin_trgm_ops");


--
-- Name: idx_pet_place_bookmarks_meta_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_pet_place_bookmarks_meta_created" ON "public"."pet_place_bookmarks" USING "btree" ("pet_place_meta_id", "created_at" DESC);


--
-- Name: idx_pet_place_bookmarks_user_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_pet_place_bookmarks_user_created" ON "public"."pet_place_bookmarks" USING "btree" ("user_id", "created_at" DESC);


--
-- Name: idx_pet_place_external_signals_meta_provider; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_pet_place_external_signals_meta_provider" ON "public"."pet_place_external_signals" USING "btree" ("pet_place_meta_id", "signal_provider", "signal_key");


--
-- Name: idx_pet_place_search_logs_query; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_pet_place_search_logs_query" ON "public"."pet_place_search_logs" USING "gin" ("to_tsvector"('"simple"'::"regconfig", COALESCE("query_text", ''::"text")));


--
-- Name: idx_pet_place_search_logs_session_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_pet_place_search_logs_session_created" ON "public"."pet_place_search_logs" USING "btree" ("session_id", "created_at" DESC);


--
-- Name: idx_pet_place_search_logs_user_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_pet_place_search_logs_user_created" ON "public"."pet_place_search_logs" USING "btree" ("user_id", "created_at" DESC);


--
-- Name: idx_pet_place_service_meta_coordinates; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_pet_place_service_meta_coordinates" ON "public"."pet_place_service_meta" USING "btree" ("latitude", "longitude");


--
-- Name: idx_pet_place_service_meta_primary_source; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "idx_pet_place_service_meta_primary_source" ON "public"."pet_place_service_meta" USING "btree" ("primary_source_provider", "primary_source_place_id") WHERE (("primary_source_provider" IS NOT NULL) AND ("primary_source_place_id" IS NOT NULL));


--
-- Name: idx_pet_place_service_meta_provider_place; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_pet_place_service_meta_provider_place" ON "public"."pet_place_service_meta" USING "btree" ("provider", "provider_place_id");


--
-- Name: idx_pet_place_service_meta_source_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_pet_place_service_meta_source_type" ON "public"."pet_place_service_meta" USING "btree" ("source_type", "updated_at" DESC);


--
-- Name: idx_pet_place_service_meta_verification_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_pet_place_service_meta_verification_status" ON "public"."pet_place_service_meta" USING "btree" ("verification_status", "updated_at" DESC);


--
-- Name: idx_pet_place_source_links_meta_provider; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_pet_place_source_links_meta_provider" ON "public"."pet_place_source_links" USING "btree" ("pet_place_meta_id", "provider");


--
-- Name: idx_pet_place_source_links_provider_place; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_pet_place_source_links_provider_place" ON "public"."pet_place_source_links" USING "btree" ("provider", "provider_place_id");


--
-- Name: idx_pet_place_user_reports_meta_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_pet_place_user_reports_meta_created" ON "public"."pet_place_user_reports" USING "btree" ("pet_place_meta_id", "created_at" DESC);


--
-- Name: idx_pet_place_user_reports_user_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_pet_place_user_reports_user_created" ON "public"."pet_place_user_reports" USING "btree" ("user_id", "created_at" DESC);


--
-- Name: idx_pet_place_verification_logs_actor_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_pet_place_verification_logs_actor_created" ON "public"."pet_place_verification_logs" USING "btree" ("actor_user_id", "created_at" DESC);


--
-- Name: idx_pet_place_verification_logs_meta_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_pet_place_verification_logs_meta_created" ON "public"."pet_place_verification_logs" USING "btree" ("pet_place_meta_id", "created_at" DESC);


--
-- Name: idx_pet_schedules_pet_id_category_starts_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_pet_schedules_pet_id_category_starts_at" ON "public"."pet_schedules" USING "btree" ("pet_id", "category", "starts_at");


--
-- Name: idx_pet_schedules_pet_id_completed_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_pet_schedules_pet_id_completed_at" ON "public"."pet_schedules" USING "btree" ("pet_id", "completed_at");


--
-- Name: idx_pet_schedules_pet_id_starts_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_pet_schedules_pet_id_starts_at" ON "public"."pet_schedules" USING "btree" ("pet_id", "starts_at");


--
-- Name: idx_pet_schedules_source_sync_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_pet_schedules_source_sync_status" ON "public"."pet_schedules" USING "btree" ("source", "sync_status");


--
-- Name: idx_pet_schedules_user_id_starts_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_pet_schedules_user_id_starts_at" ON "public"."pet_schedules" USING "btree" ("user_id", "starts_at");


--
-- Name: idx_pet_travel_pet_policies_active_source; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "idx_pet_travel_pet_policies_active_source" ON "public"."pet_travel_pet_policies" USING "btree" ("place_id", "source_type") WHERE ("is_active" = true);


--
-- Name: idx_pet_travel_pet_policies_place_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_pet_travel_pet_policies_place_created" ON "public"."pet_travel_pet_policies" USING "btree" ("place_id", "created_at" DESC);


--
-- Name: idx_pet_travel_pet_policies_source_updated; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_pet_travel_pet_policies_source_updated" ON "public"."pet_travel_pet_policies" USING "btree" ("source_type", "updated_at" DESC);


--
-- Name: idx_pet_travel_pet_policies_status_updated; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_pet_travel_pet_policies_status_updated" ON "public"."pet_travel_pet_policies" USING "btree" ("policy_status", "updated_at" DESC);


--
-- Name: idx_pet_travel_places_coordinates; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_pet_travel_places_coordinates" ON "public"."pet_travel_places" USING "btree" ("latitude", "longitude");


--
-- Name: idx_pet_travel_places_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_pet_travel_places_name" ON "public"."pet_travel_places" USING "btree" ("canonical_name");


--
-- Name: idx_pet_travel_places_primary_source; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "idx_pet_travel_places_primary_source" ON "public"."pet_travel_places" USING "btree" ("primary_source", "primary_source_place_id") WHERE (("primary_source" <> 'system'::"text") AND ("primary_source_place_id" IS NOT NULL));


--
-- Name: idx_pet_travel_places_type_updated; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_pet_travel_places_type_updated" ON "public"."pet_travel_places" USING "btree" ("place_type", "updated_at" DESC);


--
-- Name: idx_pet_travel_user_reports_place_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_pet_travel_user_reports_place_created" ON "public"."pet_travel_user_reports" USING "btree" ("place_id", "created_at" DESC);


--
-- Name: idx_pet_travel_user_reports_place_type_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_pet_travel_user_reports_place_type_status" ON "public"."pet_travel_user_reports" USING "btree" ("place_id", "report_type", "report_status");


--
-- Name: idx_pet_travel_user_reports_status_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_pet_travel_user_reports_status_created" ON "public"."pet_travel_user_reports" USING "btree" ("report_status", "created_at" DESC);


--
-- Name: idx_pet_travel_user_reports_user_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_pet_travel_user_reports_user_created" ON "public"."pet_travel_user_reports" USING "btree" ("user_id", "created_at" DESC);


--
-- Name: idx_pets_death_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_pets_death_date" ON "public"."pets" USING "btree" ("death_date");


--
-- Name: idx_pets_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_pets_user_id" ON "public"."pets" USING "btree" ("user_id");


--
-- Name: idx_pets_user_species_group; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_pets_user_species_group" ON "public"."pets" USING "btree" ("user_id", "species_group");


--
-- Name: idx_posts_active_public_feed; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_posts_active_public_feed" ON "public"."posts" USING "btree" ("created_at" DESC, "id" DESC) WHERE (("visibility" = 'public'::"public"."visibility") AND ("status" = 'active'::"text") AND ("deleted_at" IS NULL));


--
-- Name: idx_posts_category_active_public_feed; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_posts_category_active_public_feed" ON "public"."posts" USING "btree" ("category", "created_at" DESC, "id" DESC) WHERE (("visibility" = 'public'::"public"."visibility") AND ("status" = 'active'::"text") AND ("deleted_at" IS NULL));


--
-- Name: idx_posts_status_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_posts_status_created_at" ON "public"."posts" USING "btree" ("status", "created_at" DESC, "id" DESC);


--
-- Name: idx_posts_user_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_posts_user_created_at" ON "public"."posts" USING "btree" ("user_id", "created_at" DESC, "id" DESC) WHERE ("deleted_at" IS NULL);


--
-- Name: idx_posts_visibility_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_posts_visibility_created_at" ON "public"."posts" USING "btree" ("visibility", "created_at" DESC);


--
-- Name: idx_reports_status_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_reports_status_created_at" ON "public"."reports" USING "btree" ("status", "created_at" DESC);


--
-- Name: idx_reports_target; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_reports_target" ON "public"."reports" USING "btree" ("target_type", "target_id", "created_at" DESC);


--
-- Name: idx_subscriptions_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_subscriptions_user_id" ON "public"."subscriptions" USING "btree" ("user_id");


--
-- Name: idx_user_consent_history_anonymized_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_user_consent_history_anonymized_at" ON "public"."user_consent_history" USING "btree" ("anonymized_at" DESC);


--
-- Name: idx_user_consent_history_user_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_user_consent_history_user_created_at" ON "public"."user_consent_history" USING "btree" ("user_id", "created_at" DESC);


--
-- Name: uq_account_deletion_requests_active_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "uq_account_deletion_requests_active_user" ON "public"."account_deletion_requests" USING "btree" ("user_id") WHERE ("status" = ANY (ARRAY['requested'::"text", 'in_progress'::"text", 'db_deleted'::"text", 'cleanup_pending'::"text", 'completed_with_cleanup_pending'::"text", 'unknown_pending_confirmation'::"text"]));


--
-- Name: uq_account_deletion_requests_idempotency_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "uq_account_deletion_requests_idempotency_key" ON "public"."account_deletion_requests" USING "btree" ("idempotency_key") WHERE ("idempotency_key" IS NOT NULL);


--
-- Name: uq_community_blocked_term_patterns_rule; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "uq_community_blocked_term_patterns_rule" ON "public"."community_blocked_term_patterns" USING "btree" ("pattern", "target_type", "target_field");


--
-- Name: uq_community_blocked_terms_rule; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "uq_community_blocked_terms_rule" ON "public"."community_blocked_terms" USING "btree" ("public"."community_normalize_text"("term"), "target_type", "target_field", "match_mode");


--
-- Name: uq_community_post_view_events_guest_window; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "uq_community_post_view_events_guest_window" ON "public"."community_post_view_events" USING "btree" ("post_id", "guest_session_id", "dedupe_window_start") WHERE ("guest_session_id" IS NOT NULL);


--
-- Name: uq_community_post_view_events_user_window; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "uq_community_post_view_events_user_window" ON "public"."community_post_view_events" USING "btree" ("post_id", "viewer_user_id", "dedupe_window_start") WHERE ("viewer_user_id" IS NOT NULL);


--
-- Name: uq_pet_schedules_external_event; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "uq_pet_schedules_external_event" ON "public"."pet_schedules" USING "btree" ("user_id", "source", "external_calendar_id", "external_event_id") WHERE ("external_event_id" IS NOT NULL);


--
-- Name: uq_profiles_nickname; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "uq_profiles_nickname" ON "public"."profiles" USING "btree" ("nickname");


--
-- Name: uq_reports_reporter_target; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "uq_reports_reporter_target" ON "public"."reports" USING "btree" ("reporter_id", "target_type", "target_id");


--
-- Name: account_deletion_cleanup_items trg_account_deletion_cleanup_items_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_account_deletion_cleanup_items_updated_at" BEFORE UPDATE ON "public"."account_deletion_cleanup_items" FOR EACH ROW EXECUTE FUNCTION "public"."account_deletion_set_updated_at"();


--
-- Name: blocked_nicknames trg_blocked_nicknames_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_blocked_nicknames_updated_at" BEFORE UPDATE ON "public"."blocked_nicknames" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at_blocked_nicknames"();


--
-- Name: comments trg_cascade_comment_soft_delete; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_cascade_comment_soft_delete" AFTER UPDATE OF "deleted_at", "status" ON "public"."comments" FOR EACH ROW EXECUTE FUNCTION "public"."cascade_comment_soft_delete"();


--
-- Name: comments trg_comments_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_comments_updated_at" BEFORE UPDATE ON "public"."comments" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: community_blocked_term_patterns trg_community_blocked_term_patterns_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_community_blocked_term_patterns_updated_at" BEFORE UPDATE ON "public"."community_blocked_term_patterns" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: community_blocked_terms trg_community_blocked_terms_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_community_blocked_terms_updated_at" BEFORE UPDATE ON "public"."community_blocked_terms" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: comments trg_enforce_comment_thread_integrity; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_enforce_comment_thread_integrity" BEFORE INSERT OR UPDATE OF "parent_comment_id", "post_id" ON "public"."comments" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_comment_thread_integrity"();


--
-- Name: comments trg_guard_community_comment_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_guard_community_comment_insert" BEFORE INSERT ON "public"."comments" FOR EACH ROW EXECUTE FUNCTION "public"."guard_community_comment_insert"();


--
-- Name: comments trg_guard_community_comment_update; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_guard_community_comment_update" BEFORE UPDATE OF "content" ON "public"."comments" FOR EACH ROW EXECUTE FUNCTION "public"."guard_community_comment_update"();


--
-- Name: posts trg_guard_community_post_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_guard_community_post_insert" BEFORE INSERT ON "public"."posts" FOR EACH ROW EXECUTE FUNCTION "public"."guard_community_post_insert"();


--
-- Name: posts trg_guard_community_post_update; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_guard_community_post_update" BEFORE UPDATE OF "title", "content" ON "public"."posts" FOR EACH ROW EXECUTE FUNCTION "public"."guard_community_post_update"();


--
-- Name: reports trg_guard_community_report_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_guard_community_report_insert" BEFORE INSERT ON "public"."reports" FOR EACH ROW EXECUTE FUNCTION "public"."guard_community_report_insert"();


--
-- Name: memories trg_memories_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_memories_updated_at" BEFORE UPDATE ON "public"."memories" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: memory_images trg_memory_images_sync_owner; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_memory_images_sync_owner" BEFORE INSERT OR UPDATE OF "memory_id" ON "public"."memory_images" FOR EACH ROW EXECUTE FUNCTION "public"."sync_memory_image_owner_fields"();


--
-- Name: memory_images trg_memory_images_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_memory_images_updated_at" BEFORE UPDATE ON "public"."memory_images" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: pet_care_guides trg_pet_care_guides_search_document; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_pet_care_guides_search_document" BEFORE INSERT OR UPDATE OF "title", "summary", "body_preview", "tags", "species_keywords", "search_keywords", "category" ON "public"."pet_care_guides" FOR EACH ROW EXECUTE FUNCTION "public"."refresh_pet_care_guide_search_document"();


--
-- Name: pet_care_guides trg_pet_care_guides_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_pet_care_guides_updated_at" BEFORE UPDATE ON "public"."pet_care_guides" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: pet_place_bookmarks trg_pet_place_bookmarks_sync_counters; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_pet_place_bookmarks_sync_counters" AFTER INSERT OR DELETE OR UPDATE OF "pet_place_meta_id" ON "public"."pet_place_bookmarks" FOR EACH ROW EXECUTE FUNCTION "public"."sync_pet_place_meta_counters"();


--
-- Name: pet_place_bookmarks trg_pet_place_bookmarks_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_pet_place_bookmarks_updated_at" BEFORE UPDATE ON "public"."pet_place_bookmarks" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: pet_place_external_signals trg_pet_place_external_signals_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_pet_place_external_signals_updated_at" BEFORE UPDATE ON "public"."pet_place_external_signals" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: pet_place_service_meta trg_pet_place_service_meta_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_pet_place_service_meta_updated_at" BEFORE UPDATE ON "public"."pet_place_service_meta" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: pet_place_source_links trg_pet_place_source_links_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_pet_place_source_links_updated_at" BEFORE UPDATE ON "public"."pet_place_source_links" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: pet_place_user_reports trg_pet_place_user_reports_sync_counters; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_pet_place_user_reports_sync_counters" AFTER INSERT OR DELETE OR UPDATE OF "pet_place_meta_id" ON "public"."pet_place_user_reports" FOR EACH ROW EXECUTE FUNCTION "public"."sync_pet_place_meta_counters"();


--
-- Name: pet_place_user_reports trg_pet_place_user_reports_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_pet_place_user_reports_updated_at" BEFORE UPDATE ON "public"."pet_place_user_reports" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: pet_schedules trg_pet_schedules_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_pet_schedules_updated_at" BEFORE UPDATE ON "public"."pet_schedules" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: pet_travel_pet_policies trg_pet_travel_pet_policies_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_pet_travel_pet_policies_updated_at" BEFORE UPDATE ON "public"."pet_travel_pet_policies" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: pet_travel_places trg_pet_travel_places_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_pet_travel_places_updated_at" BEFORE UPDATE ON "public"."pet_travel_places" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: pet_travel_user_reports trg_pet_travel_user_reports_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_pet_travel_user_reports_updated_at" BEFORE UPDATE ON "public"."pet_travel_user_reports" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: pets trg_pets_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_pets_updated_at" BEFORE UPDATE ON "public"."pets" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: posts trg_posts_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_posts_updated_at" BEFORE UPDATE ON "public"."posts" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: profiles trg_profiles_nickname_policy; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_profiles_nickname_policy" BEFORE INSERT OR UPDATE OF "nickname" ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_profile_nickname_policy"();


--
-- Name: profiles trg_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: comment_likes trg_sync_comment_like_count; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_sync_comment_like_count" AFTER INSERT OR DELETE ON "public"."comment_likes" FOR EACH ROW EXECUTE FUNCTION "public"."sync_comment_like_count"();


--
-- Name: comments trg_sync_comment_reply_count; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_sync_comment_reply_count" AFTER INSERT OR DELETE OR UPDATE OF "parent_comment_id", "deleted_at", "status" ON "public"."comments" FOR EACH ROW EXECUTE FUNCTION "public"."sync_comment_reply_count"();


--
-- Name: posts trg_sync_community_post_image_assets; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_sync_community_post_image_assets" AFTER INSERT OR UPDATE OF "image_url", "image_urls", "status", "deleted_at" ON "public"."posts" FOR EACH ROW EXECUTE FUNCTION "public"."sync_community_post_image_assets"();


--
-- Name: reports trg_sync_community_report_change; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_sync_community_report_change" AFTER INSERT OR DELETE OR UPDATE ON "public"."reports" FOR EACH ROW EXECUTE FUNCTION "public"."sync_community_report_change"();


--
-- Name: comments trg_sync_post_comment_count; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_sync_post_comment_count" AFTER INSERT OR DELETE OR UPDATE OF "deleted_at", "status" ON "public"."comments" FOR EACH ROW EXECUTE FUNCTION "public"."sync_post_comment_count"();


--
-- Name: likes trg_sync_post_like_count; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_sync_post_like_count" AFTER INSERT OR DELETE ON "public"."likes" FOR EACH ROW EXECUTE FUNCTION "public"."sync_post_like_count"();


--
-- Name: reports trg_sync_post_report_count; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_sync_post_report_count" AFTER INSERT OR DELETE ON "public"."reports" FOR EACH ROW EXECUTE FUNCTION "public"."sync_post_report_count"();


--
-- Name: account_deletion_cleanup_items account_deletion_cleanup_items_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."account_deletion_cleanup_items"
    ADD CONSTRAINT "account_deletion_cleanup_items_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."account_deletion_requests"("id") ON DELETE CASCADE;


--
-- Name: ai_messages ai_messages_pet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."ai_messages"
    ADD CONSTRAINT "ai_messages_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE;


--
-- Name: ai_messages ai_messages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."ai_messages"
    ADD CONSTRAINT "ai_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: anniversaries anniversaries_pet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."anniversaries"
    ADD CONSTRAINT "anniversaries_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE;


--
-- Name: anniversaries anniversaries_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."anniversaries"
    ADD CONSTRAINT "anniversaries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;


--
-- Name: billing_events billing_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."billing_events"
    ADD CONSTRAINT "billing_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: comment_likes comment_likes_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."comment_likes"
    ADD CONSTRAINT "comment_likes_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE CASCADE;


--
-- Name: comment_likes comment_likes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."comment_likes"
    ADD CONSTRAINT "comment_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: comments comments_parent_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "public"."comments"("id") ON DELETE CASCADE;


--
-- Name: comments comments_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;


--
-- Name: comments comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: community_image_assets community_image_assets_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."community_image_assets"
    ADD CONSTRAINT "community_image_assets_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE SET NULL;


--
-- Name: community_image_assets community_image_assets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."community_image_assets"
    ADD CONSTRAINT "community_image_assets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;


--
-- Name: community_moderation_actions community_moderation_actions_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."community_moderation_actions"
    ADD CONSTRAINT "community_moderation_actions_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;


--
-- Name: community_moderation_actions community_moderation_actions_source_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."community_moderation_actions"
    ADD CONSTRAINT "community_moderation_actions_source_report_id_fkey" FOREIGN KEY ("source_report_id") REFERENCES "public"."reports"("id") ON DELETE SET NULL;


--
-- Name: community_moderation_queue community_moderation_queue_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."community_moderation_queue"
    ADD CONSTRAINT "community_moderation_queue_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "auth"."users"("id") ON DELETE SET NULL;


--
-- Name: community_post_view_events community_post_view_events_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."community_post_view_events"
    ADD CONSTRAINT "community_post_view_events_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;


--
-- Name: community_post_view_events community_post_view_events_viewer_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."community_post_view_events"
    ADD CONSTRAINT "community_post_view_events_viewer_user_id_fkey" FOREIGN KEY ("viewer_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: community_reporter_flags community_reporter_flags_reporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."community_reporter_flags"
    ADD CONSTRAINT "community_reporter_flags_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: daily_recall daily_recall_memory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."daily_recall"
    ADD CONSTRAINT "daily_recall_memory_id_fkey" FOREIGN KEY ("memory_id") REFERENCES "public"."memories"("id") ON DELETE SET NULL;


--
-- Name: daily_recall daily_recall_pet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."daily_recall"
    ADD CONSTRAINT "daily_recall_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE;


--
-- Name: daily_recall daily_recall_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."daily_recall"
    ADD CONSTRAINT "daily_recall_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: emotions emotions_memory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."emotions"
    ADD CONSTRAINT "emotions_memory_id_fkey" FOREIGN KEY ("memory_id") REFERENCES "public"."memories"("id") ON DELETE SET NULL;


--
-- Name: emotions emotions_pet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."emotions"
    ADD CONSTRAINT "emotions_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE;


--
-- Name: emotions emotions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."emotions"
    ADD CONSTRAINT "emotions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: letters letters_pet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."letters"
    ADD CONSTRAINT "letters_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE;


--
-- Name: letters letters_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."letters"
    ADD CONSTRAINT "letters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: likes likes_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;


--
-- Name: likes likes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: memories memories_pet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."memories"
    ADD CONSTRAINT "memories_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE;


--
-- Name: memories memories_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."memories"
    ADD CONSTRAINT "memories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: memory_images memory_images_memory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."memory_images"
    ADD CONSTRAINT "memory_images_memory_id_fkey" FOREIGN KEY ("memory_id") REFERENCES "public"."memories"("id") ON DELETE CASCADE;


--
-- Name: memory_images memory_images_pet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."memory_images"
    ADD CONSTRAINT "memory_images_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE;


--
-- Name: memory_images memory_images_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."memory_images"
    ADD CONSTRAINT "memory_images_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: pet_care_guide_events pet_care_guide_events_guide_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."pet_care_guide_events"
    ADD CONSTRAINT "pet_care_guide_events_guide_id_fkey" FOREIGN KEY ("guide_id") REFERENCES "public"."pet_care_guides"("id") ON DELETE CASCADE;


--
-- Name: pet_care_guide_events pet_care_guide_events_pet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."pet_care_guide_events"
    ADD CONSTRAINT "pet_care_guide_events_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE SET NULL;


--
-- Name: pet_care_guide_events pet_care_guide_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."pet_care_guide_events"
    ADD CONSTRAINT "pet_care_guide_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;


--
-- Name: pet_care_guides pet_care_guides_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."pet_care_guides"
    ADD CONSTRAINT "pet_care_guides_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;


--
-- Name: pet_care_guides pet_care_guides_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."pet_care_guides"
    ADD CONSTRAINT "pet_care_guides_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;


--
-- Name: pet_place_bookmarks pet_place_bookmarks_pet_place_meta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."pet_place_bookmarks"
    ADD CONSTRAINT "pet_place_bookmarks_pet_place_meta_id_fkey" FOREIGN KEY ("pet_place_meta_id") REFERENCES "public"."pet_place_service_meta"("id") ON DELETE CASCADE;


--
-- Name: pet_place_bookmarks pet_place_bookmarks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."pet_place_bookmarks"
    ADD CONSTRAINT "pet_place_bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: pet_place_external_signals pet_place_external_signals_pet_place_meta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."pet_place_external_signals"
    ADD CONSTRAINT "pet_place_external_signals_pet_place_meta_id_fkey" FOREIGN KEY ("pet_place_meta_id") REFERENCES "public"."pet_place_service_meta"("id") ON DELETE CASCADE;


--
-- Name: pet_place_search_logs pet_place_search_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."pet_place_search_logs"
    ADD CONSTRAINT "pet_place_search_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: pet_place_source_links pet_place_source_links_pet_place_meta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."pet_place_source_links"
    ADD CONSTRAINT "pet_place_source_links_pet_place_meta_id_fkey" FOREIGN KEY ("pet_place_meta_id") REFERENCES "public"."pet_place_service_meta"("id") ON DELETE CASCADE;


--
-- Name: pet_place_user_reports pet_place_user_reports_pet_place_meta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."pet_place_user_reports"
    ADD CONSTRAINT "pet_place_user_reports_pet_place_meta_id_fkey" FOREIGN KEY ("pet_place_meta_id") REFERENCES "public"."pet_place_service_meta"("id") ON DELETE CASCADE;


--
-- Name: pet_place_user_reports pet_place_user_reports_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."pet_place_user_reports"
    ADD CONSTRAINT "pet_place_user_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: pet_place_verification_logs pet_place_verification_logs_actor_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."pet_place_verification_logs"
    ADD CONSTRAINT "pet_place_verification_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;


--
-- Name: pet_place_verification_logs pet_place_verification_logs_pet_place_meta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."pet_place_verification_logs"
    ADD CONSTRAINT "pet_place_verification_logs_pet_place_meta_id_fkey" FOREIGN KEY ("pet_place_meta_id") REFERENCES "public"."pet_place_service_meta"("id") ON DELETE CASCADE;


--
-- Name: pet_schedules pet_schedules_linked_memory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."pet_schedules"
    ADD CONSTRAINT "pet_schedules_linked_memory_id_fkey" FOREIGN KEY ("linked_memory_id") REFERENCES "public"."memories"("id") ON DELETE SET NULL;


--
-- Name: pet_schedules pet_schedules_pet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."pet_schedules"
    ADD CONSTRAINT "pet_schedules_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE;


--
-- Name: pet_schedules pet_schedules_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."pet_schedules"
    ADD CONSTRAINT "pet_schedules_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: pet_travel_pet_policies pet_travel_pet_policies_actor_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."pet_travel_pet_policies"
    ADD CONSTRAINT "pet_travel_pet_policies_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;


--
-- Name: pet_travel_pet_policies pet_travel_pet_policies_place_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."pet_travel_pet_policies"
    ADD CONSTRAINT "pet_travel_pet_policies_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "public"."pet_travel_places"("id") ON DELETE CASCADE;


--
-- Name: pet_travel_user_reports pet_travel_user_reports_place_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."pet_travel_user_reports"
    ADD CONSTRAINT "pet_travel_user_reports_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "public"."pet_travel_places"("id") ON DELETE CASCADE;


--
-- Name: pet_travel_user_reports pet_travel_user_reports_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."pet_travel_user_reports"
    ADD CONSTRAINT "pet_travel_user_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: pets pets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."pets"
    ADD CONSTRAINT "pets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: posts posts_moderated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_moderated_by_fkey" FOREIGN KEY ("moderated_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;


--
-- Name: posts posts_pet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE SET NULL;


--
-- Name: posts posts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: reports reports_reporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: reports reports_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;


--
-- Name: subscriptions subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: user_consent_history user_consent_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."user_consent_history"
    ADD CONSTRAINT "user_consent_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: account_deletion_cleanup_items; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."account_deletion_cleanup_items" ENABLE ROW LEVEL SECURITY;

--
-- Name: account_deletion_requests; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."account_deletion_requests" ENABLE ROW LEVEL SECURITY;

--
-- Name: account_deletion_requests account_deletion_requests_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "account_deletion_requests_select_own" ON "public"."account_deletion_requests" FOR SELECT USING (("auth"."uid"() = "user_id"));


--
-- Name: ai_messages; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."ai_messages" ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_messages ai_messages_crud_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "ai_messages_crud_own" ON "public"."ai_messages" USING ((("auth"."uid"() = "user_id") AND "public"."owns_pet"("pet_id"))) WITH CHECK ((("auth"."uid"() = "user_id") AND "public"."owns_pet"("pet_id")));


--
-- Name: anniversaries; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."anniversaries" ENABLE ROW LEVEL SECURITY;

--
-- Name: anniversaries anniversaries_crud_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "anniversaries_crud_own" ON "public"."anniversaries" USING ((("auth"."uid"() = "user_id") AND "public"."owns_pet"("pet_id"))) WITH CHECK ((("auth"."uid"() = "user_id") AND "public"."owns_pet"("pet_id")));


--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs audit_logs_select_own_or_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "audit_logs_select_own_or_admin" ON "public"."audit_logs" FOR SELECT USING (("public"."is_community_admin"() OR ("auth"."uid"() = "user_id")));


--
-- Name: billing_events; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."billing_events" ENABLE ROW LEVEL SECURITY;

--
-- Name: billing_events billing_events_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "billing_events_select_own" ON "public"."billing_events" FOR SELECT USING (("auth"."uid"() = "user_id"));


--
-- Name: blocked_nickname_patterns; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."blocked_nickname_patterns" ENABLE ROW LEVEL SECURITY;

--
-- Name: blocked_nickname_patterns blocked_nickname_patterns_select_authenticated; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "blocked_nickname_patterns_select_authenticated" ON "public"."blocked_nickname_patterns" FOR SELECT TO "authenticated" USING (true);


--
-- Name: blocked_nicknames; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."blocked_nicknames" ENABLE ROW LEVEL SECURITY;

--
-- Name: blocked_nicknames blocked_nicknames_select_authenticated; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "blocked_nicknames_select_authenticated" ON "public"."blocked_nicknames" FOR SELECT TO "authenticated" USING (true);


--
-- Name: comment_likes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."comment_likes" ENABLE ROW LEVEL SECURITY;

--
-- Name: comment_likes comment_likes_delete_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "comment_likes_delete_own" ON "public"."comment_likes" FOR DELETE USING ((("auth"."uid"() = "user_id") OR "public"."is_community_admin"()));


--
-- Name: comment_likes comment_likes_insert_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "comment_likes_insert_own" ON "public"."comment_likes" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND (EXISTS ( SELECT 1
   FROM ("public"."comments" "c"
     JOIN "public"."posts" "p" ON (("p"."id" = "c"."post_id")))
  WHERE (("c"."id" = "comment_likes"."comment_id") AND ("c"."deleted_at" IS NULL) AND ("c"."status" = 'active'::"text") AND ("public"."is_community_admin"() OR ("p"."user_id" = "auth"."uid"()) OR (("p"."visibility" = 'public'::"public"."visibility") AND ("p"."status" = 'active'::"text") AND ("p"."deleted_at" IS NULL))))))));


--
-- Name: comment_likes comment_likes_select_by_comment_visibility; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "comment_likes_select_by_comment_visibility" ON "public"."comment_likes" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM ("public"."comments" "c"
     JOIN "public"."posts" "p" ON (("p"."id" = "c"."post_id")))
  WHERE (("c"."id" = "comment_likes"."comment_id") AND ("c"."deleted_at" IS NULL) AND ("c"."status" = 'active'::"text") AND ("public"."is_community_admin"() OR ("p"."user_id" = "auth"."uid"()) OR (("p"."visibility" = 'public'::"public"."visibility") AND ("p"."status" = 'active'::"text") AND ("p"."deleted_at" IS NULL)))))) OR ("user_id" = "auth"."uid"())));


--
-- Name: comments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."comments" ENABLE ROW LEVEL SECURITY;

--
-- Name: comments comments_delete_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "comments_delete_own" ON "public"."comments" FOR DELETE USING ((("auth"."uid"() = "user_id") OR "public"."is_community_admin"()));


--
-- Name: comments comments_insert_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "comments_insert_own" ON "public"."comments" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND "public"."can_insert_community_comment"("post_id", "parent_comment_id")));


--
-- Name: comments comments_select_by_post_visibility; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "comments_select_by_post_visibility" ON "public"."comments" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."posts" "p"
  WHERE (("p"."id" = "comments"."post_id") AND ("public"."is_community_admin"() OR ("p"."user_id" = "auth"."uid"()) OR (("p"."visibility" = 'public'::"public"."visibility") AND ("p"."status" = 'active'::"text") AND ("p"."deleted_at" IS NULL)))))) OR ("user_id" = "auth"."uid"())));


--
-- Name: comments comments_update_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "comments_update_own" ON "public"."comments" FOR UPDATE USING ((("auth"."uid"() = "user_id") OR "public"."is_community_admin"())) WITH CHECK ((("auth"."uid"() = "user_id") OR "public"."is_community_admin"()));


--
-- Name: community_blocked_term_patterns; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."community_blocked_term_patterns" ENABLE ROW LEVEL SECURITY;

--
-- Name: community_blocked_term_patterns community_blocked_term_patterns_select_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "community_blocked_term_patterns_select_admin" ON "public"."community_blocked_term_patterns" FOR SELECT USING ("public"."is_community_admin"());


--
-- Name: community_blocked_terms; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."community_blocked_terms" ENABLE ROW LEVEL SECURITY;

--
-- Name: community_blocked_terms community_blocked_terms_select_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "community_blocked_terms_select_admin" ON "public"."community_blocked_terms" FOR SELECT USING ("public"."is_community_admin"());


--
-- Name: community_image_assets; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."community_image_assets" ENABLE ROW LEVEL SECURITY;

--
-- Name: community_image_assets community_image_assets_select_own_or_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "community_image_assets_select_own_or_admin" ON "public"."community_image_assets" FOR SELECT USING (("public"."is_community_admin"() OR ("auth"."uid"() = "user_id")));


--
-- Name: community_moderation_actions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."community_moderation_actions" ENABLE ROW LEVEL SECURITY;

--
-- Name: community_moderation_actions community_moderation_actions_admin_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "community_moderation_actions_admin_select" ON "public"."community_moderation_actions" FOR SELECT USING ("public"."is_community_admin"());


--
-- Name: community_moderation_queue; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."community_moderation_queue" ENABLE ROW LEVEL SECURITY;

--
-- Name: community_moderation_queue community_moderation_queue_admin_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "community_moderation_queue_admin_select" ON "public"."community_moderation_queue" FOR SELECT USING ("public"."is_community_admin"());


--
-- Name: community_moderation_queue community_moderation_queue_admin_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "community_moderation_queue_admin_update" ON "public"."community_moderation_queue" FOR UPDATE USING ("public"."is_community_admin"()) WITH CHECK ("public"."is_community_admin"());


--
-- Name: community_post_view_events; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."community_post_view_events" ENABLE ROW LEVEL SECURITY;

--
-- Name: community_post_view_events community_post_view_events_select_own_or_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "community_post_view_events_select_own_or_admin" ON "public"."community_post_view_events" FOR SELECT USING (("public"."is_community_admin"() OR ("auth"."uid"() = "viewer_user_id")));


--
-- Name: community_reporter_flags; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."community_reporter_flags" ENABLE ROW LEVEL SECURITY;

--
-- Name: community_reporter_flags community_reporter_flags_admin_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "community_reporter_flags_admin_select" ON "public"."community_reporter_flags" FOR SELECT USING ("public"."is_community_admin"());


--
-- Name: community_reporter_flags community_reporter_flags_admin_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "community_reporter_flags_admin_update" ON "public"."community_reporter_flags" FOR UPDATE USING ("public"."is_community_admin"()) WITH CHECK ("public"."is_community_admin"());


--
-- Name: daily_recall; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."daily_recall" ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_recall daily_recall_crud_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "daily_recall_crud_own" ON "public"."daily_recall" USING ((("auth"."uid"() = "user_id") AND "public"."owns_pet"("pet_id"))) WITH CHECK ((("auth"."uid"() = "user_id") AND "public"."owns_pet"("pet_id")));


--
-- Name: emotions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."emotions" ENABLE ROW LEVEL SECURITY;

--
-- Name: emotions emotions_crud_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "emotions_crud_own" ON "public"."emotions" USING ((("auth"."uid"() = "user_id") AND "public"."owns_pet"("pet_id"))) WITH CHECK ((("auth"."uid"() = "user_id") AND "public"."owns_pet"("pet_id")));


--
-- Name: letters; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."letters" ENABLE ROW LEVEL SECURITY;

--
-- Name: letters letters_crud_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "letters_crud_own" ON "public"."letters" USING ((("auth"."uid"() = "user_id") AND "public"."owns_pet"("pet_id"))) WITH CHECK ((("auth"."uid"() = "user_id") AND "public"."owns_pet"("pet_id")));


--
-- Name: likes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."likes" ENABLE ROW LEVEL SECURITY;

--
-- Name: likes likes_delete_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "likes_delete_own" ON "public"."likes" FOR DELETE USING ((("auth"."uid"() = "user_id") OR "public"."is_community_admin"()));


--
-- Name: likes likes_insert_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "likes_insert_own" ON "public"."likes" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: likes likes_select_by_post_visibility; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "likes_select_by_post_visibility" ON "public"."likes" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."posts" "p"
  WHERE (("p"."id" = "likes"."post_id") AND ("public"."is_community_admin"() OR ("p"."user_id" = "auth"."uid"()) OR (("p"."visibility" = 'public'::"public"."visibility") AND ("p"."status" = 'active'::"text") AND ("p"."deleted_at" IS NULL)))))) OR ("user_id" = "auth"."uid"())));


--
-- Name: memories; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."memories" ENABLE ROW LEVEL SECURITY;

--
-- Name: memories memories_crud_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "memories_crud_own" ON "public"."memories" USING ((("auth"."uid"() = "user_id") AND "public"."owns_pet"("pet_id"))) WITH CHECK ((("auth"."uid"() = "user_id") AND "public"."owns_pet"("pet_id")));


--
-- Name: memory_images; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."memory_images" ENABLE ROW LEVEL SECURITY;

--
-- Name: memory_images memory_images_crud_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "memory_images_crud_own" ON "public"."memory_images" USING ((("auth"."uid"() = "user_id") AND "public"."owns_pet"("pet_id"))) WITH CHECK ((("auth"."uid"() = "user_id") AND "public"."owns_pet"("pet_id")));


--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications notifications_crud_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "notifications_crud_own" ON "public"."notifications" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: pet_care_guide_events; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."pet_care_guide_events" ENABLE ROW LEVEL SECURITY;

--
-- Name: pet_care_guide_events pet_care_guide_events_admin_manage; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "pet_care_guide_events_admin_manage" ON "public"."pet_care_guide_events" TO "authenticated" USING ("public"."is_guide_admin"()) WITH CHECK ("public"."is_guide_admin"());


--
-- Name: pet_care_guide_events pet_care_guide_events_insert_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "pet_care_guide_events_insert_own" ON "public"."pet_care_guide_events" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) AND (("pet_id" IS NULL) OR (EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "pet_care_guide_events"."pet_id") AND ("p"."user_id" = "auth"."uid"())))))));


--
-- Name: pet_care_guide_events pet_care_guide_events_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "pet_care_guide_events_select_own" ON "public"."pet_care_guide_events" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."is_guide_admin"()));


--
-- Name: pet_care_guides; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."pet_care_guides" ENABLE ROW LEVEL SECURITY;

--
-- Name: pet_care_guides pet_care_guides_admin_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "pet_care_guides_admin_all" ON "public"."pet_care_guides" TO "authenticated" USING ("public"."is_guide_admin"()) WITH CHECK ("public"."is_guide_admin"());


--
-- Name: pet_care_guides pet_care_guides_public_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "pet_care_guides_public_read" ON "public"."pet_care_guides" FOR SELECT TO "authenticated" USING ((("deleted_at" IS NULL) AND ("is_active" = true) AND ("status" = 'published'::"public"."guide_content_status") AND (("published_at" IS NULL) OR ("published_at" <= "timezone"('utc'::"text", "now"())))));


--
-- Name: pet_place_bookmarks; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."pet_place_bookmarks" ENABLE ROW LEVEL SECURITY;

--
-- Name: pet_place_bookmarks pet_place_bookmarks_delete_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "pet_place_bookmarks_delete_own" ON "public"."pet_place_bookmarks" FOR DELETE TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."is_pet_place_admin"()));


--
-- Name: pet_place_bookmarks pet_place_bookmarks_insert_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "pet_place_bookmarks_insert_own" ON "public"."pet_place_bookmarks" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));


--
-- Name: pet_place_bookmarks pet_place_bookmarks_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "pet_place_bookmarks_select_own" ON "public"."pet_place_bookmarks" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."is_pet_place_admin"()));


--
-- Name: pet_place_bookmarks pet_place_bookmarks_update_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "pet_place_bookmarks_update_own" ON "public"."pet_place_bookmarks" FOR UPDATE TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."is_pet_place_admin"())) WITH CHECK ((("user_id" = "auth"."uid"()) OR "public"."is_pet_place_admin"()));


--
-- Name: pet_place_external_signals; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."pet_place_external_signals" ENABLE ROW LEVEL SECURITY;

--
-- Name: pet_place_external_signals pet_place_external_signals_admin_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "pet_place_external_signals_admin_all" ON "public"."pet_place_external_signals" TO "authenticated" USING ("public"."is_pet_place_admin"()) WITH CHECK ("public"."is_pet_place_admin"());


--
-- Name: pet_place_external_signals pet_place_external_signals_read_public; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "pet_place_external_signals_read_public" ON "public"."pet_place_external_signals" FOR SELECT TO "authenticated", "anon" USING (true);


--
-- Name: pet_place_search_logs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."pet_place_search_logs" ENABLE ROW LEVEL SECURITY;

--
-- Name: pet_place_search_logs pet_place_search_logs_insert_authenticated; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "pet_place_search_logs_insert_authenticated" ON "public"."pet_place_search_logs" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_pet_place_admin"() OR ("user_id" = "auth"."uid"()) OR (("user_id" IS NULL) AND ("session_id" IS NOT NULL))));


--
-- Name: pet_place_search_logs pet_place_search_logs_insert_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "pet_place_search_logs_insert_own" ON "public"."pet_place_search_logs" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));


--
-- Name: pet_place_search_logs pet_place_search_logs_select_own_or_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "pet_place_search_logs_select_own_or_admin" ON "public"."pet_place_search_logs" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."is_pet_place_admin"()));


--
-- Name: pet_place_service_meta; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."pet_place_service_meta" ENABLE ROW LEVEL SECURITY;

--
-- Name: pet_place_service_meta pet_place_service_meta_admin_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "pet_place_service_meta_admin_all" ON "public"."pet_place_service_meta" TO "authenticated" USING ("public"."is_pet_place_admin"()) WITH CHECK ("public"."is_pet_place_admin"());


--
-- Name: pet_place_service_meta pet_place_service_meta_read_authenticated; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "pet_place_service_meta_read_authenticated" ON "public"."pet_place_service_meta" FOR SELECT TO "authenticated" USING (true);


--
-- Name: pet_place_service_meta pet_place_service_meta_read_public; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "pet_place_service_meta_read_public" ON "public"."pet_place_service_meta" FOR SELECT TO "authenticated", "anon" USING (true);


--
-- Name: pet_place_source_links; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."pet_place_source_links" ENABLE ROW LEVEL SECURITY;

--
-- Name: pet_place_source_links pet_place_source_links_admin_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "pet_place_source_links_admin_all" ON "public"."pet_place_source_links" TO "authenticated" USING ("public"."is_pet_place_admin"()) WITH CHECK ("public"."is_pet_place_admin"());


--
-- Name: pet_place_source_links pet_place_source_links_read_public; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "pet_place_source_links_read_public" ON "public"."pet_place_source_links" FOR SELECT TO "authenticated", "anon" USING (true);


--
-- Name: pet_place_user_reports; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."pet_place_user_reports" ENABLE ROW LEVEL SECURITY;

--
-- Name: pet_place_user_reports pet_place_user_reports_delete_own_or_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "pet_place_user_reports_delete_own_or_admin" ON "public"."pet_place_user_reports" FOR DELETE TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."is_pet_place_admin"()));


--
-- Name: pet_place_user_reports pet_place_user_reports_insert_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "pet_place_user_reports_insert_own" ON "public"."pet_place_user_reports" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));


--
-- Name: pet_place_user_reports pet_place_user_reports_select_own_or_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "pet_place_user_reports_select_own_or_admin" ON "public"."pet_place_user_reports" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."is_pet_place_admin"()));


--
-- Name: pet_place_user_reports pet_place_user_reports_update_own_or_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "pet_place_user_reports_update_own_or_admin" ON "public"."pet_place_user_reports" FOR UPDATE TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."is_pet_place_admin"())) WITH CHECK ((("user_id" = "auth"."uid"()) OR "public"."is_pet_place_admin"()));


--
-- Name: pet_place_verification_logs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."pet_place_verification_logs" ENABLE ROW LEVEL SECURITY;

--
-- Name: pet_place_verification_logs pet_place_verification_logs_insert_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "pet_place_verification_logs_insert_admin" ON "public"."pet_place_verification_logs" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_pet_place_admin"());


--
-- Name: pet_place_verification_logs pet_place_verification_logs_select_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "pet_place_verification_logs_select_admin" ON "public"."pet_place_verification_logs" FOR SELECT TO "authenticated" USING ("public"."is_pet_place_admin"());


--
-- Name: pet_schedules; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."pet_schedules" ENABLE ROW LEVEL SECURITY;

--
-- Name: pet_schedules pet_schedules_crud_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "pet_schedules_crud_own" ON "public"."pet_schedules" USING ((("auth"."uid"() = "user_id") AND "public"."owns_pet"("pet_id"))) WITH CHECK ((("auth"."uid"() = "user_id") AND "public"."owns_pet"("pet_id")));


--
-- Name: pet_travel_pet_policies; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."pet_travel_pet_policies" ENABLE ROW LEVEL SECURITY;

--
-- Name: pet_travel_pet_policies pet_travel_pet_policies_admin_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "pet_travel_pet_policies_admin_all" ON "public"."pet_travel_pet_policies" TO "authenticated" USING ("public"."is_pet_travel_admin"()) WITH CHECK ("public"."is_pet_travel_admin"());


--
-- Name: pet_travel_pet_policies pet_travel_pet_policies_read_public; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "pet_travel_pet_policies_read_public" ON "public"."pet_travel_pet_policies" FOR SELECT TO "authenticated", "anon" USING (true);


--
-- Name: pet_travel_places; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."pet_travel_places" ENABLE ROW LEVEL SECURITY;

--
-- Name: pet_travel_places pet_travel_places_admin_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "pet_travel_places_admin_all" ON "public"."pet_travel_places" TO "authenticated" USING ("public"."is_pet_travel_admin"()) WITH CHECK ("public"."is_pet_travel_admin"());


--
-- Name: pet_travel_places pet_travel_places_read_public; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "pet_travel_places_read_public" ON "public"."pet_travel_places" FOR SELECT TO "authenticated", "anon" USING (true);


--
-- Name: pet_travel_user_reports; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."pet_travel_user_reports" ENABLE ROW LEVEL SECURITY;

--
-- Name: pet_travel_user_reports pet_travel_user_reports_delete_own_or_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "pet_travel_user_reports_delete_own_or_admin" ON "public"."pet_travel_user_reports" FOR DELETE TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."is_pet_travel_admin"()));


--
-- Name: pet_travel_user_reports pet_travel_user_reports_insert_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "pet_travel_user_reports_insert_own" ON "public"."pet_travel_user_reports" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));


--
-- Name: pet_travel_user_reports pet_travel_user_reports_select_own_or_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "pet_travel_user_reports_select_own_or_admin" ON "public"."pet_travel_user_reports" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."is_pet_travel_admin"()));


--
-- Name: pet_travel_user_reports pet_travel_user_reports_update_own_or_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "pet_travel_user_reports_update_own_or_admin" ON "public"."pet_travel_user_reports" FOR UPDATE TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."is_pet_travel_admin"())) WITH CHECK ((("user_id" = "auth"."uid"()) OR "public"."is_pet_travel_admin"()));


--
-- Name: pets; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."pets" ENABLE ROW LEVEL SECURITY;

--
-- Name: pets pets_crud_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "pets_crud_own" ON "public"."pets" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: posts; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."posts" ENABLE ROW LEVEL SECURITY;

--
-- Name: posts posts_delete_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "posts_delete_own" ON "public"."posts" FOR DELETE USING ((("auth"."uid"() = "user_id") OR "public"."is_community_admin"()));


--
-- Name: posts posts_insert_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "posts_insert_own" ON "public"."posts" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: posts posts_select_active_public; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "posts_select_active_public" ON "public"."posts" FOR SELECT USING (((("visibility" = 'public'::"public"."visibility") AND ("status" = 'active'::"text") AND ("deleted_at" IS NULL)) OR ("auth"."uid"() = "user_id") OR "public"."is_community_admin"()));


--
-- Name: posts posts_update_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "posts_update_own" ON "public"."posts" FOR UPDATE USING ((("auth"."uid"() = "user_id") OR "public"."is_community_admin"())) WITH CHECK ((("auth"."uid"() = "user_id") OR "public"."is_community_admin"()));


--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles profiles_insert_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "profiles_insert_own" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: profiles profiles_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "profiles_select_own" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "user_id"));


--
-- Name: profiles profiles_update_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "profiles_update_own" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: reports; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."reports" ENABLE ROW LEVEL SECURITY;

--
-- Name: reports reports_admin_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "reports_admin_update" ON "public"."reports" FOR UPDATE USING ("public"."is_community_admin"()) WITH CHECK ("public"."is_community_admin"());


--
-- Name: reports reports_insert_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "reports_insert_own" ON "public"."reports" FOR INSERT WITH CHECK (("auth"."uid"() = "reporter_id"));


--
-- Name: reports reports_select_own_or_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "reports_select_own_or_admin" ON "public"."reports" FOR SELECT USING ((("auth"."uid"() = "reporter_id") OR "public"."is_community_admin"()));


--
-- Name: subscriptions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;

--
-- Name: subscriptions subscriptions_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "subscriptions_select_own" ON "public"."subscriptions" FOR SELECT USING (("auth"."uid"() = "user_id"));


--
-- Name: user_consent_history; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."user_consent_history" ENABLE ROW LEVEL SECURITY;

--
-- Name: user_consent_history user_consent_history_insert_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "user_consent_history_insert_own" ON "public"."user_consent_history" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: user_consent_history user_consent_history_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "user_consent_history_select_own" ON "public"."user_consent_history" FOR SELECT USING (("auth"."uid"() = "user_id"));


--
-- Name: SCHEMA "public"; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";


--
-- Name: FUNCTION "account_deletion_column_exists"("p_schema" "text", "p_table" "text", "p_column" "text"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."account_deletion_column_exists"("p_schema" "text", "p_table" "text", "p_column" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."account_deletion_column_exists"("p_schema" "text", "p_table" "text", "p_column" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."account_deletion_column_exists"("p_schema" "text", "p_table" "text", "p_column" "text") TO "service_role";


--
-- Name: FUNCTION "account_deletion_set_updated_at"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."account_deletion_set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."account_deletion_set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."account_deletion_set_updated_at"() TO "service_role";


--
-- Name: FUNCTION "account_deletion_table_exists"("p_schema" "text", "p_table" "text"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."account_deletion_table_exists"("p_schema" "text", "p_table" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."account_deletion_table_exists"("p_schema" "text", "p_table" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."account_deletion_table_exists"("p_schema" "text", "p_table" "text") TO "service_role";


--
-- Name: FUNCTION "apply_community_moderation_action"("p_target_type" "text", "p_target_id" "uuid", "p_after_status" "text", "p_reason_code" "text", "p_source_report_id" "uuid", "p_operator_memo" "text", "p_queue_status" "text", "p_report_status" "text", "p_decision" "text"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."apply_community_moderation_action"("p_target_type" "text", "p_target_id" "uuid", "p_after_status" "text", "p_reason_code" "text", "p_source_report_id" "uuid", "p_operator_memo" "text", "p_queue_status" "text", "p_report_status" "text", "p_decision" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."apply_community_moderation_action"("p_target_type" "text", "p_target_id" "uuid", "p_after_status" "text", "p_reason_code" "text", "p_source_report_id" "uuid", "p_operator_memo" "text", "p_queue_status" "text", "p_report_status" "text", "p_decision" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_community_moderation_action"("p_target_type" "text", "p_target_id" "uuid", "p_after_status" "text", "p_reason_code" "text", "p_source_report_id" "uuid", "p_operator_memo" "text", "p_queue_status" "text", "p_report_status" "text", "p_decision" "text") TO "service_role";


--
-- Name: FUNCTION "assert_community_actor_id_is_active"("target_actor_id" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."assert_community_actor_id_is_active"("target_actor_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."assert_community_actor_id_is_active"("target_actor_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."assert_community_actor_id_is_active"("target_actor_id" "uuid") TO "service_role";


--
-- Name: FUNCTION "assert_community_actor_is_active"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."assert_community_actor_is_active"() TO "anon";
GRANT ALL ON FUNCTION "public"."assert_community_actor_is_active"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."assert_community_actor_is_active"() TO "service_role";


--
-- Name: FUNCTION "assert_community_content_policy"("p_target_type" "text", "p_title" "text", "p_content" "text"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."assert_community_content_policy"("p_target_type" "text", "p_title" "text", "p_content" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."assert_community_content_policy"("p_target_type" "text", "p_title" "text", "p_content" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."assert_community_content_policy"("p_target_type" "text", "p_title" "text", "p_content" "text") TO "service_role";


--
-- Name: FUNCTION "build_account_deletion_response"("p_request_id" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."build_account_deletion_response"("p_request_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."build_account_deletion_response"("p_request_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."build_account_deletion_response"("p_request_id" "uuid") TO "service_role";


--
-- Name: FUNCTION "bump_community_reporter_rate_limit"("target_reporter_id" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."bump_community_reporter_rate_limit"("target_reporter_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."bump_community_reporter_rate_limit"("target_reporter_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."bump_community_reporter_rate_limit"("target_reporter_id" "uuid") TO "service_role";


--
-- Name: FUNCTION "bump_community_reporter_rejected_abuse"("target_reporter_id" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."bump_community_reporter_rejected_abuse"("target_reporter_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."bump_community_reporter_rejected_abuse"("target_reporter_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."bump_community_reporter_rejected_abuse"("target_reporter_id" "uuid") TO "service_role";


--
-- Name: FUNCTION "can_insert_community_comment"("target_post_id" "uuid", "target_parent_comment_id" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."can_insert_community_comment"("target_post_id" "uuid", "target_parent_comment_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_insert_community_comment"("target_post_id" "uuid", "target_parent_comment_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_insert_community_comment"("target_post_id" "uuid", "target_parent_comment_id" "uuid") TO "service_role";


--
-- Name: FUNCTION "cascade_comment_soft_delete"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."cascade_comment_soft_delete"() TO "anon";
GRANT ALL ON FUNCTION "public"."cascade_comment_soft_delete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cascade_comment_soft_delete"() TO "service_role";


--
-- Name: FUNCTION "check_nickname_availability"("p_nickname" "text", "p_user_id" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."check_nickname_availability"("p_nickname" "text", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_nickname_availability"("p_nickname" "text", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_nickname_availability"("p_nickname" "text", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_nickname_availability"("p_nickname" "text", "p_user_id" "uuid") TO "service_role";


--
-- Name: FUNCTION "claim_account_deletion_cleanup_items"("p_limit" integer); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."claim_account_deletion_cleanup_items"("p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."claim_account_deletion_cleanup_items"("p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."claim_account_deletion_cleanup_items"("p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."claim_account_deletion_cleanup_items"("p_limit" integer) TO "service_role";


--
-- Name: FUNCTION "community_normalize_text"("input_text" "text"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."community_normalize_text"("input_text" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."community_normalize_text"("input_text" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."community_normalize_text"("input_text" "text") TO "service_role";


--
-- Name: FUNCTION "community_post_view_window_start"("p_recorded_at" timestamp with time zone); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."community_post_view_window_start"("p_recorded_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."community_post_view_window_start"("p_recorded_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."community_post_view_window_start"("p_recorded_at" timestamp with time zone) TO "service_role";


--
-- Name: FUNCTION "complete_account_deletion_cleanup_item"("p_cleanup_item_id" "uuid", "p_success" boolean, "p_error_code" "text", "p_error_message" "text"); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."complete_account_deletion_cleanup_item"("p_cleanup_item_id" "uuid", "p_success" boolean, "p_error_code" "text", "p_error_message" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."complete_account_deletion_cleanup_item"("p_cleanup_item_id" "uuid", "p_success" boolean, "p_error_code" "text", "p_error_message" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."complete_account_deletion_cleanup_item"("p_cleanup_item_id" "uuid", "p_success" boolean, "p_error_code" "text", "p_error_message" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."complete_account_deletion_cleanup_item"("p_cleanup_item_id" "uuid", "p_success" boolean, "p_error_code" "text", "p_error_message" "text") TO "service_role";


--
-- Name: FUNCTION "create_account_deletion_request"("p_idempotency_key" "text", "p_request_origin" "text"); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."create_account_deletion_request"("p_idempotency_key" "text", "p_request_origin" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_account_deletion_request"("p_idempotency_key" "text", "p_request_origin" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_account_deletion_request"("p_idempotency_key" "text", "p_request_origin" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_account_deletion_request"("p_idempotency_key" "text", "p_request_origin" "text") TO "service_role";


--
-- Name: FUNCTION "current_user_id"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."current_user_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_user_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_user_id"() TO "service_role";


--
-- Name: FUNCTION "delete_my_account"(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."delete_my_account"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_my_account"() TO "anon";
GRANT ALL ON FUNCTION "public"."delete_my_account"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_my_account"() TO "service_role";


--
-- Name: FUNCTION "delete_my_account"("p_request_id" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."delete_my_account"("p_request_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_my_account"("p_request_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_my_account"("p_request_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_my_account"("p_request_id" "uuid") TO "service_role";


--
-- Name: FUNCTION "enforce_comment_thread_integrity"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."enforce_comment_thread_integrity"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_comment_thread_integrity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_comment_thread_integrity"() TO "service_role";


--
-- Name: FUNCTION "enforce_profile_nickname_policy"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."enforce_profile_nickname_policy"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_profile_nickname_policy"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_profile_nickname_policy"() TO "service_role";


--
-- Name: FUNCTION "enqueue_account_deletion_cleanup_item"("p_request_id" "uuid", "p_bucket_name" "text", "p_storage_path" "text"); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."enqueue_account_deletion_cleanup_item"("p_request_id" "uuid", "p_bucket_name" "text", "p_storage_path" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."enqueue_account_deletion_cleanup_item"("p_request_id" "uuid", "p_bucket_name" "text", "p_storage_path" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."enqueue_account_deletion_cleanup_item"("p_request_id" "uuid", "p_bucket_name" "text", "p_storage_path" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."enqueue_account_deletion_cleanup_item"("p_request_id" "uuid", "p_bucket_name" "text", "p_storage_path" "text") TO "service_role";


--
-- Name: FUNCTION "get_pet_care_guide_popular_searches"("p_species_group" "public"."pet_species_group", "p_limit" integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."get_pet_care_guide_popular_searches"("p_species_group" "public"."pet_species_group", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_pet_care_guide_popular_searches"("p_species_group" "public"."pet_species_group", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_pet_care_guide_popular_searches"("p_species_group" "public"."pet_species_group", "p_limit" integer) TO "service_role";


--
-- Name: FUNCTION "guard_community_comment_insert"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."guard_community_comment_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."guard_community_comment_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."guard_community_comment_insert"() TO "service_role";


--
-- Name: FUNCTION "guard_community_comment_update"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."guard_community_comment_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."guard_community_comment_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."guard_community_comment_update"() TO "service_role";


--
-- Name: FUNCTION "guard_community_image_upload"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."guard_community_image_upload"() TO "anon";
GRANT ALL ON FUNCTION "public"."guard_community_image_upload"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."guard_community_image_upload"() TO "service_role";


--
-- Name: FUNCTION "guard_community_post_insert"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."guard_community_post_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."guard_community_post_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."guard_community_post_insert"() TO "service_role";


--
-- Name: FUNCTION "guard_community_post_update"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."guard_community_post_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."guard_community_post_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."guard_community_post_update"() TO "service_role";


--
-- Name: FUNCTION "guard_community_report_insert"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."guard_community_report_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."guard_community_report_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."guard_community_report_insert"() TO "service_role";


--
-- Name: FUNCTION "handle_new_user"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";


--
-- Name: FUNCTION "is_active_community_report_status"("target_status" "text"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."is_active_community_report_status"("target_status" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."is_active_community_report_status"("target_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_active_community_report_status"("target_status" "text") TO "service_role";


--
-- Name: FUNCTION "is_community_admin"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."is_community_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_community_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_community_admin"() TO "service_role";


--
-- Name: FUNCTION "is_guide_admin"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."is_guide_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_guide_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_guide_admin"() TO "service_role";


--
-- Name: FUNCTION "is_pet_place_admin"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."is_pet_place_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_pet_place_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_pet_place_admin"() TO "service_role";


--
-- Name: FUNCTION "is_pet_travel_admin"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."is_pet_travel_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_pet_travel_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_pet_travel_admin"() TO "service_role";


--
-- Name: FUNCTION "mark_account_deletion_unknown"("p_request_id" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."mark_account_deletion_unknown"("p_request_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."mark_account_deletion_unknown"("p_request_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_account_deletion_unknown"("p_request_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_account_deletion_unknown"("p_request_id" "uuid") TO "service_role";


--
-- Name: FUNCTION "normalize_nickname_for_policy"("p_input" "text"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."normalize_nickname_for_policy"("p_input" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."normalize_nickname_for_policy"("p_input" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."normalize_nickname_for_policy"("p_input" "text") TO "service_role";


--
-- Name: FUNCTION "owns_pet"("target_pet_id" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."owns_pet"("target_pet_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."owns_pet"("target_pet_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."owns_pet"("target_pet_id" "uuid") TO "service_role";


--
-- Name: FUNCTION "raise_community_write_error"("p_app_code" "text", "p_message" "text", "p_target_type" "text", "p_target_field" "text", "p_match_source" "text", "p_hint" "text"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."raise_community_write_error"("p_app_code" "text", "p_message" "text", "p_target_type" "text", "p_target_field" "text", "p_match_source" "text", "p_hint" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."raise_community_write_error"("p_app_code" "text", "p_message" "text", "p_target_type" "text", "p_target_field" "text", "p_match_source" "text", "p_hint" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."raise_community_write_error"("p_app_code" "text", "p_message" "text", "p_target_type" "text", "p_target_field" "text", "p_match_source" "text", "p_hint" "text") TO "service_role";


--
-- Name: FUNCTION "record_community_post_view"("p_post_id" "uuid", "p_guest_session_id" "text"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."record_community_post_view"("p_post_id" "uuid", "p_guest_session_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."record_community_post_view"("p_post_id" "uuid", "p_guest_session_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_community_post_view"("p_post_id" "uuid", "p_guest_session_id" "text") TO "service_role";


--
-- Name: FUNCTION "refresh_community_moderation_queue"("p_target_type" "text", "p_target_id" "uuid", "p_source_report_id" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."refresh_community_moderation_queue"("p_target_type" "text", "p_target_id" "uuid", "p_source_report_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_community_moderation_queue"("p_target_type" "text", "p_target_id" "uuid", "p_source_report_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_community_moderation_queue"("p_target_type" "text", "p_target_id" "uuid", "p_source_report_id" "uuid") TO "service_role";


--
-- Name: FUNCTION "refresh_pet_care_guide_search_document"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."refresh_pet_care_guide_search_document"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_pet_care_guide_search_document"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_pet_care_guide_search_document"() TO "service_role";


--
-- Name: FUNCTION "repair_post_counts"("target_post_id" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."repair_post_counts"("target_post_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."repair_post_counts"("target_post_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."repair_post_counts"("target_post_id" "uuid") TO "service_role";


--
-- Name: FUNCTION "rls_auto_enable"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";


--
-- Name: FUNCTION "search_pet_care_guides"("p_query" "text", "p_species_group" "public"."pet_species_group", "p_age_in_months" integer, "p_limit" integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."search_pet_care_guides"("p_query" "text", "p_species_group" "public"."pet_species_group", "p_age_in_months" integer, "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_pet_care_guides"("p_query" "text", "p_species_group" "public"."pet_species_group", "p_age_in_months" integer, "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_pet_care_guides"("p_query" "text", "p_species_group" "public"."pet_species_group", "p_age_in_months" integer, "p_limit" integer) TO "service_role";


--
-- Name: FUNCTION "set_community_target_status"("p_target_type" "text", "p_target_id" "uuid", "p_after_status" "text", "p_action_type" "text", "p_reason_code" "text", "p_source_report_id" "uuid", "p_memo" "text", "p_actor_id" "uuid", "p_queue_status" "text", "p_decision" "text"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."set_community_target_status"("p_target_type" "text", "p_target_id" "uuid", "p_after_status" "text", "p_action_type" "text", "p_reason_code" "text", "p_source_report_id" "uuid", "p_memo" "text", "p_actor_id" "uuid", "p_queue_status" "text", "p_decision" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."set_community_target_status"("p_target_type" "text", "p_target_id" "uuid", "p_after_status" "text", "p_action_type" "text", "p_reason_code" "text", "p_source_report_id" "uuid", "p_memo" "text", "p_actor_id" "uuid", "p_queue_status" "text", "p_decision" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_community_target_status"("p_target_type" "text", "p_target_id" "uuid", "p_after_status" "text", "p_action_type" "text", "p_reason_code" "text", "p_source_report_id" "uuid", "p_memo" "text", "p_actor_id" "uuid", "p_queue_status" "text", "p_decision" "text") TO "service_role";


--
-- Name: FUNCTION "set_updated_at"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";


--
-- Name: FUNCTION "set_updated_at_blocked_nicknames"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."set_updated_at_blocked_nicknames"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at_blocked_nicknames"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at_blocked_nicknames"() TO "service_role";


--
-- Name: FUNCTION "sync_account_deletion_cleanup_summary"("p_request_id" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."sync_account_deletion_cleanup_summary"("p_request_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sync_account_deletion_cleanup_summary"("p_request_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."sync_account_deletion_cleanup_summary"("p_request_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_account_deletion_cleanup_summary"("p_request_id" "uuid") TO "service_role";


--
-- Name: FUNCTION "sync_comment_like_count"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."sync_comment_like_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_comment_like_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_comment_like_count"() TO "service_role";


--
-- Name: FUNCTION "sync_comment_reply_count"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."sync_comment_reply_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_comment_reply_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_comment_reply_count"() TO "service_role";


--
-- Name: FUNCTION "sync_community_image_asset_from_storage"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."sync_community_image_asset_from_storage"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_community_image_asset_from_storage"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_community_image_asset_from_storage"() TO "service_role";


--
-- Name: FUNCTION "sync_community_post_image_assets"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."sync_community_post_image_assets"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_community_post_image_assets"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_community_post_image_assets"() TO "service_role";


--
-- Name: FUNCTION "sync_community_report_change"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."sync_community_report_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_community_report_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_community_report_change"() TO "service_role";


--
-- Name: FUNCTION "sync_memory_image_owner_fields"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."sync_memory_image_owner_fields"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_memory_image_owner_fields"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_memory_image_owner_fields"() TO "service_role";


--
-- Name: FUNCTION "sync_pet_place_meta_counters"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."sync_pet_place_meta_counters"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_pet_place_meta_counters"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_pet_place_meta_counters"() TO "service_role";


--
-- Name: FUNCTION "sync_post_comment_count"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."sync_post_comment_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_post_comment_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_post_comment_count"() TO "service_role";


--
-- Name: FUNCTION "sync_post_like_count"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."sync_post_like_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_post_like_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_post_like_count"() TO "service_role";


--
-- Name: FUNCTION "sync_post_report_count"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."sync_post_report_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_post_report_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_post_report_count"() TO "service_role";


--
-- Name: TABLE "account_deletion_cleanup_items"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."account_deletion_cleanup_items" TO "anon";
GRANT ALL ON TABLE "public"."account_deletion_cleanup_items" TO "authenticated";
GRANT ALL ON TABLE "public"."account_deletion_cleanup_items" TO "service_role";


--
-- Name: TABLE "account_deletion_requests"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."account_deletion_requests" TO "anon";
GRANT ALL ON TABLE "public"."account_deletion_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."account_deletion_requests" TO "service_role";


--
-- Name: TABLE "ai_messages"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."ai_messages" TO "anon";
GRANT ALL ON TABLE "public"."ai_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_messages" TO "service_role";


--
-- Name: TABLE "anniversaries"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."anniversaries" TO "anon";
GRANT ALL ON TABLE "public"."anniversaries" TO "authenticated";
GRANT ALL ON TABLE "public"."anniversaries" TO "service_role";


--
-- Name: TABLE "audit_logs"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";


--
-- Name: TABLE "billing_events"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."billing_events" TO "anon";
GRANT ALL ON TABLE "public"."billing_events" TO "authenticated";
GRANT ALL ON TABLE "public"."billing_events" TO "service_role";


--
-- Name: TABLE "blocked_nickname_patterns"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."blocked_nickname_patterns" TO "anon";
GRANT ALL ON TABLE "public"."blocked_nickname_patterns" TO "authenticated";
GRANT ALL ON TABLE "public"."blocked_nickname_patterns" TO "service_role";


--
-- Name: SEQUENCE "blocked_nickname_patterns_id_seq"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE "public"."blocked_nickname_patterns_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."blocked_nickname_patterns_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."blocked_nickname_patterns_id_seq" TO "service_role";


--
-- Name: TABLE "blocked_nicknames"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."blocked_nicknames" TO "anon";
GRANT ALL ON TABLE "public"."blocked_nicknames" TO "authenticated";
GRANT ALL ON TABLE "public"."blocked_nicknames" TO "service_role";


--
-- Name: TABLE "comment_likes"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."comment_likes" TO "anon";
GRANT ALL ON TABLE "public"."comment_likes" TO "authenticated";
GRANT ALL ON TABLE "public"."comment_likes" TO "service_role";


--
-- Name: TABLE "comments"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."comments" TO "anon";
GRANT ALL ON TABLE "public"."comments" TO "authenticated";
GRANT ALL ON TABLE "public"."comments" TO "service_role";


--
-- Name: TABLE "community_blocked_term_patterns"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."community_blocked_term_patterns" TO "anon";
GRANT ALL ON TABLE "public"."community_blocked_term_patterns" TO "authenticated";
GRANT ALL ON TABLE "public"."community_blocked_term_patterns" TO "service_role";


--
-- Name: SEQUENCE "community_blocked_term_patterns_id_seq"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE "public"."community_blocked_term_patterns_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."community_blocked_term_patterns_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."community_blocked_term_patterns_id_seq" TO "service_role";


--
-- Name: TABLE "community_blocked_terms"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."community_blocked_terms" TO "anon";
GRANT ALL ON TABLE "public"."community_blocked_terms" TO "authenticated";
GRANT ALL ON TABLE "public"."community_blocked_terms" TO "service_role";


--
-- Name: SEQUENCE "community_blocked_terms_id_seq"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE "public"."community_blocked_terms_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."community_blocked_terms_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."community_blocked_terms_id_seq" TO "service_role";


--
-- Name: TABLE "community_image_assets"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."community_image_assets" TO "anon";
GRANT ALL ON TABLE "public"."community_image_assets" TO "authenticated";
GRANT ALL ON TABLE "public"."community_image_assets" TO "service_role";


--
-- Name: TABLE "community_moderation_actions"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."community_moderation_actions" TO "anon";
GRANT ALL ON TABLE "public"."community_moderation_actions" TO "authenticated";
GRANT ALL ON TABLE "public"."community_moderation_actions" TO "service_role";


--
-- Name: TABLE "community_moderation_queue"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."community_moderation_queue" TO "anon";
GRANT ALL ON TABLE "public"."community_moderation_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."community_moderation_queue" TO "service_role";


--
-- Name: TABLE "community_post_view_events"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."community_post_view_events" TO "anon";
GRANT ALL ON TABLE "public"."community_post_view_events" TO "authenticated";
GRANT ALL ON TABLE "public"."community_post_view_events" TO "service_role";


--
-- Name: TABLE "community_reporter_flags"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."community_reporter_flags" TO "anon";
GRANT ALL ON TABLE "public"."community_reporter_flags" TO "authenticated";
GRANT ALL ON TABLE "public"."community_reporter_flags" TO "service_role";


--
-- Name: TABLE "daily_recall"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."daily_recall" TO "anon";
GRANT ALL ON TABLE "public"."daily_recall" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_recall" TO "service_role";


--
-- Name: TABLE "emotions"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."emotions" TO "anon";
GRANT ALL ON TABLE "public"."emotions" TO "authenticated";
GRANT ALL ON TABLE "public"."emotions" TO "service_role";


--
-- Name: TABLE "letters"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."letters" TO "anon";
GRANT ALL ON TABLE "public"."letters" TO "authenticated";
GRANT ALL ON TABLE "public"."letters" TO "service_role";


--
-- Name: TABLE "likes"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."likes" TO "anon";
GRANT ALL ON TABLE "public"."likes" TO "authenticated";
GRANT ALL ON TABLE "public"."likes" TO "service_role";


--
-- Name: TABLE "memories"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."memories" TO "anon";
GRANT ALL ON TABLE "public"."memories" TO "authenticated";
GRANT ALL ON TABLE "public"."memories" TO "service_role";


--
-- Name: TABLE "memory_images"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."memory_images" TO "anon";
GRANT ALL ON TABLE "public"."memory_images" TO "authenticated";
GRANT ALL ON TABLE "public"."memory_images" TO "service_role";


--
-- Name: TABLE "memory_timeline_primary_images"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."memory_timeline_primary_images" TO "anon";
GRANT ALL ON TABLE "public"."memory_timeline_primary_images" TO "authenticated";
GRANT ALL ON TABLE "public"."memory_timeline_primary_images" TO "service_role";


--
-- Name: TABLE "notifications"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";


--
-- Name: TABLE "pet_care_guide_events"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."pet_care_guide_events" TO "anon";
GRANT ALL ON TABLE "public"."pet_care_guide_events" TO "authenticated";
GRANT ALL ON TABLE "public"."pet_care_guide_events" TO "service_role";


--
-- Name: TABLE "pet_care_guides"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."pet_care_guides" TO "anon";
GRANT ALL ON TABLE "public"."pet_care_guides" TO "authenticated";
GRANT ALL ON TABLE "public"."pet_care_guides" TO "service_role";


--
-- Name: TABLE "pet_place_bookmarks"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."pet_place_bookmarks" TO "anon";
GRANT ALL ON TABLE "public"."pet_place_bookmarks" TO "authenticated";
GRANT ALL ON TABLE "public"."pet_place_bookmarks" TO "service_role";


--
-- Name: TABLE "pet_place_external_signals"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."pet_place_external_signals" TO "anon";
GRANT ALL ON TABLE "public"."pet_place_external_signals" TO "authenticated";
GRANT ALL ON TABLE "public"."pet_place_external_signals" TO "service_role";


--
-- Name: TABLE "pet_place_search_logs"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."pet_place_search_logs" TO "anon";
GRANT ALL ON TABLE "public"."pet_place_search_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."pet_place_search_logs" TO "service_role";


--
-- Name: TABLE "pet_place_service_meta"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."pet_place_service_meta" TO "anon";
GRANT ALL ON TABLE "public"."pet_place_service_meta" TO "authenticated";
GRANT ALL ON TABLE "public"."pet_place_service_meta" TO "service_role";


--
-- Name: TABLE "pet_place_source_links"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."pet_place_source_links" TO "anon";
GRANT ALL ON TABLE "public"."pet_place_source_links" TO "authenticated";
GRANT ALL ON TABLE "public"."pet_place_source_links" TO "service_role";


--
-- Name: TABLE "pet_place_user_reports"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."pet_place_user_reports" TO "anon";
GRANT ALL ON TABLE "public"."pet_place_user_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."pet_place_user_reports" TO "service_role";


--
-- Name: TABLE "pet_place_verification_logs"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."pet_place_verification_logs" TO "anon";
GRANT ALL ON TABLE "public"."pet_place_verification_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."pet_place_verification_logs" TO "service_role";


--
-- Name: TABLE "pet_schedules"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."pet_schedules" TO "anon";
GRANT ALL ON TABLE "public"."pet_schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."pet_schedules" TO "service_role";


--
-- Name: TABLE "pet_travel_pet_policies"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."pet_travel_pet_policies" TO "anon";
GRANT ALL ON TABLE "public"."pet_travel_pet_policies" TO "authenticated";
GRANT ALL ON TABLE "public"."pet_travel_pet_policies" TO "service_role";


--
-- Name: TABLE "pet_travel_places"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."pet_travel_places" TO "anon";
GRANT ALL ON TABLE "public"."pet_travel_places" TO "authenticated";
GRANT ALL ON TABLE "public"."pet_travel_places" TO "service_role";


--
-- Name: TABLE "pet_travel_user_reports"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."pet_travel_user_reports" TO "anon";
GRANT ALL ON TABLE "public"."pet_travel_user_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."pet_travel_user_reports" TO "service_role";


--
-- Name: TABLE "pets"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."pets" TO "anon";
GRANT ALL ON TABLE "public"."pets" TO "authenticated";
GRANT ALL ON TABLE "public"."pets" TO "service_role";


--
-- Name: TABLE "posts"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."posts" TO "anon";
GRANT ALL ON TABLE "public"."posts" TO "authenticated";
GRANT ALL ON TABLE "public"."posts" TO "service_role";


--
-- Name: TABLE "profiles"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";


--
-- Name: TABLE "reports"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."reports" TO "anon";
GRANT ALL ON TABLE "public"."reports" TO "authenticated";
GRANT ALL ON TABLE "public"."reports" TO "service_role";


--
-- Name: TABLE "subscriptions"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";


--
-- Name: TABLE "user_consent_history"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."user_consent_history" TO "anon";
GRANT ALL ON TABLE "public"."user_consent_history" TO "authenticated";
GRANT ALL ON TABLE "public"."user_consent_history" TO "service_role";


--
-- Name: TABLE "v_my_pets_with_days"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."v_my_pets_with_days" TO "anon";
GRANT ALL ON TABLE "public"."v_my_pets_with_days" TO "authenticated";
GRANT ALL ON TABLE "public"."v_my_pets_with_days" TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";


--
-- PostgreSQL database dump complete
--

\unrestrict GMnWsNGONOVAost0PihH23fnTEHhsoQZtvD7Qow0m15yo8ei4Hypgq09w3JOmhX

