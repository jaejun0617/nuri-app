# V1.0 Remaining Task/Risk Closeout

운영 메모:

- 이 문서는 v1.0 기능 기준선 evidence와 v1.1 착수 전 닫아야 하는 잔여 task/risk를 함께 관리한다.
- task18 상세 실행 순서, 캡처 파일명, 보관 규칙은 `docs/출시-준비도-회복/11-release-blocker-evidence-pack.md`를 따른다.
- v1.0은 기능 개발 Code Freeze 기준선이며 스토어 제출 완료 버전이 아니다.
- 현재 unchecked 운영/제출 항목은 신규 기능 개발이 아니며, v1.1로 넘어가기 전에 v1.0 마감 lane에서 닫는다.
- v1.1은 v1.0 미완성 이월이 아니라 신규 업데이트 트랙이다.
- 과금, Premium AI reply, Guestbook private letters 확장, Typography foundation rollout은 v1.1 신규 업데이트 후보로 관리한다.

## V1.0 기능 기준선과 잔여 task/risk closeout

- [x] V1.0 기능 개발 Code Freeze
- [x] Supabase DB Migration Dry-run / 원격 Apply
- [ ] Google/Kakao/Naver provider credential 입력과 OAuth 성공 smoke
- [ ] 운영자 QA / 실기기 최종 스모크
- [ ] 앱 스토어 출시 자산 셋업
- [ ] 최종 제출용 RC 빌드 확정
- [ ] clean artifact evidence 고정
- [x] release risk ledger 전수 정리와 남은 P0/P1/P2 재분류
  - evidence: `docs/qa/v1.0-remaining-task-risk-ledger.md`

이 항목들은 신규 기능 개발이 아니며, v1.1로 넘어가기 전에 v1.0 마감 lane에서 닫는 운영/제출 gate다.

## Supabase Migration Apply Gate

- [x] `npx supabase db push --dry-run`으로 pending migration 목록을 먼저 확인한다.
  - 결과: `Remote database is up to date.`
- [x] pending 목록에 이번 배포에서 승인된 migration만 포함되어 있는지 확인한다.
  - 결과: local migration 30개와 remote migration이 `20260429130000`까지 일치하며 local-only/remote-only migration은 없다.
- [x] 의도하지 않은 pending migration이 1개라도 있으면 remote apply를 중단한다.
  - 결과: pending migration 0개라 apply는 no-op이다.
- [x] migration 간 적용 순서가 중요한 경우 corrective/feature migration을 분리 적용할지 PO/엔지니어링 승인 후 결정한다.
  - 결과: 신규 apply 대상이 없어 no-op이다.
- [x] remote apply 후 `npx supabase migration list`로 remote 반영 여부를 확인한다.
  - 결과: post-apply migration list도 local/remote가 `20260429130000`까지 일치한다.
- [x] `npx supabase db lint --linked --schema public --fail-on error`를 실행한다.
  - 결과: error 0건, 기존 `public.delete_my_account` unused parameter warning 1건만 유지된다.
- [x] 신규/수정 RPC는 직접 호출 결과와 EXPLAIN ANALYZE evidence를 남긴다.
  - 결과: 이번 gate에서 신규/수정 RPC는 없으므로 직접 호출/EXPLAIN은 no-op이다. Supabase generated types로 public/auth catalog를 읽어 핵심 table/function signature 존재를 확인했다.
- [x] 앱에서 해당 RPC success log 또는 화면 evidence를 확보한다.
  - 결과: 신규 앱 RPC 호출 경로가 없으므로 no-op이다. 기존 animal hospital/weather/account/community evidence는 유지한다.
- [x] release note에 적용 migration, rollback 여부, 사후 검증 결과를 기록한다.
  - 결과: remote apply no-op, rollback 없음, DB release blocker 없음.

### 2026-05-06 DB release gate evidence

| 항목 | 상태 | evidence |
|---|---|---|
| local migration 목록 | closed | 30개 SQL migration, 중복 timestamp 없음, 최신 `20260429130000_weather_cache_proxy.sql` |
| remote migration list | closed | local/remote `20260329024024`부터 `20260429130000`까지 일치 |
| pre-apply db diff --linked | blocked | Supabase CLI diff가 shadow DB/temp role 경로에서 실패했다. pending migration 0개, `db push --dry-run` no-op, generated types catalog 확인으로 destructive apply risk는 no-op으로 판정한다. |
| pre-apply db lint | blocked | `npx supabase db lint`는 local Postgres `127.0.0.1:54322` 미기동으로 실패했고, linked lint 1차는 temp role auth 실패였다. remote apply가 no-op이므로 post-apply linked lint를 최종 lint evidence로 사용한다. |
| remote apply | no-op | `npx supabase db push`: `Remote database is up to date.` |
| post-apply migration list | closed | local/remote `20260429130000`까지 일치 |
| post-apply db lint | closed | `npx supabase db lint --linked --schema public --fail-on error`: error 0건, 기존 warning 1건 |
| post-apply db diff --linked | blocked | `SUPABASE_DB_PASSWORD` 미설정/temp role SASL auth 실패. remote apply가 no-op이고 migration list가 일치하므로 DB release blocker로 보지 않는다. |
| generated public/auth catalog | closed | `npx supabase gen types typescript --linked --schema public/auth` 성공 |

### 2026-05-06 RPC / DB catalog evidence

| 항목 | 확인 방식 | 결과 | release 판정 |
|---|---|---|---|
| account deletion | generated public types + applied migrations | `account_deletion_requests`, `account_deletion_cleanup_items`, `request_account_deletion`, `delete_my_account`, `claim_due_account_deletion_requests`, `execute_account_deletion_request` signature 존재 | closed |
| community moderation / reports / image cleanup | generated public types + applied migrations | `community_moderation_queue`, `community_moderation_actions`, `community_image_assets`, moderation functions signature 존재 | closed |
| animal hospital public search RPC | generated public types + applied migrations | `animal_hospital_public_search_v1` signature 존재, latest migration applied | closed |
| weather-cache DB contract | generated public types + applied migrations + functions list | `nuri_weather_cache` table 존재, `weather-cache` Edge Function ACTIVE v2 | closed |
| health report weight log / summary contract | generated public types + applied migrations | `pet_weight_logs` table, latest-weight trigger/function migration 적용 상태 | closed |
| auth/profile trigger/RLS contract | generated public/auth types + applied migrations | `profiles`, auth `users`, `handle_new_user`/`on_auth_user_created` migration contract 적용 상태 | closed |
| Guestbook 기본 방명록/letters 노출 위험 | generated public types + applied migrations | `letters` table은 user/pet 소유 모델로 남아 있고 v1.0 확장 migration 없음 | closed |

## 이미 닫힌 항목

- [x] 정책 문서 public 연결
  - 회원가입의 `이용약관`, `개인정보처리방침`, More의 `계정 삭제 안내`가 실제 public 문서를 열고 Android 실기기에서 앱 복귀까지 확인됐다.
- [x] 비밀번호 재설정 복귀
  - recovery 링크 복귀, 비밀번호 변경, `SignIn` 복귀가 Android 실기기에서 검증됐다.
- [x] 계정 탈퇴 7일 유예 기본 동선
  - 요청, 유예, 복구 가드, 보수적 안내 UX가 앱에 반영됐다.
- [x] 계정 탈퇴 자동 파기 worker
  - remote worker 배포, due request claim, finalizer, storage cleanup, `completed` 수렴까지 E2E로 검증됐다.
- [x] 커뮤니티 신고 정책과 auto-hide
  - blocked-term, stable error contract, auto-hide, reporter flag trace, moderation queue/action log, hidden 이미지 비노출이 remote 기준으로 검증됐다.
- [x] 커뮤니티 인앱 정책 notice
  - notice, helper box, 정책 팝업, 앱 복귀까지 실기기 확인이 끝났다.
- [x] 닉네임 정책과 Android 기본 레이아웃
  - 닉네임 `2..10`, Community header, Timeline 탭 유지, bottom gap 보정이 실기기 기준으로 닫혔다.
- [x] Google/Kakao/Naver OAuth 앱 코드 연결
  - SignIn/SignUp의 Kakao/Google/Naver 버튼은 placeholder Alert가 아니라 Supabase `signInWithOAuth` web flow를 시작한다.
  - OAuth callback은 `nuri://auth/callback`으로 분리했고, password reset의 `nuri://auth/reset`과 라우트를 섞지 않는다.
  - OAuth 성공 후 session 복구는 기존 Splash/AppProviders boot contract를 사용하므로 nickname/pet onboarding 분기를 새로 만들지 않는다.
  - email/password login, email signup, password reset, policy link UI는 유지한다.
  - Naver는 Supabase custom OAuth/OIDC provider id `custom:naver`를 사용한다.
  - Apple은 Android-first v1.0 범위에서 제외한다.
- [x] Social login provider release gate 갱신
  - Supabase public auth settings 기준 Google provider disabled, Kakao provider disabled 상태를 확인했다.
  - PO 정책 변경으로 Google/Kakao/Naver readiness는 앱 코드 기준 `true`로 전환했다.
  - provider disabled 상태에서는 안전한 오류 문구로 수렴하며, OAuth 성공 smoke는 provider 설정 후 별도 수행한다.
- [x] 외부 지도 전환 기본 동선
  - 장소 상세의 외부 지도 열기 동선은 PO 확인 기준 완료로 분류한다.
- [x] 건강관리 리포트 Phase 1 MVP
  - repo 구현, linked remote migration 적용, insert/update/delete/fallback row-level 검증, Android 실기기 핵심 동작이 완료됐다.
  - 적용된 remote migration은 `task7_normalize_invalid_pet_weight_snapshots`, `task7_health_report_weight_logs`이며, `pet_weight_logs` table/function/trigger와 `pets.weight_kg` latest snapshot 계약이 확인됐다.
  - 첫 insert 직후 즉시 반영, update, delete/fallback, 홈 `petStore` 최신 체중 반영, Android 키보드 back 처리가 실기기 기준으로 확인됐다.
- [x] 날씨 도메인 비용 방어
  - `20260429130000_weather_cache_proxy.sql` linked remote apply, `public.nuri_weather_cache` RLS/권한 확인, `weather-cache --no-verify-jwt` deploy, 수동 smoke, Android 실기기 홈/상세 QA까지 완료됐다.
  - 수동 smoke 기준 1차 `source=provider`, 2차 `source=fresh_cache`로 bucket당 60분 서버 캐시가 동작했다.
  - Android `SM_S937N` logcat 기준 앱 클라이언트의 Open-Meteo 직접 호출은 0건이고, `weather-cache completed source=fresh_cache`만 확인됐다.

## v1.0 잔여 task/risk 확인 항목

### 0-0. V1.0 Remaining Task/Risk Ledger

- [x] v1.0 잔여 task/risk를 단일 ledger로 고정한다.
  - P0: 0건
  - P1: 4건
  - P2: 4건
  - evidence: `docs/qa/v1.0-remaining-task-risk-ledger.md`
- [x] 반복 방지 기준을 문서화한다.
  - 이미 close된 도메인은 새 blocker 증거 없이 재오픈하지 않는다.
  - social login app-side 구현은 다시 열지 않고 provider 설정과 smoke만 본다.
  - clean RC artifact 전에는 RC smoke를 반복하지 않는다.

### 0-1. Release Evidence Pack hard-close

- [x] 2026-04-30 Android RC smoke 결과를 release evidence pack으로 고정했다.
  - 기준: dirty working tree + Android `SM_S937N`에 설치된 `com.nuri.app` `versionName=1.0`, `versionCode=1`
  - 통과: 앱 실행, 로그인 세션 진입, 홈, 타임라인, 건강관리, 산책 리스트, 동물병원, 날씨 홈/상세, 커뮤니티, 앱 재실행/복귀
  - crash/ANR: `FATAL EXCEPTION` 0건, `ANR` 0건, React Native fatal pattern 0건
  - evidence: `docs/qa/release-evidence-pack-2026-04-30.md`
- [x] linked remote read-only evidence를 release evidence pack으로 고정했다.
  - `supabase migration list --linked`: local/remote `20260429130000`까지 일치
  - `supabase db lint --linked --schema public --fail-on error`: error 없음, 기존 `delete_my_account` unused parameter warning만 확인
  - `supabase functions list`: `weather-cache` ACTIVE v2 확인
- [ ] v1.0 잔여 task/risk closeout에서 clean RC artifact 기준 evidence를 최종 release candidate build로 고정한다.
  - 현재 RC smoke는 dirty working tree 기준이다.
  - 이 항목은 신규 기능 개발이 아니라 v1.0 마감 evidence gate다.

### 0-2. Google/Kakao/Naver OAuth provider setup gate

- 판정
  - Google: `ready-for-PO-action`, 사용자 화면 노출. App-side entrypoint는 닫혔고 Supabase Google provider는 현재 disabled다.
  - Kakao: `ready-for-PO-action`, 사용자 화면 노출. App-side entrypoint는 닫혔고 Supabase Kakao provider는 현재 disabled다.
  - Naver: `ready-for-PO-action`, 사용자 화면 노출. Supabase `custom:naver` authorize는 Naver authorize endpoint로 redirect된다.
  - Apple: `HIDE_FOR_V1`
- [x] Google/Kakao/Naver provider console setup guide와 보안/API 방어 기준을 고정한다.
  - evidence: `docs/auth/social-provider-console-setup-guide.md`
  - Google/Kakao/Naver credential 발급 절차, Supabase provider 입력 위치, callback/redirect 정합성, secret 미노출 원칙을 한 문서로 묶었다.
  - Social login app-side 구현은 재오픈하지 않는다.
- [ ] PO가 Google/Kakao provider console, API key/secret, redirect allow-list를 실제 운영 값으로 준비한다.
  - Google: Google Cloud Project, OAuth consent screen, Web OAuth Client ID/Secret, Android OAuth Client ID, `com.nuri.app`, SHA-1/SHA-256, Privacy Policy/Terms URL.
  - Kakao: Kakao Developers 앱, Kakao Login 활성화, REST API Key, Client Secret, Supabase callback URL Redirect URI 등록, 동의항목 설정, 필요 시 Biz App/앱 정보 검토.
  - Supabase Auth: Google/Kakao provider enable, provider별 client id/secret 등록, Redirect URLs allow list에 `nuri://auth/callback` 등록.
  - 실제 key/secret 값은 repository와 release evidence에 기록하지 않는다.
- [ ] PO가 Naver provider 준비물을 확정한다.
  - Naver Developers 애플리케이션, Client ID, Client Secret, Callback URL, API 권한, 프로필/email 동의, 개인정보처리방침 URL을 준비한다.
  - Supabase custom OAuth/OIDC provider id는 `custom:naver`다.
  - Naver app-side entrypoint는 구현됐으며 Supabase authorize endpoint는 Naver authorize flow까지 진입한다.
- [ ] provider 설정 완료 후 OAuth 성공 smoke를 별도 evidence로 남긴다.
  - 버튼 탭, provider web flow 진입, 앱 복귀, Supabase session 복구, nickname/pet onboarding 분기를 확인한다.
  - provider 설정 전 실패는 앱 코드 blocker가 아니라 provider setup 대기 상태로 분리한다.
- [x] social OAuth V1.0 약관/개인정보처리방침 고지 UI를 추가한다.
  - Google/Kakao/Naver social login 버튼 하단에 이용약관/개인정보처리방침 확인 및 동의 간주 문구를 표시한다.
  - 기존 정책 링크 source를 재사용한다.
  - v1.0에서는 별도 social consent DB snapshot, 신규 migration, 신규 RPC를 열지 않는다.

### 0. 정적 검증 / 빌드 스냅샷

- [x] `yarn tsc --noEmit` 통과
- [x] `yarn lint` 통과
  - error 0건, warning 4건
- [x] `yarn test --watchAll=false --watchman=false` 통과
  - 2026-04-23 기준 35 suites, 128 tests 통과
- [x] `yarn test:qa` 통과
  - 9 suites, 25 tests 통과
- [x] Android release build 가능
  - `./gradlew assembleRelease` 성공, `android/app/build/outputs/apk/release/app-release.apk` 생성
- [x] Android 단독 실행 smoke
  - adb 연결 기기 `R5CY613NMSY`에서 `com.nuri.app/com.nuri.MainActivity` foreground 확인
- [x] Supabase env 연결 상태
  - tracked config가 linked remote host를 가리키며 `auth/v1/health` 200 응답 확인

### 1. v1.0 잔여 task: 운영자 QA / 실기기 최종 스모크 세부 체크

- [ ] 산책, 장소, 동물병원의 리스트와 상세를 Android 실기기에서 다시 열고 캡처를 남긴다.
- [ ] 공개 라벨과 `내 상태`가 섞여 보이지 않는지 확인한다.
- [ ] stale/conflict 문구가 과한 확신처럼 읽히지 않는지 확인한다.
- [ ] 지도 미리보기와 외부 지도 버튼 역할이 충돌하지 않는지 확인한다.
- [ ] 긴 설명 `더보기/접기`와 스크롤 체감을 캡처한다.
- [x] 동물병원 Android debug build/install/start, More -> 리스트 -> 상세, 리스트 주소 미노출, 좌측 정렬, 좌표 미승인 fallback smoke를 `SM_S937N`에서 확인했다.
  - evidence: `docs/qa/animal-hospital-android-smoke-2026-04-22.md`
- [x] 동물병원 approved phone `tel:` CTA, approved coordinates 길찾기 CTA, approved thumbnail public 노출을 `24시 마이동물의료센터` 샘플로 캡처했다.
  - evidence: `docs/qa/android-animal-hospital-approved-thumbnail-list-2026-04-22.png`
  - evidence: `docs/qa/android-animal-hospital-approved-thumbnail-detail-2026-04-22.png`
  - evidence: `docs/qa/android-animal-hospital-approved-tel-2026-04-22.png`
  - evidence: `docs/qa/android-animal-hospital-approved-map-2026-04-22.png`
- [x] 동물병원 P0-P2 후속 UI/검색/CTA smoke를 `SM_S937N`에서 다시 확인했다.
  - 확인: 최근검색어 미노출, 리스트 주소 미노출, `가까운순/24시 운영/특수동물병원` 칩, verified 24시 필터, `VIP` 전국 검색, 하이픈 전화번호, `tel:` dialer intent, 길찾기 resolver, 지도 preview
  - evidence: `docs/qa/animal-hospital-android-smoke-2026-04-22.md`
  - evidence: `docs/qa/animal-hospital-p0-p2-closeout-2026-04-22.md`
- [x] 동물병원 provider/admin/location 보강 후 Android 실기기 재캡처를 `SM_S937N`에서 확인했다.
  - 확인: 리스트 주소 미노출, 좌측 정렬/세로 중앙, `031-945-5000` 하이픈 표시, 상세 hero/전화/길찾기/지도 preview, `tel:` dialer, 지도 resolver, 지도 열기 resolver
  - evidence: `docs/qa/animal-hospital-provider-location-admin-closeout-2026-04-23.md`
  - evidence: `docs/qa/animal-hospital-android-smoke-2026-04-23.md`
- [x] 동물병원 v1.0 public search RPC와 closeout 문서화를 완료했다.
  - linked remote에 `20260428120000_animal_hospital_public_search_rpc_v1.sql`, `20260428123000_fix_existing_rpc_ambiguous_columns.sql`이 동시에 적용됐고, 결과는 정상으로 사후 검증됐다.
  - `supabase db lint --linked --schema public --fail-on error` 통과, 기존 ambiguous column error 제거, `animal_hospital_public_search_v1` 직접 호출, EXPLAIN ANALYZE keyword/nearby path, Android list/search/filter/detail smoke, `NURI-RPC-SUCCESS` logcat을 확인했다.
  - Android 동물병원 상세의 Google Maps native preview는 v1.0 공식 UX에서 제외하고, `위치 정보 준비 중이에요. 길찾기로 외부 지도에서 확인해 주세요.` fallback을 공식 UX로 확정했다. 이는 임시 크래시 회피가 아니라 `INVALID_ARGUMENT` 재발 방어 목적의 v1.0 결정이며, 전화/길찾기/외부 지도 CTA는 유지한다.
  - native Google Maps preview 정식 복원은 API key/package/SHA 정리 후 v1.1 P2 backlog로 넘긴다.
  - evidence: `docs/qa/animal-hospital-v1-evidence-pack-2026-04-28.md`
- [x] 날씨 홈/상세 Android 실기기 smoke와 API 비용 방어 검증을 `SM_S937N`에서 완료했다.
  - 확인: 홈 날씨 카드 데이터 렌더링, 상세 `오늘의 날씨` 진입, 미세먼지/주간 예보/대기 질 정보 렌더링, 홈/상세 `날씨 데이터: Open-Meteo` attribution 노출.
  - logcat 확인: `weather-cache completed`, `source=fresh_cache`, `hasAirQuality=true`, Open-Meteo direct URL 0건.
  - evidence source of truth: `docs/domains/weather-api-cost-defense.md`

### 1-1. 동물병원 DB migration release note

- 2026-04-28 동물병원 DB 안정화 과정에서 아래 2개 migration이 Linked Remote DB에 동시에 적용됐다.
  - `20260428120000_animal_hospital_public_search_rpc_v1.sql`
  - `20260428123000_fix_existing_rpc_ambiguous_columns.sql`
- 원래는 corrective migration 단독 적용 후 public search RPC 적용이 더 보수적인 순서였으나, v1.0 출시 전 제품 판단에 따라 동시 적용을 승인했다.
- rollback은 수행하지 않았다.
  - `supabase db lint --linked --schema public --fail-on error` 통과
  - 기존 ambiguous column error 제거
  - `animal_hospital_public_search_v1` RPC 직접 호출 성공
  - EXPLAIN ANALYZE에서 keyword path pg_trgm index 확인
  - nearby path coordinate partial index + bbox + Haversine distance sort 확인
  - Android 리스트/search/filter/detail smoke 통과
  - `NURI-RPC-SUCCESS` logcat 확인
- 결과는 정상이나, 다음 DB migration부터는 pending migration 목록이 의도와 다르면 remote apply를 중단한다.

### 2. 운영 증적 패키지 마감 세부 체크

- [x] `place-enrichment-worker` background cron lane을 remote에 배포하고 수동 trigger 1회를 성공시킨다.
  - linked remote에 `place-enrichment-worker` Edge Function을 배포했고, `register_place_enrichment_worker_schedule()`로 `*/10 * * * *` pg_cron job을 등록했다. 등록 job id는 `2`다.
  - 2026-04-24 수동 trigger 결과 `limit=3`, `maxUnits=6`, `processed=3`, `enriched=3`, `errors=0`, `chargedUnits=6`을 확인했다.
  - cron budget row는 `track=cron`, `budget_month=2026-04-01`, `request_count=3`, `budget_units=6`으로 증가했다.
- [ ] 계정 탈퇴 worker의 실제 cron 자동 tick 1회 증적을 남긴다.
- [ ] 계정 탈퇴 최종 상태 캡처를 release 보관본으로 정리한다.
- [ ] `community_moderation_queue`, `community_moderation_actions`, `community_image_assets` row-level 캡처를 남긴다.
- [x] `qa-task4-*` 테스트 데이터 정리 또는 격리 근거를 남긴다.
  - `cleanup_v1_release_garbage_data()`와 storage remove를 통해 QA post 18건, report 12건, moderation queue 8건, moderation action 2건, image asset 2건, historical garbage pet 1건을 hard delete 했다.
  - 후검증 기준 target post/report/queue/action/asset/pet 잔존 row는 모두 `0`이다.

### 3. 모니터링/배포 필수 설정

- [x] Sentry는 v1.0 Android 단독 출시에서 보류하고 앱 전송 경로를 비활성화한다.
  - `src/services/monitoring/sentry.ts`는 `sentryEnabled = false`로 잠겨 있고, 이번 턴에도 그대로 유지했다.
- [x] Android `google-services.json` 배치 상태를 확인한다.
- [x] iOS `GoogleService-Info.plist`는 v1.1 iOS 출시 항목으로 이관한다.
- [x] Firebase Crashlytics는 Android release crash 수집용으로 유지한다.
  - `firebase.json` 기본 auto collection을 `false`로 내리고, 런타임에서 release 환경일 때만 `setCrashlyticsCollectionEnabled(true)`를 호출한다.
  - `android/app/build.gradle`의 `firebaseCrashlytics` 설정은 debug에서 upload 비활성화, release에서만 mapping upload 활성화로 고정했다.
- [x] Android release signing config를 upload key 기준으로 전환한다.

### 4. v1.0 잔여 task: 스토어 제출 자산

- 스토어 출시 자산 세팅은 v1.1 착수 전 v1.0 마감 lane에서 닫는 task다.
- 이 섹션은 최종 QA/실기기 smoke, 최종 RC build, clean artifact evidence가 준비되는 v1.0 잔여 task/risk closeout에서 닫는다.
- [x] 앱 아이콘 최종본을 확정한다.
- [x] 스플래시 화면 최종본을 확정한다.
- [ ] 앱스토어/플레이스토어 스크린샷을 준비한다.
- [ ] 스토어 설명문, 문의처, 정책 URL을 최종 점검한다.

### 5. 출시 후보 빌드 smoke

- [x] 로그인 세션 진입은 Android RC smoke에서 확인했다.
  - 가입/로그아웃은 기존 auth evidence와 PO 판단 대상이며, 이번 hard-close 턴에서 재수행하지 않는다.
- [x] 비밀번호 재설정, 탈퇴, 커뮤니티 기본 동선은 기존 evidence를 인정한다.
  - 파괴적 플로우는 이번 hard-close 턴에서 재수행하지 않는다.
- [x] 홈, 타임라인, 산책/동물병원, 날씨, 커뮤니티 진입은 Android RC smoke에서 확인했다.
  - 상세 내용은 `docs/qa/release-evidence-pack-2026-04-30.md`에 고정한다.
- [x] 건강관리 진입은 Android RC smoke에서 확인했다.
  - 건강기록/체중 CRUD/fallback은 기존 Phase 1 evidence를 인정하며, 이번 hard-close 턴에서 재수행하지 않는다.

## v1.1 업데이트 백로그

- 아래 항목은 v1.0 미완성 이월이 아니라 신규 업데이트 후보로 관리한다.

- [ ] Entitlement / billing foundation
  - 실제 결제/과금 구조는 v1.0에서 열지 않고 v1.1 신규 업데이트 후보로 관리한다.
- [ ] Premium AI reply 선행조건
  - AI reply는 v1.0에서 열지 않고 notice/consent/generation log/provider policy를 v1.1에서 별도 설계한다.
- [ ] Guestbook private letters 확장 아키텍처
  - v1.0에서는 기존 단순 방명록 상태로 출시하고 상세/수정/삭제/AI reply 확장은 v1.1 후보로 둔다.
- [ ] Typography foundation rollout
  - v1.0에서는 폰트/타이포 전면 리디자인을 진행하지 않고 v1.1 시각 정비 트랙으로 둔다.
- [ ] 장소/동물병원 `confirmed` 개방 검토
- [ ] 동물병원 admin 계정 조작 증적
- [ ] 커뮤니티 preview batch 최적화
- [ ] 운영자용 moderation/admin UI
- [ ] auth/account baseline-history 정리
- [ ] 외부 API 키 통제, 환경 분리, 운영 도구 정리
- [ ] 건강관리 메뉴 전환
- [ ] 타임라인 건강 입력 제거
- [ ] 생활 병원/약 이관
- [ ] 건강관리 전용 기록하기
- [ ] premium 인사이트 연결
- [ ] Open-Meteo customer API key/계약 확인
  - v1.0 blocker는 아니나 운영 고도화 항목이다.
- [ ] `weather-cache` public endpoint abuse throttle/rate limit
  - v1.0 blocker는 아니나 운영 고도화 항목이다.
- [ ] Apple social login backlog
  - Apple은 Android-first v1.0 범위에서 제외하며 iOS 출시 및 Apple 정책 검토 시점에 별도 판단한다.
