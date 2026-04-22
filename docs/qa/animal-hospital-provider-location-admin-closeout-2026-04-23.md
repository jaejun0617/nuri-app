# AnimalHospital Provider/Admin/Location Closeout - 2026-04-23

## Scope

- 관리자 검수 UI를 `phone`, `coordinates`, `thumbnail`, `open24Hours` field-level workflow로 확장했다.
- Google/Kakao/fixture provider enrichment script를 추가해 phone/coordinates/photo/open24Hours 후보를 dry-run/apply 가능한 pipeline으로 만들었다.
- Android 위치 정확도 상태를 `precise`, `approximate`, stale, weak GPS, permission denied UX로 분리했다.
- public trust gate는 유지했다. 승인되지 않은 phone/coordinates/thumbnail/open24Hours는 public projection에 반영하지 않는다.
- 리스트 주소 미노출, 최근검색어 미노출, 하이픈 전화번호, 전국 검색, `전체/가까운순/24시 운영` chip 구조를 유지했다.
- 동물병원 신고 UI/CTA/flow는 추가하지 않았다.

## Source Of Truth Check

- repo 문서와 코드 기준 `animalHospital`은 source/canonical/public/internal projection으로 분리되어 있다.
- linked remote에는 2026-04-22 기준 운영 검수 console migration이 적용된 기록이 있으나, 2026-04-23 추가 migration `20260423090000_animal_hospital_ops_open24_action_logs.sql`은 현재 shell에서 remote dry-run/apply가 막혔다.
- `supabase db push --linked --dry-run` 실패 원인: `SUPABASE_ACCESS_TOKEN` 미설정.
- 현재 shell에는 `SUPABASE_SERVICE_ROLE_KEY` 또는 `NURI_SUPABASE_SERVICE_ROLE_KEY`가 없어 service-role apply/report mode는 실행하지 못했다.
- runtime config에는 Google/Kakao key fallback이 존재해 provider dry-run은 가능했지만, 운영 apply는 service role key가 필요하다.

## Code Changes

- Admin UI
  - `open24Hours` field filter, summary card, metadata, reviewer note, action log display를 추가했다.
  - 검수 액션 후 optimistic publish가 아니라 authoritative query invalidation/refetch를 유지한다.
  - detail panel에서 current approved public value와 candidate value, source, reviewer, reviewedAt, updatedAt, note/evidence를 비교할 수 있다.
- Supabase wrapper/RPC contract
  - ops summary에 `pendingOpen24Hours`, `approvedOpen24HoursCoverage`를 추가했다.
  - ops detail에 `actionLogs`를 추가했다.
  - local migration은 `open24Hours` review item/status/detail을 지원한다.
- Provider enrichment
  - `scripts/enrich-animal-hospitals-provider.js`를 추가했다.
  - `--provider google|kakao|fixture`, `--dry-run`, `--apply`, cache, batch, delay, report/json output을 지원한다.
  - provider photo는 기본 `held`로 적재하도록 설계했다. 운영자가 대표성/권리/공식성을 확인하기 전까지 public thumbnail이 되지 않는다.
  - 좌표 offset이 큰 후보는 `held`로 보낸다.
  - `open24Hours`는 provider detail이 7일 모두 24시간을 명시할 때만 candidate가 되며, public 반영은 승인 후에만 가능하다.
- Matching
  - 주소 normalization에서 서울/부산/대구/인천/광주/대전/울산/세종 축약 주소와 층/호수/괄호 detail 차이를 보수적으로 흡수했다.
- Location P0
  - Android precise/coarse permission을 구분한다.
  - stale cached coordinate가 있어도 loading copy가 계속 우선 노출되지 않도록 했다.
  - weak GPS, approximate permission, stale coordinate 상태를 화면 copy/action으로 분리했다.

## Data / Ops Verification

- Fixture enrichment dry-run
  - command: `node scripts/enrich-animal-hospitals-provider.js --dry-run --provider fixture --input docs/qa/animal-hospital-provider-enrichment-smoke-2026-04-23.json --report-output docs/qa/animal-hospital-provider-enrichment-2026-04-23.md --json-output docs/qa/animal-hospital-provider-enrichment-2026-04-23.json`
  - processed 2, provider matched 2, failed 0, candidates 5.
  - by field: coordinates 2, open24Hours 1, thumbnail 2.
  - by status: pending 3, held 2.
- Google enrichment dry-run
  - command: `node scripts/enrich-animal-hospitals-provider.js --dry-run --provider google --input docs/qa/animal-hospital-provider-enrichment-smoke-2026-04-23.json --report-output docs/qa/animal-hospital-provider-enrichment-google-smoke-2026-04-23.md --json-output docs/qa/animal-hospital-provider-enrichment-google-smoke-2026-04-23.json --delay-ms 50`
  - processed 2, provider matched 2, failed 0, candidates 10.
  - by field: coordinates 2, open24Hours 2, thumbnail 6.
  - by status: pending 3, held 7.
- Kakao enrichment dry-run
  - command: `node scripts/enrich-animal-hospitals-provider.js --dry-run --provider kakao --input docs/qa/animal-hospital-provider-enrichment-smoke-2026-04-23.json --report-output docs/qa/animal-hospital-provider-enrichment-kakao-smoke-2026-04-23.md --json-output docs/qa/animal-hospital-provider-enrichment-kakao-smoke-2026-04-23.json --delay-ms 50`
  - processed 2, provider matched 0, failed 0, candidates 0.
- Delta dry-run
  - command: `node scripts/ingest-animal-hospitals.js --input docs/qa/animal-hospital-delta-smoke-2026-04-22.csv --dry-run --ingest-mode delta --report-output docs/qa/animal-hospital-delta-dry-run-2026-04-23.md`
  - total 3, mapped 3, failed 0, inactive 1, new rows 3.
  - parse failed 0, coordinate conversion failed 0, matching failed 0.
- Thumbnail import dry-run
  - command: `node scripts/import-animal-hospital-thumbnails.js --manifest docs/qa/animal-hospital-thumbnail-manifest-2026-04-22.json --dry-run --report-output docs/qa/animal-hospital-thumbnail-import-2026-04-23.md`
  - total 3, failed 0, all validated.
  - official source samples: VIP동물의료센터 청담점, 서울대학교 동물병원, 24시 마이동물의료센터.

## Current Metrics

- source rows: 10,507
- canonical rows: 10,507
- public visible active/not hidden rows: 5,427
- inactive rows: 5,080
- hidden rows: 0
- source unlinked rows: 0
- canonical drift suspected rows: 0
- approved phone coverage: 2
- approved coordinates coverage: 2
- approved thumbnail coverage: 2
- approved open24Hours coverage: 1
- pending thumbnail: 1
- runtime provider snapshot baseline: provider-only 15, canonical linked 0, deferred 0
- 2026-04-23 provider enrichment dry-run snapshot is separate from runtime snapshot and did not write public data.

## Android Physical Device Verification

- device: `R5CY613NMSY`, model `SM_S937N`
- install/start: `npm run android -- --deviceId R5CY613NMSY` succeeded before this closeout pass.
- sample hospital: `24시 마이동물의료센터`
- public phone sample: `031-945-5000`

Verified on 2026-04-23:

- list screen entered from app and captured.
- list shows `전체`, `가까운순`, `24시 운영`.
- list does not show address text.
- list card content order is thumbnail, `동물병원`, hospital name, phone.
- list text nodes are left-aligned at x=448 and vertically centered beside the fixed thumbnail.
- phone number is displayed with hyphen: `031-945-5000`.
- no recent search UI appears.
- location copy shows `현재 위치 기준` and `현재 위치`; stale loading copy did not override the usable coordinate state.
- detail entered from list.
- detail shows approved hero thumbnail, address, distance, phone, `전화하기`, `길찾기`.
- `전화하기` opens `com.skt.prod.dialer` and passes `031-945-5000`.
- `길찾기` opens Android resolver with `네이버지도`, `지도`, `카카오맵`, `TMAP`.
- map preview section shows `Google 지도`, `24시 마이동물의료센터 위치 미리보기`, and `열기`.
- map `열기` CTA opens Android map resolver.
- recent logcat had no `FATAL EXCEPTION`, `AndroidRuntime`, or `ReactNativeJS` fatal crash for this flow.

Evidence files:

- `docs/qa/android-animal-hospital-2026-04-23-launch.png`
- `docs/qa/android-animal-hospital-2026-04-23-launch-window.xml`
- `docs/qa/android-animal-hospital-2026-04-23-list.png`
- `docs/qa/android-animal-hospital-2026-04-23-list-window.xml`
- `docs/qa/android-animal-hospital-2026-04-23-detail.png`
- `docs/qa/android-animal-hospital-2026-04-23-detail-window.xml`
- `docs/qa/android-animal-hospital-2026-04-23-tel.png`
- `docs/qa/android-animal-hospital-2026-04-23-tel-window.xml`
- `docs/qa/android-animal-hospital-2026-04-23-directions.png`
- `docs/qa/android-animal-hospital-2026-04-23-directions-window.xml`
- `docs/qa/android-animal-hospital-2026-04-23-map-preview.png`
- `docs/qa/android-animal-hospital-2026-04-23-map-preview-window.xml`
- `docs/qa/android-animal-hospital-2026-04-23-map-open.png`
- `docs/qa/android-animal-hospital-2026-04-23-map-open-window.xml`

## Static Verification

- `yarn test --watchAll=false --watchman=false`
  - 35 suites / 128 tests passed.
- `yarn tsc --noEmit`
  - passed.
- `yarn lint`
  - error 0, warning 4.
- `git diff --check`
  - passed after document updates.

## Not Completed By Environment

- `20260423090000_animal_hospital_ops_open24_action_logs.sql` was not applied to linked remote because `SUPABASE_ACCESS_TOKEN` is missing.
- service-role apply mode for provider enrichment, thumbnail import, ops report, and remote compare was not executed because `SUPABASE_SERVICE_ROLE_KEY` or `NURI_SUPABASE_SERVICE_ROLE_KEY` is missing.
- actual admin-account visual operation of approve/reject/held was not performed in app UI during this pass.
- large-scale enrichment for all 10,507 hospitals was not executed because quota/key/billing and service-role apply prerequisites must be controlled in an ops environment.

## Operator Runbook

1. Apply local migration after Supabase auth is available:
   - `SUPABASE_ACCESS_TOKEN=... supabase db push --linked --dry-run`
   - `SUPABASE_ACCESS_TOKEN=... supabase db push --linked`
2. Run provider enrichment in dry-run batches first:
   - `SUPABASE_SERVICE_ROLE_KEY=... GOOGLE_PLACES_API_KEY=... node scripts/enrich-animal-hospitals-provider.js --provider google --dry-run --limit 200 --batch-size 20 --delay-ms 150 --report-output docs/qa/animal-hospital-provider-enrichment-batch.md --json-output docs/qa/animal-hospital-provider-enrichment-batch.json`
3. Only after reviewing candidate counts and quota impact, run apply mode:
   - `SUPABASE_SERVICE_ROLE_KEY=... GOOGLE_PLACES_API_KEY=... node scripts/enrich-animal-hospitals-provider.js --provider google --apply --limit 200 --batch-size 20 --delay-ms 150`
4. In admin UI, approve only:
   - phone values that normalize to valid Korean phone numbers and match official/provider detail evidence.
   - coordinates where address/name match and offset is explainable.
   - thumbnails whose official ownership/representativeness is confirmed.
   - open24Hours only with official or highly reliable explicit evidence, never hospital name string alone.
5. Reject:
   - blog/review/community photos.
   - unclear ownership thumbnails.
   - phone values with extension/noise/wrong region.
   - coordinate candidates with unexplained large offset.
6. Hold:
   - provider photos pending ownership review.
   - coordinates with plausible but not yet explainable offset.
   - open24Hours candidates from provider detail that need official source confirmation.

## Release Gate Decision

- Repo implementation, dry-run provider enrichment, local migration, Android physical-device list/detail/CTA smoke, and docs evidence are updated.
- Remote operating completion is still blocked by missing Supabase access token/service role key and direct admin-account UI operation evidence.
