#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

DB_URL="${DATABASE_URL:-${SUPABASE_DB_URL:-}}"
PRINT_ONLY="false"

usage() {
  cat <<'EOF'
사용법:
  DATABASE_URL="postgresql://..." bash scripts/rebuild_public_schema_from_docs_sql.sh
  SUPABASE_DB_URL="postgresql://..." bash scripts/rebuild_public_schema_from_docs_sql.sh
  bash scripts/rebuild_public_schema_from_docs_sql.sh --db-url "postgresql://..."
  bash scripts/rebuild_public_schema_from_docs_sql.sh --print-only

주의:
- 이 스크립트는 "새 빈 DB" 또는 public/storage 대상이 정리된 재구축 직후 상태 전용이다.
- 기존 운영 프로젝트 위에 그대로 실행하면 view, policy, bucket 충돌로 중간 실패할 수 있다.
- `docs/sql/인증-계정/프로필-닉네임정책-현재로컬미러.sql`은 remote drift 때문에 의도적으로 제외한다.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --db-url)
      if [[ $# -lt 2 ]]; then
        echo "오류: --db-url 뒤에 연결 문자열이 필요합니다." >&2
        exit 1
      fi
      DB_URL="$2"
      shift 2
      ;;
    --print-only)
      PRINT_ONLY="true"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "오류: 알 수 없는 옵션입니다: $1" >&2
      usage
      exit 1
      ;;
  esac
done

SQL_FILES=(
  "docs/sql/공용/누리-전체초기구성-부트스트랩.sql"
  "docs/sql/타임라인-메모리/타임라인-메모리이미지-최종.sql"
  "docs/sql/타임라인-메모리/메모리-이미지URL-호환성-추가.sql"
  "docs/sql/타임라인-메모리/메모리-카테고리서브카테고리가격-추가.sql"
  "docs/sql/인증-계정/계정삭제-동의이력-최종.sql"
  "docs/sql/가이드/집사꿀팁가이드-운영-최종.sql"
  "docs/sql/가이드/가이드-이미지스토리지-정책.sql"
  "docs/sql/펫동반-장소/펫동반장소-메타-최종.sql"
  "docs/sql/커뮤니티/커뮤니티-운영-최종.sql"
  "docs/sql/반려동물과-여행/반려동물과여행-트러스트레이어-최종.sql"
)

echo "재구축 대상 SQL 세트:"
for sql_file in "${SQL_FILES[@]}"; do
  echo " - ${sql_file}"
done

if [[ "${PRINT_ONLY}" == "true" ]]; then
  exit 0
fi

if [[ -z "${DB_URL}" ]]; then
  echo "오류: DATABASE_URL, SUPABASE_DB_URL 또는 --db-url이 필요합니다." >&2
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "오류: psql 명령이 필요합니다." >&2
  exit 1
fi

readonly PREFLIGHT_SQL="$(cat <<'SQL'
with existing_public_relations as (
  select format('table:%s', table_name) as name
  from information_schema.tables
  where table_schema = 'public'
    and table_name in (
      'profiles',
      'pets',
      'memories',
      'posts',
      'comments',
      'memory_images',
      'pet_care_guides',
      'pet_place_service_meta',
      'community_post_view_events',
      'user_consent_history',
      'account_deletion_requests',
      'pet_travel_places',
      'pet_travel_pet_policies',
      'pet_travel_user_reports'
    )
  union all
  select format('view:%s', table_name) as name
  from information_schema.views
  where table_schema = 'public'
    and table_name in (
      'v_my_pets_with_days',
      'v_memory_images_for_timeline'
    )
),
existing_public_functions as (
  select format('function:%s', routine_name) as name
  from information_schema.routines
  where specific_schema = 'public'
    and routine_name in (
      'handle_new_user',
      'delete_my_account',
      'search_pet_care_guides',
      'record_community_post_view',
      'is_pet_travel_admin'
    )
),
existing_storage_buckets as (
  select format('bucket:%s', id) as name
  from storage.buckets
  where id in (
    'pet-profiles',
    'memory-images',
    'guide-images',
    'community-images'
  )
)
select coalesce(string_agg(name, E'\n' order by name), '')
from (
  select name from existing_public_relations
  union all
  select name from existing_public_functions
  union all
  select name from existing_storage_buckets
) detected;
SQL
)"

existing_objects="$(psql "${DB_URL}" -Atqc "${PREFLIGHT_SQL}")"

if [[ -n "${existing_objects}" ]]; then
  cat >&2 <<EOF
오류: 대상 DB가 비어 있지 않습니다.
이 스크립트는 새 빈 DB 또는 public/storage 재구축 직후 상태에서만 실행해야 합니다.

감지된 기존 객체:
${existing_objects}
EOF
  exit 1
fi

for sql_file in "${SQL_FILES[@]}"; do
  absolute_path="${ROOT_DIR}/${sql_file}"

  if [[ ! -f "${absolute_path}" ]]; then
    echo "오류: SQL 파일을 찾을 수 없습니다: ${absolute_path}" >&2
    exit 1
  fi

  echo
  echo "==> 적용 중: ${sql_file}"
  psql "${DB_URL}" -v ON_ERROR_STOP=1 -f "${absolute_path}"
done

echo
echo "완료: docs/sql 최종본 기준 public 재구축 SQL 세트 적용이 끝났습니다."
