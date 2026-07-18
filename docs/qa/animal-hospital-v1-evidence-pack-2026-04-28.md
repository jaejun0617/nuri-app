# Animal Hospital V1.0 Evidence Pack

## 2026-07-19 Public-safe 보강

- latest release APK에서 list/detail/전화/길찾기/back을 확인했다.
- public detail은 원시 주소 대신 길찾기 확인 문구를 표시하고 운영시간·야간·응급·특수동물·주차·장비·홈페이지·SNS·raw metadata를 노출하지 않는다.
- public active 후보 564건 중 `(0,0)` 12건은 데이터 품질 항목으로 확인했다. 앱은 이를 좌표 없음으로 처리해 거리, 지도 링크, 지도 미리보기에 사용하지 않는다.
- 검증되지 않은 좌표를 생성하거나 전국 bulk correction을 수행하지 않았다.
- `animalHospitalProjection` zero-coordinate test를 추가했고 전체 64 suites/249 tests를 통과했다.

작성일: 2026-04-28

## Closeout 판정

- 현재 점수: 98/100
- 이번 문서의 범위: 운영자 검수 UI 실계정 QA를 제외한 동물병원 v1.0 closeout 증거 정리
- 남은 유일한 final gate: 운영자 검수 UI approve/reject/held 실계정 QA evidence
- 운영자 검수 UI QA는 이번 턴에서 수행하지 않았고, 100/100 직전 마지막 gate로 held/pending 처리한다.

## Google Maps Fallback 공식 UX

- v1.0 Android 동물병원 상세에서는 네이티브 Google Maps preview를 공식 UX에서 제외한다.
- 좌표가 있더라도 `위치 정보 준비 중이에요. 길찾기로 외부 지도에서 확인해 주세요.` fallback을 노출한다.
- 이 fallback은 임시 크래시 회피가 아니라 v1.0 공식 UX 결정이다.
- 목적은 Android native Google Maps preview의 `INVALID_ARGUMENT` 재발을 방어하는 것이다.
- 사용자 핵심 행동은 `전화하기`, `길찾기`, 외부 지도 열기 CTA로 유지한다.
- Google Maps native preview 정식 복원은 API key/package/SHA 정리 후 v1.1 P2 backlog에서 재검토한다.

## Migration 동시 적용 Release Note

2026-04-28 동물병원 DB 안정화 과정에서 아래 2개 migration이 Linked Remote DB에 동시에 적용됐다.

- `20260428120000_animal_hospital_public_search_rpc_v1.sql`
- `20260428123000_fix_existing_rpc_ambiguous_columns.sql`

원래는 corrective migration 단독 적용 후 public search RPC 적용이 더 보수적인 순서였으나, v1.0 출시 전 제품 판단에 따라 동시 적용을 승인했다.

rollback은 수행하지 않았다. 이유는 아래 사후 검증이 모두 통과했기 때문이다.

- `supabase db lint --linked --schema public --fail-on error` 통과
- 기존 ambiguous column error 제거
- `animal_hospital_public_search_v1` RPC 직접 호출 성공
- EXPLAIN ANALYZE에서 keyword path pg_trgm index 확인
- nearby path coordinate partial index + bbox + Haversine distance sort 확인
- Android 리스트/search/filter/detail smoke 통과
- `NURI-RPC-SUCCESS` logcat 확인

프로세스 개선 항목:

- 결과는 정상이나, 다음 DB migration부터는 pending migration 목록이 의도와 다르면 remote apply를 중단한다.

## 1. DB / RPC Evidence

### Applied migrations

- `20260428120000_animal_hospital_public_search_rpc_v1.sql`
- `20260428123000_fix_existing_rpc_ambiguous_columns.sql`

### Linked lint result

- `supabase db lint --linked --schema public --fail-on error` 통과
- 기존 `submit_pet_travel_user_report`, `animal_hospital_review_verification` ambiguous column error 제거

### RPC direct call result

- `public.animal_hospital_public_search_v1` 직접 호출 성공
- RPC missing/failure fallback이 아닌 RPC success path를 확인했다.

### EXPLAIN ANALYZE: nearby

- coordinate partial index + bbox 선필터 동작 확인
- Haversine distance filter와 distance asc 정렬 확인
- limit은 distance 계산과 filter 이후 적용되는 구조로 확인

### EXPLAIN ANALYZE: keyword

- keyword path에서 pg_trgm index 사용 확인
- `canonical_name`, `primary_address` 중심 검색 정책 유지 확인

### pg_trgm / coordinate index evidence

- keyword path: pg_trgm index 사용 확인
- nearby path: coordinate partial index 사용 확인

## 2. Android Device Evidence

### Device model / app version

- device: `SM_S937N`
- package: `com.nuri.app`
- app version: `1.0`

### Nearby list first render

- `우리동네 동물병원` 리스트 첫 렌더 확인
- 현재 위치 기준 nearby 결과 표시 확인
- 빈 화면, 무한 로딩, 앱 크래시 미발생

### VIP search

- `VIP` 검색 확인
- `전국 검색` 문구와 검색 결과 표시 확인
- 검색 중 앱 멈춤 미발생

### 일산 search PO confirmation

- 한글 `일산` 검색 QA는 PO 확인 완료로 처리한다.
- 이번 문서화 턴에서는 한글 검색 QA를 다시 열지 않는다.

### 24시 filter approved-only empty

- `24시 운영` 필터에서 approved verification 기준 empty state 확인
- 병원명 문자열만으로 `24시 운영` 결과에 포함하지 않는 정책 유지

### Exotic filter approved-only empty

- `특수동물병원` 필터에서 approved verification 기준 empty state 확인
- provider-only/raw 문구만으로 public filter에 포함하지 않는 정책 유지

### Detail entry

- 리스트에서 상세 진입 확인
- 병원명, 기본 정보, CTA 노출 확인

### Phone CTA

- `전화하기` CTA 동작 확인
- Android dialer intent 진입 확인

### Directions CTA

- `길찾기` CTA 동작 확인
- 외부 지도 resolver 진입 확인

### Map fallback state

- Android 동물병원 상세에서 native Google Maps preview 대신 fallback 노출 확인
- fallback 문구: `위치 정보 준비 중이에요. 길찾기로 외부 지도에서 확인해 주세요.`

## 3. Log Evidence

### NURI-RPC-SUCCESS nearby

- nearby path에서 `NURI-RPC-SUCCESS` logcat 확인
- 예: mode `nearby`, resultCount 확인

### NURI-RPC-SUCCESS search

- search path에서 `NURI-RPC-SUCCESS` logcat 확인
- 예: mode `search`, resultCount 확인

### No fatal crash / no ANR

- Android smoke 중 fatal crash, ANR 미발생

### Google Maps INVALID_ARGUMENT fallback 후 미재발

- Android 동물병원 상세 fallback 적용 후 같은 상세 진입 구간에서 Google Maps `INVALID_ARGUMENT` 재발 없음

## 4. Public Trust Policy Evidence

### Provider-only candidate not promoted

- provider-only candidate는 verified/public trust로 승격하지 않는다.
- runtime/provider 결과는 candidate trust 경계를 유지한다.

### open24Hours approved-only

- `24시 운영` 필터와 public badge는 approved `open24Hours=true` verification만 사용한다.
- 병원명 문자열, Google opening hours, provider raw 문구는 24시간 확정 근거로 쓰지 않는다.

### exoticAnimalCare approved-only

- `특수동물병원` 필터는 approved `exoticAnimalCare=true` verification만 사용한다.
- provider-only/raw 문구만으로 public filter를 통과하지 않는다.

### Hidden/internal fields not exposed

- 아래 internal/raw 필드는 public surface에 직접 노출하지 않는다.
  - `operatingHours`
  - `open24Hours` raw
  - `nightService`
  - `weekendService`
  - `exoticAnimalCare` raw
  - `emergencyCare`
  - `parking`
  - `equipmentSummary`
  - `homepageUrl`
  - `socialUrl`

## 5. Release Process Evidence

### Migration 동시 적용 release note

- 본 문서의 `Migration 동시 적용 Release Note` 섹션에 기록했다.
- `docs/qa/release-checklist.md`에도 동일 release note 요약을 반영했다.

### Rollback 미수행 사유

- linked lint 통과
- ambiguous column error 제거
- RPC direct call 성공
- EXPLAIN ANALYZE keyword/nearby path 확인
- Android smoke 통과
- `NURI-RPC-SUCCESS` logcat 확인

### DB migration checklist

- `docs/qa/release-checklist.md`에 `Supabase Migration Apply Gate`를 추가했다.

### Post-apply lint/RPC/smoke result

- linked lint 통과
- RPC 직접 호출 성공
- EXPLAIN ANALYZE 확인
- Android list/search/filter/detail smoke 통과

## 6. Remaining Final Gate

- 운영자 검수 UI approve/reject/held 실계정 QA evidence
- 이번 턴에서는 수행하지 않는다.
- 최종 100/100 직전 마지막 gate로 held/pending 처리한다.

필요 evidence:

- approve 처리 전/후 화면
- reject 처리 전/후 화면
- held 처리 전/후 화면
- public 반영 여부
- 운영 로그 또는 DB row 변화
- reviewer note 저장 여부
- provider-only candidate가 verified/public trust로 승격되지 않는지 확인

## 7. P2 Backlog

- v1.1: Google Maps native preview 정식 복원
- v1.1: 운영자 검수 처리량 확대
