# AnimalHospital P0-P2 Closeout - 2026-04-22

## Scope

- P0-P2 후속 요청 범위: 실제 위치 갱신 흐름, 전국 검색, 전화번호 하이픈 표시, 최근검색어 제거, 가까운순/verified 24시 운영 칩, Android 실기기 CTA 재검증, 운영 evidence 갱신.
- 2026-04-23 후속 코드 기준 리스트 칩은 `전체` 제거 후 `가까운순`, `24시 운영`, `특수동물병원`으로 조정됐다. 이 문서의 Android 캡처 항목 중 `전체` 칩 노출 증적은 이전 상태 증적으로만 남긴다.
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
  - 2026-04-23 후속으로 `전체` 칩을 제거하고 `가까운순`, `24시 운영`, `특수동물병원` 칩만 남겼다.
- `animalHospital/presentation`
  - approved public phone 표시를 `031-945-5000`, `02-511-7522` 형태로 포맷한다.
  - 리스트 모드 선택 함수와 테스트를 추가했다. public distance가 없는 병원은 화면단에서 이름순으로 재정렬하지 않고 서비스 내부 가까운순을 보존한다.
- `searchAnimalHospitals`
  - 2026-04-23 후속으로 public 좌표를 노출하지 않는 병원도 canonical 좌표 기준 내부 거리 정렬을 우선하도록 보강했다.
- `animalHospital_approved_verifications`
  - verified 24시 필터용 `open24Hours` approved verification을 반환하도록 RPC 계약을 갱신했다.
  - 2026-04-23 후속으로 `exoticAnimalCare` approved verification도 필터 gate 입력으로 반환하도록 local migration을 추가했다.

## Product Guardrails

- `24시 운영` 칩은 병원명 신호를 사용하지 않는다.
- `open24Hours` approved verification이 있고, 만료되지 않은 병원만 결과에 남긴다.
- `특수동물병원` 칩은 병원명/provider raw 문구를 사용하지 않고, `exoticAnimalCare` approved verification이 있고 만료되지 않은 병원만 결과에 남긴다.
- 전화번호/좌표/썸네일은 approved verification이 없는 경우 public에 올리지 않는다.
- 운영시간 문자열 전체는 public에 노출하지 않는다.

## Static Verification

- `yarn test --watchAll=false --watchman=false`
  - 36 suites / 134 tests 통과
- `yarn test --watchAll=false --watchman=false __tests__/animalHospitalService.test.ts __tests__/animalHospitalProjection.test.ts __tests__/animalHospitalVerification.test.ts __tests__/animalHospitalPresentation.test.ts __tests__/useCurrentLocation.test.tsx __tests__/currentPosition.test.ts`
  - 6 suites / 25 tests 통과
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
  - current turn에서는 별도 재실행하지 않았다. 최신 linked ops report로 drift/provider summary를 대체 확인했다.
- live runtime provider snapshot
  - latest runtime snapshot 기준 `provider-only 2 / canonical linked 13 / deferred 0`
- remote seed
  - `24시 마이동물의료센터`에 official homepage 근거의 approved `open24Hours=true` verification 1건 추가
  - verification id: `bb776c8e-0212-4d9b-bdce-a3875dc2c3cd`
  - source: `https://24myamc.com/`
- official phone promotion
  - `scripts/promote-animal-hospital-official-phone-verifications.js` apply 후 official-source phone approved coverage 3,024건 확인
- provider enrichment apply
  - Google batch apply 누적 550개 병원, 1,718 candidates 적재
  - latest pending queue: coordinates 327, open24Hours 43, thumbnail 4
- sensitive verification import
  - official homepage 근거 기반 `open24Hours` 4건, `exoticAnimalCare` 2건 approved import 완료

## Android Physical Device Verification

- device: `R5CY613NMSY`, model `SM_S937N`
- build/install/start: `npm run android -- --deviceId R5CY613NMSY` 성공
- process: `pidof com.nuri.app` 확인
- logcat: `FATAL EXCEPTION`, `AndroidRuntime`, `ReactNativeJS` 치명 로그 미검출
- 2026-04-23 후속 smoke: `yarn android --deviceId R5CY613NMSY` build/install/start 성공. `전체` 칩 미노출, `가까운순/24시 운영/특수동물병원` 칩 노출, `현재 위치 기준/현재 위치` 표시, `특수동물병원` empty state의 검수 기준 문구를 확인했다. Hot refresh 중 hook count red screen이 1회 발생했으나 force-stop 후 재진입에서 재현되지 않았고, logcat clear 후 치명 로그는 없었다.
- 2026-04-23 후속 smoke 2차: 기본 가까운순에서 `일산3동`, `24시 마이동물의료센터` thumbnail+`031-945-5000`, fallback 카드 `전화번호 확인 중`을 확인했다.
- 같은 기기에서 `24` 검색 + `24시 운영` 칩으로 `24시동탄시티동물의료센터`와 `031-8003-7533` 표시를 확인했다.
- 같은 기기에서 `특수동물병원` 칩 empty state, `24시 마이동물의료센터` 상세 hero thumbnail, `전화하기` dialer intent, `길찾기` chooser, 지도 preview `열기` chooser를 다시 확인했다.

검증 항목:

- More -> `우리동네 동물병원` 진입
- 리스트 칩은 현재 코드 기준 `가까운순`, `24시 운영`, `특수동물병원` 노출. 이전 캡처의 `전체` 칩은 폐기된 상태다.
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
- `docs/qa/animal-hospital-android-smoke-2026-04-23.md`
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
- approved phone coverage: 3,024
- approved coordinates coverage: 2
- approved thumbnail coverage: 2
- approved open24Hours coverage: 5
- approved exoticAnimalCare coverage: 2
- pending phone: 5
- pending coordinates: 327
- pending thumbnail: 4
- pending open24Hours: 43
- runtime provider snapshot: provider-only 2, canonical linked 13, deferred 0

## Remaining External Evidence

- 실제 admin 계정으로 운영자 UI pending/approved/rejected/held 조작 시각 검증
- held thumbnail / pending coordinates / pending open24Hours 운영 검수 처리 증적
