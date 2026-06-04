# V1.0 Remaining Task/Risk Closeout

운영 메모:

- 이 문서는 v1.0 기능 기준선 evidence와 v1.1 착수 전 닫아야 하는 잔여 task/risk를 함께 관리한다.
- 2026-06-02 KST 기준 exact release APK 설치 smoke와 일반 사용자 최종 smoke, 동물병원 admin/super_admin 운영자 서버 조작 QA는 수행됐다.
- 2026-06-04 KST 기준 `profiles.role` self-escalation은 corrective migration과 remote 회귀 테스트로 차단했다.
- Play Store 제출 자산은 이번 QA closeout 범위에서 제외하며, 기능/QA blocker가 아니라 final submission prep으로 분류한다.
- task18 상세 실행 순서, 캡처 파일명, 보관 규칙은 `docs/출시-준비도-회복/11-release-blocker-evidence-pack.md`를 따른다.
- v1.0은 기능 개발 Code Freeze 기준선이며 스토어 제출 완료 버전이 아니다.
- 현재 unchecked 운영/제출 항목은 신규 기능 개발이 아니며, v1.1로 넘어가기 전에 v1.0 마감 lane에서 닫는다.
- v1.1은 v1.0 미완성 이월이 아니라 신규 업데이트 트랙이다.
- 과금, Premium AI reply, Guestbook private letters 확장, Typography foundation rollout은 v1.1 신규 업데이트 후보로 관리한다.

## V1.0 기능 기준선과 잔여 task/risk closeout

- [x] V1.0 기능 개발 Code Freeze
- [x] Supabase DB Migration Dry-run / 원격 Apply
- [x] 지도/API 비용 방어 V1.0 provider runtime 차단 repo contract 반영
- [x] Naver OAuth V1.0 public surface soft disable
- [x] 운영자 QA / 실기기 최종 스모크
  - 2026-06-02 release APK를 기존 debug 설치본 uninstall 후 설치했고, release 앱에서 홈, 타임라인, 커뮤니티, 편지함, 전체메뉴, 건강관리, 산책 리스트/상세, 동물병원 리스트/상세/전화/길찾기를 crash 없이 확인했다.
  - admin/super_admin QA 세션에서 `동물병원 운영` 메뉴, 운영 화면 summary, review queue 표시를 확인했다.
  - approve/reject/held/action log/public projection은 동일 admin 세션의 Supabase RPC로 확인했다. UI 버튼 직접 탭 3회 증적은 ADB 입력/필터 불안정으로 P2 evidence gap으로 분류한다.
- [x] V1.0 P0 보안 blocker 수정
  - 2026-06-02 QA admin 세션 확보 중 authenticated 사용자가 public client로 자기 `profiles.role`을 `super_admin`으로 갱신할 수 있음을 확인했다.
  - 2026-06-04 `20260604090000_block_profile_role_self_escalation.sql`을 remote에 적용해 public client의 role insert/update를 DB trigger에서 차단했다.
  - 일반 authenticated role update는 `PROFILE_ROLE_UPDATE_FORBIDDEN`으로 거부됐고, 일반 profile update는 유지됐으며, 악성 role update 후 admin RPC는 `ANIMAL_HOSPITAL_ADMIN_REQUIRED`로 거부됐다.
- [ ] 앱 스토어 출시 자산 셋업
  - 이번 QA closeout 범위에서는 제외한다. 기능/QA blocker가 아니라 final submission prep이다.
- [x] 최종 제출용 RC 빌드 확정
  - 2026-05-29 `./gradlew assembleRelease`는 성공했고 `android/app/build/outputs/apk/release/app-release.apk`를 생성했다.
  - APK SHA-256: `1eb37508359fec609266e7a17205f0b7516861e2333100ca74af80b92e60694c`
  - 2026-06-02 기존 debug 서명 설치본을 uninstall한 뒤 동일 release APK를 설치했다.
  - 설치된 base APK SHA-256은 release artifact와 동일하고, signer는 NURI Upload certificate이며, installed package flags에서 `DEBUGGABLE`이 제거된 것을 확인했다.
- [x] final RC evidence baseline 고정
  - evidence: `docs/qa/final-rc-evidence-2026-05-29.md`
  - project report: `docs/qa/nuri-project-report-2026-05-29.md`
  - 최종 제출용 release build artifact/provenance는 위 `최종 제출용 RC 빌드 확정`에서 별도로 닫는다.
- [x] release risk ledger 전수 정리와 남은 P0/P1/P2 재분류
  - evidence: `docs/qa/v1.0-remaining-task-risk-ledger.md`

이 항목들은 신규 기능 개발이 아니며, v1.1로 넘어가기 전에 v1.0 마감 lane에서 닫는 운영/제출 gate다.

## 지도/API 비용 방어 Release Gate

- [x] production Google Places runtime 호출 차단 repo contract를 반영한다.
  - `NURI_PLACE_ENRICHMENT_HARD_CAP` 미설정 또는 `0`이면 `place-enrichment-demand`가 Google Places/Text Search/Photo fetch를 수행하지 않고 existing/canonical 값으로 safe skip한다.
  - 명시적으로 양수 hard cap을 설정한 환경에서만 provider runtime이 열린다.
- [x] `place-enrichment-worker` cron이 hard cap 0에서 외부 provider 호출 없이 no-op으로 종료되는 repo contract를 반영한다.
  - worker는 hard cap 0이면 background target claim 전에 `processed=0`, `requested=0`, `providerRuntimeDisabled=true` summary로 종료한다.
  - production cron 자체 pause는 remote 운영 설정이므로 DB migration으로 처리하지 않는다.
- [x] Google Place Photos 기반 썸네일 runtime 보강 중단 contract를 반영한다.
  - hard cap 0에서는 cached/provider photo overlay도 반환하지 않고, 화면은 기존 canonical/approved thumbnail 또는 placeholder만 사용한다.
- [x] 동물병원 Localdata canonical/approved 데이터 fallback을 유지한다.
  - 리스트 UX는 `썸네일`, `동물병원` label, 병원명, 전화번호, 주소 미노출, 텍스트 좌측 정렬, 카드 내부 세로 중앙 정렬 결정을 유지한다.
  - 상세 UX는 주소, 전화 CTA, 길찾기 CTA를 유지하고 provider 미검수 운영정보를 열지 않는다.
- [x] 길찾기 외부 앱 deep link 위임 결정을 유지한다.
  - 앱 내부 route API를 새로 열지 않고 기존 외부 지도 앱 resolver 동선을 사용한다.
- [x] 산책/location discovery runtime fan-out 방어를 보강한다.
  - 앱 클라이언트는 Kakao REST key를 직접 쓰지 않고 `location-discovery-seed`만 호출한다.
  - 클라이언트 요청 캐시와 Edge Function URL 캐시를 추가해 동일 keyword/address/coord2region 요청 반복 호출을 줄인다.
- [x] linked production Edge Function 배포 상태를 확인한다.
  - 2026-05-27 KST remote 기준 `place-enrichment-demand` ACTIVE v12, `place-enrichment-worker` ACTIVE v9, `location-discovery-seed` ACTIVE v10으로 재배포했다.
  - `place-enrichment-demand` 직접 POST smoke는 function JWT 요구와 현재 shell의 사용자 JWT 부재로 `UNAUTHORIZED_INVALID_JWT_FORMAT`까지 확인했다. 앱 로그인 사용자 세션 기준 Android smoke는 별도 실기기 gate에 포함한다.
- [x] production secret 상태를 확인한다.
  - `NURI_PLACE_ENRICHMENT_HARD_CAP=0`으로 설정했다. `secrets list` digest가 `0`의 SHA-256과 일치한다.
  - `GOOGLE_PLACES_API_KEY`는 production secret에서 제거했다. `GOOGLE_MAPS_API_KEY`는 production secret 목록에 없다.
- [x] provider key 누락 또는 hard cap 0 상태에서 앱 crash 없음 확인을 Android smoke에 포함한다.
  - 2026-05-27 KST Android 실기기 `R5CY613NMSY` / `SM_S937N`, `com.nuri.app` `versionName=1.0`, `versionCode=1`, 로그인 사용자 `test님` 세션 기준으로 확인했다.
  - 동물병원: More -> `우리동네 동물병원` -> 리스트 -> 상세 -> `전화하기` -> `길찾기`를 직접 조작했다. 리스트는 `동물병원` label, 병원명, 전화번호 또는 `전화번호 확인 중`만 표시하고 주소는 노출하지 않았다. 상세는 주소, 전화 CTA, 길찾기 CTA를 표시했다.
  - 전화 CTA는 `com.skt.prod.dialer` dialer intent로 위임됐고, 길찾기 CTA는 Android resolver에 네이버지도, 지도, 카카오맵, TMAP 선택지를 표시했다.
  - 산책/location discovery: More -> `우리동네 산책 장소 찾기` -> `우리동네 산책 리스트` -> `산책 장소 상세`를 직접 조작했다. 결과 카드, 상세, 지도 미리보기, 주변 산책 장소 영역은 crash 없이 표시됐다.
  - logcat `/tmp/nuri-smoke-logcat.txt`: `fatal=0`, `promise=0`, `places=0`, `direct_google_api=0`, `place-enrichment-demand called=1`, `place-enrichment-demand skipped=1`, `location-discovery-seed called=10`, `location-discovery-seed completed=10`.
  - 관찰된 `Unhandled SoftException` 10건은 `react-native-fast-image`의 React Native New Architecture interop warning이며 fatal crash, promise rejection, Places/Photos provider 호출은 아니다. V1.0 지도/API 비용 방어 gate blocker로 분류하지 않는다.

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
  - SignIn/SignUp의 Kakao/Google 버튼은 placeholder Alert가 아니라 Supabase `signInWithOAuth` web flow를 시작한다.
  - Naver는 `signInWithNaver()`와 provider mapping code를 유지하지만 V1.0 public surface에서는 버튼을 숨긴다.
  - OAuth callback은 `nuri://auth/callback`으로 분리했고, password reset의 `nuri://auth/reset`과 라우트를 섞지 않는다.
  - OAuth 성공 후 session 복구는 기존 Splash/AppProviders boot contract를 사용하므로 nickname/pet onboarding 분기를 새로 만들지 않는다.
  - email/password login, email signup, password reset, policy link UI는 유지한다.
  - Naver는 Supabase custom OAuth/OIDC provider id `custom:naver`를 사용한다.
  - Apple은 Android-first v1.0 범위에서 제외한다.
- [x] Social login activation-ready 코드 계약 고정
  - Google/Kakao/Naver provider mapping은 앱 코드에서 각각 `google`, `kakao`, `custom:naver`로 고정한다.
  - Google/Kakao readiness flag 기본값은 `true`, Naver readiness flag 기본값은 `false`다.
  - Naver는 env가 실수로 켜져도 V1.0 public-surface guard에서 닫힌다.
  - readiness false provider는 SignIn/SignUp 화면에서 숨기고, 직접 함수 호출도 `provider_setup_required`로 안전하게 중단한다.
  - readiness true 전환 후에는 기존 Supabase OAuth web flow와 `nuri://auth/callback`을 그대로 사용한다.
  - public readiness flag는 `.env.example`에 boolean으로만 기록하며 secret 값은 기록하지 않는다.
- [x] Social login provider release gate 갱신
  - PO credential 입력 후 Google/Kakao는 V1.0 public provider로 고정한다.
  - Naver는 V1.0 public surface에서 soft disable하고, 성공 session smoke 미완료를 V1.0 blocker로 보지 않는다.
  - OAuth 성공 smoke는 Google/Kakao만 V1.0 release gate로 본다.
- [x] Social provider console 직접 확인 결과를 release gate에 반영한다.
  - 2026-05-11 Chrome 기준 Google Cloud Console은 당시 선택 project의 결제 계정 문제로 `재검토 요청` 화면에 막혀 OAuth credential 생성이 불가했다. 이후 PO 결정에 따라 해당 테스트 계정/project는 NURI OAuth 경로에서 격리한다.
  - Kakao Developers `Nuri-app`은 존재하지만 Kakao Login, 동의항목, 간편가입, 연결 해제 설정이 모두 `설정 안 함`이다.
  - Naver Developers `nuri_app`은 존재하고 네이버 로그인 API, 연락처 이메일 필수 항목, Android package `com.nuri.app`이 확인됐다. Supabase OAuth용 PC/모바일 웹 Callback URL 보강은 PO action required다.
  - Supabase Dashboard 기준 Google/Kakao provider는 disabled, Custom provider `custom:naver`는 Enabled, Redirect URLs에는 `nuri://auth/reset`과 `nuri://auth/callback`이 등록되어 있다.
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
  - 2026-06-04 기준 P0: 0건
  - 2026-06-02 기준 P1: 0건
  - 2026-06-02 기준 P2: 5건
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
- [x] v1.0 final RC evidence baseline을 고정한다.
  - 기준: 2026-05-29 KST, branch `codex/task6-community-content-policy`, HEAD `c03edd0`
  - 포함: worktree 시작 상태, 수정 파일 목록, 최소 검증 명령, Android 기기 정보, V1.0 provider 최종 상태, Naver soft disable, pet date UX, V1.1 이동 항목
  - evidence: `docs/qa/final-rc-evidence-2026-05-29.md`
  - 최종 제출용 release build artifact와 설치 앱 version/signing provenance는 `최종 제출용 RC 빌드 확정`에서 별도로 닫는다.

### 0-2. Google/Kakao OAuth provider setup gate + Naver soft disable

- [x] 2026-05-28 PO 최종 결정 기준 V1.0 public social provider를 Google + Kakao로 확정한다.
  - `.env.example`과 `src/services/supabase/socialOAuthConfig.ts` 기준 Google/Kakao readiness flag 기본값은 `true`, Naver는 `false`다.
  - Naver는 env 오입력 방지용 public-surface guard에서도 닫는다.
  - SignIn/SignUp 화면에서 `카카오로 시작하기`, `Google로 시작하기`만 V1.0 public entrypoint로 노출한다.
  - Supabase authorize endpoint smoke history: Google은 `accounts.google.com`, Naver는 `nid.naver.com`, Kakao는 `kauth.kakao.com`으로 HTTP 302 이동한 이력이 있다. V1.0 public provider scope는 Google/Kakao만 유지한다.
- [x] Google Android 실기기 성공 smoke를 수행한다.
  - Android 실기기 `R5CY613NMSY` / `SM_S937N`에서 Google 버튼 탭, provider web flow, 앱 복귀, session 생성, 기존 사용자 홈 진입을 확인했다.
  - 2026-05-28 같은 실기기에서 Google 버튼 노출과 account chooser web flow 진입, back/cancel 복귀 crash 없음도 재확인했다.
  - secret/client id/client secret/token 전체값은 문서와 로그에 기록하지 않는다.
- [x] Kakao Android 실기기 성공 smoke와 닉네임/프로필 UX를 확인한다.
  - Android 실기기에서 Kakao 버튼 탭, provider web flow, 앱 복귀, session 생성을 확인했다.
  - Kakao 신규 사용자 계정은 nickname/provider profile image 선택 동의값이 없어도 `NicknameSetup`으로 진입했고, `nuri0527` 닉네임 중복확인/저장 후 `PetCreate` 온보딩으로 이동했다.
  - 2026-05-28 같은 실기기에서 Kakao 신규 사용자 `kakao0528` 닉네임 중복확인/저장, `PetCreate`, `KakaoPet` 테스트 펫 등록, 홈 진입까지 확인했다.
  - V1.0 NURI 사용자 표시 source of truth는 provider metadata가 아니라 앱 내부 confirmed profile이다. public community author surface는 confirmed nickname만 사용하고 provider avatar는 자동 노출하지 않는다.
- [x] Naver Android 실기기 성공 smoke를 V1.0 범위에서 제거하고 public entrypoint를 soft disable한다.
  - Android 실기기에서 Naver 버튼 노출, `custom:naver` authorize 302, Naver web flow 진입, 앱 복귀 crash 없음은 확인했다.
  - Naver 페이지에서 `pet_nuri 서비스 설정 오류`가 표시되어 session 생성 전 차단됐다.
  - 2026-05-28 PO 결정에 따라 Naver는 V1.0 제외/soft disable로 분류한다. Supabase `custom:naver` provider와 관련 코드는 hard delete하지 않는다.
  - 2026-05-28 Android SignIn 화면에서 Naver 버튼 미노출을 확인했다.

- [x] PetCreate/PetProfileEdit 날짜 직접 입력 UX를 V1.0에 반영한다.
  - 공통 DatePicker modal은 `YYYY-MM-DD` 직접 입력, calendar/input state sync, invalid date validation, maximum date guard를 제공한다.
  - PetCreate와 PetProfileEdit 날짜 모달에는 `날짜 직접 입력`, `과거 날짜는 YYYY-MM-DD로 입력` 안내가 표시된다.
  - Android 실기기에서 `2010-99-99` 입력 시 `월은 1~12 사이에서 입력해 주세요.` 오류가 표시되어 저장이 막혔다.
  - Android 실기기에서 `2010-05-12` 입력 후 적용했고, PetCreate 저장 후 홈 카드에 `생년월일 2010.05.12`가 표시됐다.
  - DatePicker 라이브러리 교체, DB migration, 펫 등록 전체 재설계는 수행하지 않았다.

- 판정
  - Google: `closed`. App-side entrypoint, Supabase authorize, Android success session smoke까지 닫혔다.
  - Kakao: `closed`. App-side entrypoint, Supabase authorize, Android success session smoke, 닉네임 미확정 온보딩 분기까지 닫혔다.
  - Naver: `soft-disabled-for-v1`. App-side entrypoint와 Supabase authorize 302는 운영 히스토리로 남기고, V1.0 public surface에서는 버튼을 숨긴다.
  - Apple: `HIDE_FOR_V1`
- [x] Google 테스트 계정과 `My First Project` 비용 리스크를 NURI 운영 OAuth 경로에서 분리한다.
  - 현재 Chrome Google 계정은 테스트 계정이며 NURI 운영 계정으로 사용하지 않는다.
  - `My First Project`는 2026년 4월 Places API (New) 과금 `₩112,214` 이력이 있어 OAuth용으로 재사용하지 않는다.
  - 비용 원인은 Google social login이 아니라 Places API Text Search Enterprise, Place Details Photos, VAT다.
  - 새 NURI Google 계정의 OAuth-only project에서는 Google Maps/Places API를 활성화하지 않는다.
- [x] Google/Kakao/Naver provider console setup guide와 보안/API 방어 기준을 고정한다.
  - evidence: `docs/auth/social-provider-console-setup-guide.md`
  - Google/Kakao/Naver credential 발급 절차, Supabase provider 입력 위치, callback/redirect 정합성, secret 미노출 원칙을 한 문서로 묶었다.
  - Social login app-side 구현은 재오픈하지 않는다.
- [x] PO가 Google/Kakao provider console, API key/secret, redirect allow-list를 실제 운영 값으로 준비한다.
  - Google: NURI 전용 신규 Google 계정을 만들고, `NURI Auth` 또는 `NURI OAuth` project에서 OAuth consent screen/Web OAuth Client ID/Secret/Android OAuth Client ID, `com.nuri.app`, SHA-1/SHA-256, Privacy Policy/Terms URL을 준비한다. Authorized redirect URI는 `https://grmekesqoydylqmyvfke.supabase.co/auth/v1/callback`이다.
  - Kakao: 기존 Kakao Developers `Nuri-app`에서 Kakao Login 활성화, REST API Key 확인, Client Secret 활성화, Supabase callback URL Redirect URI 등록, 동의항목 설정, 필요 시 Biz App/앱 정보 검토를 완료한다.
  - Supabase Auth: Google/Kakao provider enable, provider별 client id/secret 등록을 완료한다. Redirect URLs allow list의 `nuri://auth/callback`은 2026-05-11 기준 등록 완료다.
  - 실제 key/secret 값은 repository와 release evidence에 기록하지 않는다.
- [x] Naver provider 준비물 성공 session 확정은 V1.0 범위에서 제거한다.
  - Naver Developers `pet_nuri` 서비스 설정 오류 해소는 V1.1 또는 출시 후 운영 설정 안정화/cleanup 작업으로 이동한다.
  - Supabase custom OAuth/OIDC provider id `custom:naver`는 유지하지만, 앱 public surface에서는 버튼을 숨긴다.
- [x] Naver provider 설정 완료 후 OAuth 성공 smoke는 V1.1 또는 출시 후 evidence로 분리한다.
  - V1.0에서는 Naver 버튼 탭 성공 session을 요구하지 않는다.
  - Google/Kakao 성공 smoke와 Kakao 신규 사용자 온보딩/pet registration smoke는 Android evidence로 닫혔다.
- [x] 2026-05-27 pre-credential Android OAuth readiness closeout 기록을 유지한다.
  - credential 입력 전 상태에서는 readiness false로 깨진 provider 버튼을 숨기고, callback failure route가 Alert 후 SignIn으로 안전하게 복귀하는 것을 확인했다.
  - 이 기록은 credential 완료 전 release-safe evidence이며, 현재 V1.0 판정은 위 2026-05-27 success smoke 항목을 우선한다.
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
