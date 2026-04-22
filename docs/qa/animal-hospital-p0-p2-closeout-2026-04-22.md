# AnimalHospital P0-P2 Closeout - 2026-04-22

## Scope

- P0-P2 후속 요청 범위: 실제 위치 갱신 흐름, 전국 검색, 전화번호 하이픈 표시, 최근검색어 제거, 가까운순/verified 24시 운영 칩, Android 실기기 CTA 재검증, 운영 evidence 갱신.
- public surface에 운영시간 문자열, 야간, 주말, 응급, 특수동물, 주차, 장비, 홈페이지/SNS 노출 없음.
- `open24Hours`는 public item field로 노출하지 않고, approved verification이 있는 병원만 24시 필터 결과에 남기는 gate 입력으로만 사용한다.
- 동물병원 신고 UI/CTA/flow 추가 없음.

## Code Changes

- `useAnimalHospitalDiscovery`
  - 좌표 query key 정밀도를 높였다.
  - 명시 검색어가 있을 때 화면 scope를 `전국 검색`으로 표시한다.
  - 검색 중 새로고침도 위치 refresh를 수행해 stale/cached 좌표가 계속 남지 않도록 했다.
- `searchAnimalHospitals`
  - 명시 검색어가 있으면 repository/provider 검색 조건에서 현재 위치 좌표를 제거한다.
  - 현재 위치는 public projection의 거리 계산 기준으로만 유지한다.
- `AnimalHospitalListScreen`
  - 동물병원 화면의 최근검색어 UI를 제거했다.
  - `전체`, `가까운순`, `24시 운영` 칩을 추가했다.
- `animalHospital/presentation`
  - approved public phone 표시를 `031-945-5000`, `02-511-7522` 형태로 포맷한다.
  - 리스트 모드 선택 함수와 테스트를 추가했다.
- `animalHospital_approved_verifications`
  - verified 24시 필터용 `open24Hours` approved verification을 반환하도록 RPC 계약을 갱신했다.

## Product Guardrails

- `24시 운영` 칩은 병원명 신호를 사용하지 않는다.
- `open24Hours` approved verification이 있고, 만료되지 않은 병원만 결과에 남긴다.
- 전화번호/좌표/썸네일은 approved verification이 없는 경우 public에 올리지 않는다.
- 운영시간 문자열 전체는 public에 노출하지 않는다.

## Static Verification

- `yarn test --watchAll=false --watchman=false`
  - 34 suites / 125 tests 통과
- `yarn tsc --noEmit`
  - 통과
- `yarn lint`
  - error 0건, warning 4건
- `git diff --check`
  - 통과

## Script / Ops Verification

- `node scripts/import-animal-hospital-thumbnails.js --manifest docs/qa/animal-hospital-thumbnail-manifest-2026-04-22.json --dry-run --report-output docs/qa/animal-hospital-thumbnail-import-2026-04-22.md`
  - total 3 / failed 0 / all validated
- `node scripts/ingest-animal-hospitals.js --input docs/qa/animal-hospital-delta-smoke-2026-04-22.csv --dry-run --ingest-mode delta --report-output docs/qa/animal-hospital-delta-dry-run-2026-04-22.md`
  - total rows 3 / mapped 3 / failed 0 / inactive 1
- `--compare-remote`
  - 현재 shell에 `SUPABASE_SERVICE_ROLE_KEY` 또는 `NURI_SUPABASE_SERVICE_ROLE_KEY`가 없어 실행 불가
- live runtime provider snapshot
  - 현재 shell에 `KAKAO_REST_API_KEY`가 없어 재실행 불가
- remote seed
  - `24시 마이동물의료센터`에 official homepage 근거의 approved `open24Hours=true` verification 1건 추가
  - verification id: `bb776c8e-0212-4d9b-bdce-a3875dc2c3cd`
  - source: `https://24myamc.com/`

## Android Physical Device Verification

- device: `R5CY613NMSY`, model `SM_S937N`
- build/install/start: `npm run android -- --deviceId R5CY613NMSY` 성공
- process: `pidof com.nuri.app` 확인
- logcat: `FATAL EXCEPTION`, `AndroidRuntime`, `ReactNativeJS` 치명 로그 미검출

검증 항목:

- More -> `우리동네 동물병원` 진입
- 리스트 칩 `전체`, `가까운순`, `24시 운영` 노출
- 최근검색어 미노출
- 리스트 주소 미노출
- 리스트 텍스트 좌측 정렬과 세로 중앙 배치 유지
- 위치 문구는 `새 위치 확인 중` 또는 `대략 위치 기준` 대신 `현재 위치 기준`과 `현재 위치` 또는 역지오코딩된 동네명으로 표시됨
- 기본 리스트 sample `24시 마이동물의료센터` 전화번호 `031-945-5000` 표시
- `VIP` 검색 후 `전국 검색` 표시
- `VIP동물의료센터 청담점` 검색 결과와 `02-511-7522` 표시
- `24시 운영` 칩은 approved `open24Hours` verification 기준으로 동작하며, `24시 마이동물의료센터`만 남는 것을 확인함
- 상세 진입, hero thumbnail, phone, address, CTA 확인
- `전화하기` 탭 후 SKT dialer intent 진입 및 `031-945-5000` 표시
- `길찾기` 탭 후 Android resolver 진입, `네이버지도`, `지도`, `카카오맵`, `TMAP` 표시
- 상세 지도 preview의 `열기` CTA와 Google 지도 preview 확인

## Evidence Files

- `docs/qa/animal-hospital-android-smoke-2026-04-22.md`
- `docs/qa/android-animal-hospital-p0p2-list-2026-04-22.png`
- `docs/qa/android-animal-hospital-p0p2-search-vip-2026-04-22.png`
- `docs/qa/android-animal-hospital-p0p2-name24-2026-04-22.png`
- `docs/qa/android-animal-hospital-open24-list-2026-04-22.png`
- `docs/qa/android-animal-hospital-open24-filter-2026-04-22.png`
- `docs/qa/android-animal-hospital-p0p2-detail-2026-04-22.png`
- `docs/qa/android-animal-hospital-p0p2-tel-2026-04-22.png`
- `docs/qa/android-animal-hospital-p0p2-map-2026-04-22.png`
- `docs/qa/android-animal-hospital-p0p2-map-preview-2026-04-22.png`
- `docs/qa/animal-hospital-thumbnail-import-2026-04-22.md`
- `docs/qa/animal-hospital-delta-dry-run-2026-04-22.md`
- `docs/qa/animal-hospital-ops-summary-2026-04-22.md`

## Current Metrics

- canonical rows: 10,507
- source rows: 10,507
- source unlinked rows: 0
- canonical drift suspected: 0
- public visible active/not hidden rows: 5,427
- inactive rows: 5,080
- hidden rows: 0
- approved phone coverage: 2
- approved coordinates coverage: 2
- approved thumbnail coverage: 2
- approved open24Hours coverage: 1
- pending thumbnail: 1
- runtime provider snapshot: provider-only 15, canonical linked 0, deferred 0

## Remaining External Evidence

- service role 기반 thumbnail import/report apply mode 재실행
- service role 기반 delta `--compare-remote` 재실행
- Kakao REST key가 있는 환경에서 runtime provider live snapshot 재실행
- 실제 admin 계정으로 운영자 UI pending/approved/rejected/held 조작 시각 검증
