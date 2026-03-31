#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "[release-readiness] started: $(date '+%Y-%m-%d %H:%M:%S %z')"

echo
echo "[1/9] local automated checks"
yarn test:qa
yarn test --watchAll=false --watchman=false \
  __tests__/petTravel.test.ts \
  __tests__/consents.test.ts \
  __tests__/legalDocuments.test.ts \
  __tests__/guideCatalogSource.test.ts

echo
echo "[2/9] linked supabase project"
if [ -f supabase/.temp/project-ref ]; then
  printf 'project-ref: '
  cat supabase/.temp/project-ref
else
  echo 'project-ref: missing'
fi
supabase migration list --linked
supabase db push --linked --dry-run

echo
echo "[3/9] attached Android devices"
if command -v adb >/dev/null 2>&1; then
  device_output="$(adb devices -l || true)"
  printf '%s\n' "$device_output"
  if printf '%s\n' "$device_output" | awk 'NR > 1 && $1 != "" { print $1 }' | grep -qv '^emulator-'; then
    echo 'physical android device: present'
  else
    echo 'physical android device: not detected'
  fi
else
  echo 'adb: missing'
fi

echo
echo "[4/9] release artifact files"
if [ -f android/app/google-services.json ]; then
  echo 'android google-services: present'
else
  echo 'android google-services: missing'
fi
if [ -f ios/nuri/GoogleService-Info.plist ]; then
  echo 'ios google-service-info: present'
else
  echo 'ios google-service-info: missing'
fi

echo
echo "[5/9] local-only runtime file boundaries"
if git check-ignore -q src/services/supabase/config.ts; then
  echo 'supabase config.ts: local-only'
else
  echo 'supabase config.ts: tracked'
fi
if git check-ignore -q src/config/runtime.ts; then
  echo 'runtime.ts: local-only'
else
  echo 'runtime.ts: tracked'
fi

echo
echo "[6/9] monitoring config default"
if rg -q "https://.*sentry\\.io" src/services/monitoring/config.ts; then
  echo 'monitoring config: tracked DSN present'
else
  echo 'monitoring config: tracked DSN not present'
fi

echo
echo "[7/9] account deletion row-level snapshot"
supabase db query --linked "select 'account_deletion_requests' as object_name, count(*)::bigint as row_count from public.account_deletion_requests union all select 'account_deletion_cleanup_items', count(*)::bigint from public.account_deletion_cleanup_items;"
supabase db query --linked "select id, status, requested_at, cleanup_item_count, cleanup_completed_count, storage_cleanup_pending, last_error_code from public.account_deletion_requests order by requested_at desc nulls last limit 5;"

echo
echo "[8/9] community moderation row-level snapshot"
supabase db query --linked "select 'reports' as object_name, count(*)::bigint as row_count from public.reports union all select 'community_moderation_queue', count(*)::bigint from public.community_moderation_queue union all select 'community_moderation_actions', count(*)::bigint from public.community_moderation_actions union all select 'community_reporter_flags', count(*)::bigint from public.community_reporter_flags union all select 'community_image_assets', count(*)::bigint from public.community_image_assets;"
supabase db query --linked "select status, count(*)::bigint as row_count from public.reports group by status order by status;"
supabase db query --linked "select target_type, queue_status, priority, decision, report_count, unique_reporter_count, latest_reported_at from public.community_moderation_queue order by latest_reported_at desc nulls last limit 5;"
supabase db query --linked "select action_type, target_type, before_status, after_status, reason_code, created_at from public.community_moderation_actions order by created_at desc limit 5;"
supabase db query --linked "select flag_status, rate_limit_hit_count, rejected_abuse_count, last_reported_at, last_rate_limited_at, last_rejected_abuse_at from public.community_reporter_flags order by greatest(coalesce(last_rate_limited_at, '-infinity'::timestamptz), coalesce(last_rejected_abuse_at, '-infinity'::timestamptz), coalesce(last_reported_at, '-infinity'::timestamptz)) desc limit 5;"
supabase db query --linked "select upload_status, source_post_status, cleanup_reason, count(*)::bigint as row_count from public.community_image_assets group by upload_status, source_post_status, cleanup_reason order by upload_status, source_post_status, cleanup_reason;"

echo
echo "[9/9] finished"
echo "[release-readiness] completed"
