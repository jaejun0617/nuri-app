# 우리동네 동물병원 remote schema 반영 증적

날짜: 2026-04-18
기준 커밋: `f7316d9`
Supabase project ref: `grmekesqoydylqmyvfke`

## 적용한 migration

- `20260417101500_task10_animal_hospital_canonical_master.sql`

## 적용 전 확인

- `supabase migration list --linked` 기준 remote에는 `20260417101500`이 미반영 상태였다.
- `supabase db push --dry-run` 기준 push 대상은 위 migration 1개뿐이었다.

## 적용 결과

- `supabase db push` 성공
- remote migration list 기준 `20260417101500`이 local/remote 모두 반영 상태가 됐다.

## remote catalog 확인

- `animal_hospitals` 테이블 존재 확인
- `animal_hospital_source_records` 테이블 존재 확인
- `animal_hospital_change_log` 테이블 존재 확인
- 위 3개 테이블 모두 RLS enabled 상태 확인

## 앱 runtime REST 경로 확인

앱과 동일한 anon key REST 경로로 아래 select가 200을 반환했다.

- `animal_hospitals?select=id,canonical_name,primary_address,is_active,is_hidden&limit=1`
- `animal_hospital_source_records?select=id,provider,provider_record_id&limit=1`
- `animal_hospital_change_log?select=id,change_type&limit=1`

현재 rowCount는 모두 0이다. 즉 schema는 반영됐지만 canonical 데이터 적재는 아직 다음 단계 범위다.

## 남은 주의점

- 여러 remote SQL catalog 조회를 병렬로 실행한 뒤 Supabase pooler가 일시적으로 `Circuit breaker open: Too many authentication errors`를 반환했다.
- policy/index catalog 세부 조회는 해당 circuit breaker가 풀린 뒤 단일 쿼리로 재확인해야 한다.
- migration SQL 자체에는 public hospital read policy와 admin-only write policy가 포함돼 있다.
