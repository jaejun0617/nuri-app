# V1.0 Remaining Task/Risk Closeout

## 2026-07-23 날씨 상세 지표 낮/밤 색상 release gate

- [x] 체감·습도·바람·자외선 지표의 낮 색상 `#111827` 적용.
- [x] 체감·습도·바람·자외선 지표의 밤 색상 `#FFFFFF` 분기 적용.
- [x] Android `SM_S937N / R5CY613NMSY` 최신 APK 설치·cold start·Home 카드 확인.
- [x] 최신 APK SHA-256 `4593f7f875486a1312528f722a7bc25caa310dcb346fe1c0ad0be1ad628676e2`.
- [x] Jest `67 suites / 269 tests`, typecheck, lint, release build/install 통과.
- [x] app-scoped fatal scan 0건.

증적: `/tmp/nuri-qa/weather-detail-metrics-daynight-20260723.png`, `/tmp/nuri-qa/weather-detail-metrics-daynight-20260723-logcat.txt`.

## 2026-07-23 날씨카드 38px·카드 여유 공간 최종 release gate

- [x] 온도 숫자 본체 `38px / lineHeight 40px / weight 800` 적용.
- [x] 카드 최소 높이 `216dp outer / 213dp surface`, 중앙 영역 `100dp` 적용.
- [x] 산책 문구와 하단 metrics bar 사이 여백 `10dp` 적용.
- [x] Android `SM_S937N / R5CY613NMSY` 최신 APK 설치·cold start·Home 카드 확인.
- [x] 최신 APK SHA-256 `df16452225cae4be55bccd9c780008c2fa2ea84724c31ae2e93b7e7df769cb21`.
- [x] Jest `67 suites / 269 tests`, typecheck, lint, release build/install 통과.
- [x] app-scoped fatal scan 0건.

증적: `/tmp/nuri-qa/weather-card-temperature-38px-spacing.png`, `/tmp/nuri-qa/weather-card-temperature-38px-spacing-logcat.txt`.

## 2026-07-23 날씨카드 온도 본체 최종 release gate

- [x] 온도 숫자 본체 `24px / lineHeight 28px` 적용.
- [x] 작은 `°`, `C` 단위의 상단 정렬 유지.
- [x] Android `SM_S937N / R5CY613NMSY` 최신 APK 설치·cold start·Home 카드 확인.
- [x] 최신 APK SHA-256 `d160914657d6cc290f30a378db5810f171617cc5e3e7be980c49fce7f391c61a`.
- [x] Jest `67 suites / 269 tests`, typecheck, lint, release build/install 통과.
- [x] app-scoped fatal scan 0건.

증적: `/tmp/nuri-qa/weather-card-temperature-24px.png`, `/tmp/nuri-qa/weather-card-temperature-24px-logcat.txt`.

## 2026-07-23 날씨카드 상단 meta 폰트 최종 release gate

- [x] 지역명과 월·일·요일을 날씨 서브 카피와 같은 `9px / lineHeight 13px`로 적용.
- [x] Android `SM_S937N / R5CY613NMSY` 최신 APK 설치·cold start·Home 카드 확인.
- [x] 최신 APK SHA-256 `019f3b12ece2837303c137bdbdc8346836e18c6ba947022f0d1e5e3822aa8dbb`.
- [x] Jest `67 suites / 269 tests`, typecheck, lint, release build/install 통과.
- [x] app-scoped fatal scan 0건.

증적: `/tmp/nuri-qa/weather-card-font-match.png`, `/tmp/nuri-qa/weather-card-font-match-logcat.txt`.

## 2026-07-23 날씨카드 메타·지표·아이콘 최종 release gate

- [x] 지역·날짜 폰트를 12px로 조정.
- [x] 날짜 옆 해·달 아이콘 제거.
- [x] 온도 `°C` 단위를 숫자 상단에 정렬.
- [x] 메인 산책 안내 14px, 주의 제목 1px 축소.
- [x] 체감·습도·바람 아이콘·라벨·값을 `#FFFFFF`로 적용.
- [x] 날씨 이모티콘을 좌측 날씨 영역 중앙 정렬.
- [x] Android `SM_S937N / R5CY613NMSY` 최신 APK 설치·cold start·Home 카드 확인.
- [x] 최신 APK SHA-256 `a7b254b4ec6de20de3368ce4567a3a1e479fa1186c2750f8554d93fb236db497`.
- [x] Jest `67 suites / 269 tests`, typecheck, lint, release build/install 통과.
- [x] Supabase 변경 없음, app-scoped fatal scan 0건.

증적: `/tmp/nuri-qa/weather-card-user-adjustment.png`, `/tmp/nuri-qa/weather-card-user-adjustment-logcat.txt`.

## 2026-07-23 날씨카드 날짜·지역·온도 표기 최종 release gate

- [x] 상단에서 `오늘`과 시간을 제거하고 월·일·요일만 표시한다.
- [x] 지역과 날짜를 양끝 정렬하고 같은 `textPrimary` 색상·13px로 맞췄다. 하단 체감·습도·바람·자외선 값보다 2px 크다.
- [x] 카드 높이와 본문 밀도를 축소했다.
- [x] 온도 숫자와 작은 `°`, `C`를 분리해 레퍼런스처럼 표시한다.
- [x] 산책 안내에서 불필요한 `딱`을 제거했다.
- [x] Android `SM_S937N / R5CY613NMSY`에 최신 APK 재설치·cold start·Home 카드 확인.
- [x] 최신 APK SHA-256 `e74f771a6e0ca7ddc46e501833eaa21daf68607fa1bbf161f6c79d68022f0747`.
- [x] Jest `67 suites / 269 tests`, typecheck, lint, release build/install, Supabase dry-run 통과.
- [x] 최종 app-scoped fatal scan 0건.

증적: `/tmp/nuri-qa/weather-card-final-closeout.png`, `/tmp/nuri-qa/weather-card-final-closeout-logcat.txt`, `/tmp/nuri-qa/weather-card-day-refinement.png`.

## 2026-07-23 날씨카드 세부 비율 조정 release gate

- [x] 본문·주의 패널 타이포 축소 및 주의 패널 폭 확대.
- [x] 하단 지표의 외곽 radius/border 제거, 상단선과 체감·습도·바람 우측 구분선 적용.
- [x] 야간 날씨 영역의 달 중복 제거, 날짜/시간 meta 행 달 아이콘 유지.
- [x] 온도 숫자와 `°C` 단위 분리 및 단위 크기 축소.
- [x] Android `SM_S937N / R5CY613NMSY`에 최종 APK 재설치·cold start·Home 카드 확인.
- [x] 최종 표기 조정 전 중간 artifact 기록. 최신 최종 artifact는 위 closeout 항목을 사용한다.

증적: `/tmp/nuri-qa/weather-card-day-refinement.png`, `/tmp/nuri-qa/weather-card-night-refinement-final.png`, `/tmp/nuri-qa/weather-card-refinement-final-logcat.txt`.

## 2026-07-23 홈 날씨카드 리디자인 release gate

- [x] 낮/밤 날씨카드 variant, 글래스 surface, 외곽선, 위치/시간 meta, 주의 패널, 4개 지표 bar 구현.
- [x] 선택 펫 테마 primary 색상을 강조 카피·주의 패널 제목에 연결하고 날씨 일러스트의 시맨틱 색상은 유지.
- [x] 좁은 화면 compact layout과 긴 한글 카피 overflow 방지 확인.
- [x] Android `SM_S937N / R5CY613NMSY`에 최종 APK 설치·cold start·Home 날씨카드 확인.
- [x] 최초 리디자인 APK SHA-256은 세부 조정 전 artifact로 보관하며, 최신 최종 APK는 위 세부 비율 조정 closeout 항목을 기준으로 한다.
- [x] 최초 리디자인 단계의 Jest `67 suites / 268 tests`와 release gate 통과 기록을 보존한다. 최신 결과는 위 closeout 항목을 사용한다.
- [x] 최종 app-scoped fatal scan 0건. 임시 day phase override는 QA 캡처 후 제거했으며 최종 코드에는 남아 있지 않음.

이전 증적: `/tmp/nuri-qa/weather-card-day.png`, `/tmp/nuri-qa/weather-card-night-final.png`, `/tmp/nuri-qa/weather-card-final-logcat.txt`.

## 2026-07-22 날씨 안전 안내·펫 이름 하드코딩 버그 release gate

- [x] 현재 기온·체감온도 기반 27℃/30℃/33℃ 더위 및 0℃/-5℃ 추위 안내.
- [x] 비·눈·천둥 행동 안내 및 안내 내부 아이콘 제거.
- [x] 비 시나리오의 펫 이름 `누리와` 하드코딩 제거, `아이와` 일반 문구로 교체.
- [x] `adminQA`의 실제 펫 이름 `AdminQAPet`을 홈·상세 날씨 문구에 동적으로 표시하고 `누리와` 미노출 확인.
- [x] 최종 APK 새 빌드·설치, 홈 `비 오는 날 주의`, 상세 비·더위 안내, Android back 확인.
- [x] Jest `67 suites / 268 tests`, typecheck, lint, release build/install 통과.
- [x] app-scoped fatal 패턴 0건; 별도 Android 시스템 AppOps 로그는 앱 fatal이 아님을 분류.
- [x] Supabase schema/RPC/RLS/seed 변경 없음, dry-run remote up to date.

최종 APK SHA-256: `00fece6b5300524e58142ab6908e486418162954d898c1180de69e0ee7cc4d92`.
증적: `/tmp/nuri-qa/weather-personalized-home.png`, `/tmp/nuri-qa/weather-personalized-detail.png`, `/tmp/nuri-qa/weather-personalized-back.png`, `/tmp/nuri-qa/weather-personalized-home.xml`, `/tmp/nuri-qa/weather-personalized-detail.xml`, `/tmp/nuri-qa/weather-personalized-logcat.txt`.

## 2026-07-22 대댓글 정렬·세로선 제거 release gate

- [x] reply vertical guide/lead marker 제거.
- [x] reply avatar/name을 부모 댓글 `답글쓰기` action 시작선에 정렬.
- [x] 댓글별 가로 divider와 parent thread 외곽 border 유지.
- [x] 일반 댓글, 글쓴이 댓글, 대댓글 2개와 author accent를 Android에서 확인.
- [x] keyboard, CTA, Android back 확인.
- [x] 최신 APK SHA-256 `6b5e22a3e9dcde258570fd27061222731f2651ce57c389b17fa12f066e2be255`.
- [x] Jest `66 suites / 257 tests`, typecheck, lint, release build/install 통과.
- [x] public active hospital `5,427건`, coordinate missing `122건`, `(0,0)` `0건` read-only audit.
- [x] push token remote audit: `5건` 모두 `revoked`, active token `0건`; actual push dispatcher 비활성.
- [x] Supabase dry-run remote up to date, destructive migration 없음.
- [x] app-fatal scan `0 matching app-fatal patterns`.

증적: `/tmp/nuri-qa/community-final-release-cold-start.png`, `/tmp/nuri-qa/community-final-release-list.png`, `/tmp/nuri-qa/community-final-release-detail.png`, `/tmp/nuri-qa/community-final-release-comments.png`, `/tmp/nuri-qa/community-final-release-keyboard.png`, `/tmp/nuri-qa/community-final-release-logcat-final-app-fatal-scan.txt`.

## 2026-07-22 답글 알림·댓글 스레드 visual release gate

- [x] Home 알림 overlay를 낮은 elevation·중립 icon·작은 카드 밀도로 확인.
- [x] 댓글 thread 외곽 border와 row 간격 확인.
- [x] `답글쓰기` 아래에 1-depth 답글이 정렬되고 parent thread 내부 divider/guide line으로 구분됨을 확인.
- [x] controlled top-level 댓글 알림과 답글 알림을 각각 생성.
- [x] 댓글 알림 unread `+1`, 답글 알림 unread `+1` 확인.
- [x] 두 알림 모두 작성자·게시글 문구·`postId/commentId` target 일치 확인.
- [x] 답글 알림 탭 후 부모 댓글 자동 확장 및 실제 답글 위치 이동 확인.
- [x] 답글 target 화면에서 `답글쓰기`, nested reply, 댓글 입력창과 Android navigation bar overlap 없음 확인.
- [x] QA prefix 댓글·답글 5건 soft cleanup, active QA row `0건` 확인.
- [x] 최신 APK SHA-256 `c61972c0e1c170f310701894c83dd18cf334cf424603de09eb5f3be13db5623d`.
- [x] Jest `66 suites / 257 tests`, typecheck, lint, diff check, release build/install 통과.
- [x] app-fatal scan `0 matching app-fatal patterns`, Supabase dry-run remote up to date.

최신 artifact 증적: `/tmp/nuri-qa/community-final-release-cold-start.png`, `/tmp/nuri-qa/community-final-release-list.png`, `/tmp/nuri-qa/community-final-release-detail.png`, `/tmp/nuri-qa/community-final-release-comments.png`, `/tmp/nuri-qa/community-final-release-logcat-final-app-fatal-scan.txt`.

## 2026-07-22 Community Comment Notification Deep Link Closeout

- [x] 댓글 알림 read model에 안전한 `postId/commentId` action target 추가.
- [x] Home 알림 overlay에서 댓글 알림을 누르면 대상 게시글 상세로 이동.
- [x] 알림함에서도 댓글 알림을 누르면 동일한 게시글·댓글 target으로 이동.
- [x] 부모 댓글 thread와 1-depth 답글 자동 확장.
- [x] 대상 댓글·답글 위치 보정 스크롤과 시각적 강조.
- [x] 유효하지 않은 댓글 target의 게시글 상세 fallback.
- [x] `get_user_notifications_v2` anon read 차단 확인.
- [x] controlled secondary 댓글 알림의 작성자·게시글 문구와 target 일치 확인.
- [x] Android `SM_S937N / R5CY613NMSY` 실기기 증적 확보.
- [x] 최신 APK SHA-256 `11aa59e2f75e792b280437cab052c306c165d1d252fa3fe9abb6762473a64d0f`.
- [x] Jest `66 suites / 257 tests`, typecheck, lint, release build/install 통과.
- [x] QA 댓글 soft cleanup, notification read 처리, fixture `100 posts / 300 comments` 복구.
- [x] actual push/broadcast와 hard delete 미사용.

증적: `/tmp/nuri-qa/community-notification-deeplink-home.png`, `/tmp/nuri-qa/community-notification-deeplink-sheet-3.png`, `/tmp/nuri-qa/community-notification-deeplink-comment.png`, `/tmp/nuri-qa/community-notification-deeplink-comment.xml`, `/tmp/nuri-qa/community-notification-deeplink-logcat-full.txt`.

## 2026-07-22 Community List/View/Comment Notification Closeout

- [x] 제목과 말풍선 20dp row 중앙 정렬, 한 줄 ellipsis.
- [x] 62dp row, 세로 padding 8dp, 1px divider, 우측 댓글 rail.
- [x] 기존 `질문`, `팁 공유`, `일상`, `정보` category 유지.
- [x] controlled secondary 첫 조회 `+1`, 동일 viewer 재조회 `deduped/+0`.
- [x] Android 목록에 첫 fixture `조회 1` 반영.
- [x] controlled secondary 댓글 -> `adminQA` unread `+1` 및 Home bell badge.
- [x] 알림 overlay에 작성자와 대상 게시글 문구 표시.
- [x] actual push/broadcast/segment 호출 0.
- [x] `comment_count` drift corrective trigger와 active source count 복구.
- [x] QA 댓글 soft-delete, 알림 read, fixture active `100 posts / 300 comments` 복구.
- [x] typecheck, lint, Jest `66 suites / 256 tests`, release build/install.
- [x] APK SHA-256 `c5c54e667cbb8def21fb7fa63c45478d7ef1de3978b9edd7e20a97d2dd568a0a`.
- [x] app-scoped Fatal/ANR/unhandled/RN fatal/Fatal signal 0.

## 2026-07-19 Community List/Detail/Comment Redesign

- [x] compact editorial post row와 우측 댓글 수 rail
- [x] 가로 카테고리 tab과 44px touch target
- [x] 목록 row별 최신 댓글 N+1 request 제거
- [x] 상세 flat comment thread와 1-depth reply hierarchy
- [x] 글쓴이 댓글·답글 NURI accent 및 `글쓴이` badge
- [x] 게시글 100건, top-level 댓글 200건, 답글 100건 controlled fixture
- [x] fixture authenticated session/RLS/content policy 통과
- [x] fixture exact-prefix audit/soft-hide/restore guard
- [x] 기존 과거 QA 게시글 6건 approval/audit soft-hide, hard delete 0
- [x] cursor pagination 100건 Android scroll smoke
- [x] 댓글 input keyboard/CTA/back/nav overlap smoke
- [x] typecheck, lint, Jest `65 suites / 252 tests`
- [x] NURI app fatal/ANR/unhandled/RN fatal/Fatal signal 0

DB/RPC/RLS migration, 앱 전체 디자인, 폰트, Play Store 자산, actual push는 변경하지 않았다.

## 2026-07-19 Kakao Existing Account OAuth Re-verification

- [x] remote Kakao controlled 계정/profile/pet 유지 확인.
- [x] 실제 Kakao OAuth callback 성공 후 기존 Home/pet 복원.
- [x] `NicknameSetup` 잘못된 재진입 없음.
- [x] force-stop 후 Kakao session restore.
- [x] Kakao OAuth Android back cancel 후 로그인 화면 복귀와 spinner 종료.
- [x] profile/pet timeout, callback loop, fatal/ANR 0.
- [x] QA 종료 후 `adminQA` Home 복구 및 cross-account data 혼입 0.

## 2026-07-19 Existing Google Account Re-login Regression

- [x] controlled Google QA 계정이 remote auth/profile/pet에 유지되고 삭제·비활성 상태가 아님을 server-side로 확인.
- [x] Supabase auth callback의 profile/pet read를 auth lock 밖으로 지연.
- [x] profile `idle/loading/error` 상태를 신규 onboarding 근거로 사용하지 않음.
- [x] 실제 Android logout -> Google chooser -> callback -> 기존 Home/pet 복구.
- [x] force-stop 후 Google session 및 기존 pet 복원.
- [x] controlled Google QA pet 생일 `2016-10-21` 앱 UI 저장 및 Home/remote 확인.
- [x] typecheck, lint, Jest `64 suites / 249 tests`, Supabase dry-run, release build/install, fatal/ANR 0.

Artifact SHA-256: `ca28a6f2f1289c3aa5240de8930eabbbc946cb6df64d692bdda76a584d705207`. Google QA 생일은 테스트 입력 규칙이며 제품 기본값이 아니다.

## 2026-07-19 Final Release Gate

- [x] Google/Kakao 실제 성공, clean cancel, callback, onboarding, session restore.
- [x] Google/Kakao만 public 노출, Naver/Apple 미노출.
- [x] 일반 사용자 입력 구현 inventory와 24개 visible surface keyboard/back/nav sweep.
- [x] `adminQA` opt-in/out, permission, register, logout revoke 및 controlled account switch isolation.
- [x] 최신 release APK 핵심 도메인 회귀, app-scoped fatal/ANR 0.
- [x] 병원 public-safe projection과 `(0,0)` coordinate fallback.
- [x] typecheck, lint 0 warning/error, 64 suites/249 tests, release build/install.
- [x] Supabase remote up to date, destructive diff 0, anon admin/write smoke 차단.

Artifact SHA-256: `0d598322d5cd6463582ab3e17d93a9d0bc81e44ce7d7eec5fa45efbcb74fabe4`. 현재 승인 범위의 release criterion은 모두 완료다. actual push, broadcast/segment, hard delete, 디자인·폰트, Play Store는 정책 비활성 또는 별도 승인 범위다.

## 2026-07-15 OAuth 보강 기준

- release APK build/install: 성공.
- APK SHA-256: `8bbc30195880ba02688b846551654486a695a94b0cdc84f15d01cb95e7d92d1e`.
- Android 기기: `SM_S937N / R5CY613NMSY`.
- provider surface: Google/Kakao 버튼 노출, Naver/Apple 미노출.
- Google smoke: account chooser 진입과 callback/session/onboarding 분기 확인.
- Kakao smoke: web flow 진입과 callback/onboarding 분기 확인.
- 취소 복귀: Chrome/provider session 상태 때문에 Android back이 순수 로그인 화면 복귀로 분리되지 않았으므로 100% closeout으로 쓰지 않는다.
- adminQA 고정 계정: one-time `token_hash` callback으로 Home 복구. 비밀번호, token, provider email은 문서화하지 않음.
- 검증: typecheck 통과, lint 0 error/기존 warning 4건, Jest `63 suites / 247 tests` 통과, Supabase dry-run remote up to date, release build/install 성공, 앱 fatal/ANR/unhandled/RN fatal/Fatal signal 0건.
- 계속 비활성: hard delete, 전체/segment broadcast, actual push, 앱 내부 admin UI, Naver public surface, Apple login, Play Store 자산, 앱 전체 디자인/폰트 리뉴얼.
- 조건부 잔여: controlled Google/Kakao provider identity와 정리된 browser session으로 순수 취소 후 로그인 화면 복귀 smoke. 이 항목 없이 QA·보안 100%로 쓰지 않는다.

## 2026-07-15 최종 Release Gate 보강 기준

- release APK build/install: 성공.
- APK SHA-256: `bfb9ac5ca79e61e8d91b2e738529f945dd6dcc77f12e7a597afca31b81a57524`.
- Android 기기: `SM_S937N / R5CY613NMSY`.
- 코드 수정: Supabase `token_hash` callback 처리, 병원 상세 public raw address 차단.
- 최신 smoke: adminQA 직접 로그인/Home, Timeline, Community list/detail/comment keyboard/back, Hospital list/detail public-safe, Walk list/detail/search/back, Notification opt-in/permission/opt-out, logout, secondary QA account switch, adminQA 복구.
- refined logcat: 앱 `FATAL EXCEPTION`, `ANR`, `Unhandled promise`, `ReactNativeJS fatal`, `Fatal signal` 0건.
- 검증: typecheck 통과, lint 0 error/기존 warning 4건, Jest `63 suites / 247 tests` 통과, Supabase dry-run remote up to date, diff check 통과.
- 계속 비활성: hard delete, 전체/segment broadcast, actual push, 앱 내부 admin UI, Naver public surface, Apple login, Play Store 자산, 앱 전체 디자인/폰트 리뉴얼.
- 조건부 잔여: controlled Google/Kakao provider identity 기반 실제 외부 OAuth 성공·취소·복귀 smoke 1건. 이 항목 없이 QA·보안 100%로 쓰지 않는다.

## 2026-07-14 앱 본 프로젝트 closeout 기준

- 관리자 홈페이지 단계별 본구현은 종료한다. 이후 허용 작업은 운영 장애, 보안 패치, 실제 회귀 수정뿐이다.
- custom domain/DNS/SSL, Cloudflare Access 또는 유료 Vercel 보호 계층, 외부 runtime monitoring, 실제 MFA/recovery material, 상시 2인 운영 체계는 외부 운영 조건이며 앱 release blocker가 아니다.
- 이번 점검에서 승인 범위 내 P1 코드 gap으로 확인된 `deleteCommunityComment` hard delete fallback을 제거했다. 댓글 삭제는 soft update only다.
- release APK build/install: 성공.
- APK SHA-256: `59a152f3fe0d95bfc0579b8eb8942e16053047bd7d9f31dcaa346404493612b9`.
- Android 기기: `SM_S937N / R5CY613NMSY`.
- 최신 smoke: Home, Community list/detail, 댓글 keyboard/back, Hospital list/detail/back, Walk list/search keyboard/back.
- refined logcat: `FATAL EXCEPTION`, `ANR`, `Unhandled promise`, `ReactNativeJS fatal`, `Fatal signal` 0건.
- 검증: typecheck 통과, lint 0 error/기존 warning 6건, Jest 62 suites / 244 tests 통과, Supabase dry-run remote up to date.
- 계속 비활성: hard delete, 전체/segment broadcast, actual push, 앱 내부 admin UI, Naver public surface, Apple login, Play Store 자산, 앱 전체 디자인/폰트 리뉴얼.

운영 메모:

- 2026-07-13 NURI Admin Final Gap Closure & Evidence Closeout 재판정:
  nuri-web private GitHub remote `git@github.com:jaejun0617/nuri-web.git` 생성과 `main` push는 완료했다.
  최신 nuri-web production runtime 검증 commit은 `bb840f8`이고 production URL `https://nuri-web-beryl.vercel.app`은 `/api/health`에서 `database=connected`, `version=bb840f857574`를 반환한다.
  최신 deployment ID는 `dpl_D5xyVzS65SA3Cz69Wn5FrKoxoHUA`이며, 직전 Vercel `UNKNOWN` source deploy 문제는 env 재등록과 prebuilt artifact deploy로 복구했다.
  GitHub Actions production monitor 정상 run과 강제 실패 test alert issue 생성/종료를 확인했다.
  Android `SM_S937N / R5CY613NMSY`에서는 latest release APK install, cold start, Home, 커뮤니티 리스트, logcat fatal/ANR/unhandled/RN fatal/Fatal signal 0건까지 확보했다.
  2인 운영자 서버 smoke는 `pet_nuri` 요청, `pet_nuri_reviewer` 승인/실행, 자기 승인 차단, undo 원상복구까지 통과했다.
  2026-07-14 기준 Android moderation integration evidence와 앱 source-of-truth 재정렬을 반영해 관리자 홈페이지 단계별 본구현은 종료한다.
  MFA/recovery material, Sentry/Better Stack류 runtime monitoring, custom domain, 상시 2인 운영 체계는 앱 release blocker가 아닌 외부 운영 조건으로 기록한다.

- 2026-07-13 NURI Admin Final Production Completion & Project Handoff Closeout: `nuri-web /admin`
  당시 코드 범위 completion으로 기록했고, 2026-07-14 앱 source-of-truth 재정렬에서 단계별 본구현 종료로 확정한다. audit/operations/domain CSV/PDF export,
  export security test, 앱 hidden/private/deleted direct detail read-path 차단, Android
  현재 세션 cold start/logcat smoke를 완료했다. custom domain/DNS, 외부 access layer,
  MFA/recovery QA와 runtime error monitoring은 외부 소유권/계정/비밀 입력 조건이다.
  앱 내부 admin UI, hard delete, 전체/segment broadcast, 실제 push 발송, Play Store 자산,
  앱 디자인 리뉴얼은 열지 않았다.

- 2026-07-13 NURI Admin Final Operations Platform Completion: `nuri-web /admin`은 role/capability,
  MFA factor 로그인 guard, 2인 승인 실행, conflict-safe rollback batch 실행, operator/MFA/recovery
  route, notification opt-in/token lifecycle, monitoring summary까지 보강됐다. 앱 repo additive
  migration `20260713190000_admin_final_operations_platform.sql`과 corrective capability backfill
  `20260713193000_admin_final_operator_capability_backfill.sql`은 remote에 반영됐다. 앱 내부
  관리자 UI, hard delete, 전체/segment broadcast, 실제 push 발송, Play Store 자산, 앱 디자인
  리뉴얼은 열지 않았다. Android 실기기 직접 증적은 현재 device 미연결이면 완료로 보지 않는다.

- 2026-07-13 NURI Admin Production Deployment & Operations Cutover: `nuri-web /admin`은 Vercel production HTTPS 환경에 배포됐다. production URL은 `https://nuri-web-beryl.vercel.app`, 최신 deployment ID는 `dpl_D5xyVzS65SA3Cz69Wn5FrKoxoHUA`이다. production auth는 Supabase `admin_operator_accounts` credential store를 사용하고 local file credential fallback은 차단했다. `/admin`/`approvals`/`rollback` 비로그인 redirect, `/api/health` database connected, anon dashboard/action history RPC 차단, service-role dashboard summary smoke를 통과했다. `pet_nuri`/`pet_nuri_reviewer` 비밀번호 변경과 2인 승인 서버 smoke는 완료했다. custom domain은 NURI 소유 domain/DNS 확인 전까지 조건부다. MFA/recovery와 Android app read-path e2e는 별도 증적이 필요하다. Play Store 자산, 앱 디자인 리뉴얼, push actual, hard delete, broadcast는 열지 않았다.

- 2026-07-13 관리자 홈페이지 본구현 5차/Admin Ops Production Transition Closeout: `nuri-web /admin`에 2인 승인 queue, rollback request, production-safe notification policy, action policy dashboard, 최소 `npm test`를 추가했다. 앱 repo additive migration `20260713093000_admin_operations_phase5_production_transition.sql`은 remote 반영과 dry-run up-to-date를 확인했다. anon negative smoke와 service-role approval/self-review/rollback smoke를 통과했다. 실제 hosting/DNS/public URL은 PO 승인 전까지 보류한다. Play Store 자산, 앱 디자인 리뉴얼, push actual, hard delete, broadcast는 열지 않았다.
- 이 문서는 v1.0 기능 기준선 evidence와 v1.1 착수 전 닫아야 하는 잔여 task/risk를 함께 관리한다.
- 2026-06-02 KST 기준 exact release APK 설치 smoke와 일반 사용자 최종 smoke, 동물병원 admin/super_admin 운영자 서버 조작 QA는 수행됐다.
- 2026-06-04 KST 기준 `profiles.role` self-escalation은 corrective migration과 remote 회귀 테스트로 차단했다.
- Play Store 제출 자산은 V1.0 기능/QA blocker가 아니며, NURI 앱 개발과 QA가 완전히 끝난 뒤 최종 제출 직전 준비 단계에서 진행한다.
- task18 상세 실행 순서, 캡처 파일명, 보관 규칙은 `docs/출시-준비도-회복/11-release-blocker-evidence-pack.md`를 따른다.
- v1.0은 기능 개발 Code Freeze 기준선이며 스토어 제출 완료 버전이 아니다.
- 현재 unchecked 운영 evidence 항목은 신규 기능 개발이 아니며, V1.1 또는 운영 보강 트랙에서 다룬다. Play Store 제출 자산은 V1.1 작업이 아니라 최종 제출 직전 준비로 분리한다.
- v1.1은 v1.0 미완성 이월이 아니라 신규 업데이트 트랙이다.
- 과금, Premium AI reply, Guestbook private letters 확장, Typography foundation rollout은 v1.1 신규 업데이트 후보로 관리한다.
- 2026-06-23 release candidate smoke는 release APK update install 기준으로 사용자-facing 핵심 경로를 재확인했다. Play Store 자산은 여전히 V1.0/V1.1 전체 완료 후 최종 제출 직전 단계다.
- 2026-06-30 신규 QA 계정 full E2E/navigation audit에서 로그아웃 후 email/password 재로그인 stale onboarding blocker를 발견해 최소 수정했다. 재빌드한 release APK에서 cold start와 logout -> email login home 복귀를 확인했고, 주요 화면 17개 back audit과 병원 전국 coverage read-only audit을 통과했다.
- 2026-06-30 V1.1 추가 업데이트 1차 MVP로 회원탈퇴 입력 확인, 최근 로그인 표시, 타임라인 카테고리 count를 구현했고 edge QA를 수행했다. 신규 DB/migration/seed/design 변경은 없고 focused tests, Android 회원탈퇴 모달, 최근 로그인 email cold start, Kakao/Google OAuth 진입, 타임라인 작성/수정/삭제 count 갱신 smoke를 통과했다.
- 2026-07-01 이후 모든 실기기 QA에는 키보드바/키보드 회피/입력창 가림/primary action 접근성/모달 크기/문구 잘림/Android back dismiss 확인을 포함한다. 이 기준은 디자인 리뉴얼이 아니라 release blocker 방지용 QA gate다.
- 2026-07-01 V1.1 추가 업데이트 2차 MVP로 데일리 streak/데일리판, 앱 내부 알림 read path, XP/레벨/칭호 최소 MVP를 구현했다. additive migration/RPC/RLS를 적용했고, `adminQA` 일반 사용자 계정 기준 타임라인 데일리판/XP 카드, 알림함 read/mark read, keyboard bar smoke를 확인했다. 2026-07-02에는 홈 알림 UX를 inline panel에서 상단 floating notification shade로 수정해 홈 콘텐츠가 밀리지 않도록 닫았다. 같은 날 알림별 X는 제거하고, 카드가 이동하며 사라지는 좌우 스와이프 dismiss, 전체삭제, 화살표-only 펼침/접힘을 user-scoped dismiss와 client UI 상태로 추가했다. release APK에서 `ADMIN_QA_NOTICE` 다중 알림 누적/스크롤/삭제/빈 상태/펼침·접힘을 확인했다. 운영자 발송 UI, push, 홈 위젯, 무지개다리 서비스, 디자인 전체 조정, Play Store 자산은 열지 않았다.
- 2026-07-02 V1.1 final sign-off 기준, V1.0 회귀와 V1.1 산책 POI/1차 MVP/2차 MVP/notification 최신 UX/RLS/RPC/Android `adminQA` smoke를 재검증했고 `V1.1 final sign-off 가능`으로 판정한다. V1.1.1 scope audit에서 Android 홈 위젯 native/JS 일부 코드가 release scope에 남아 있음을 확인해 receiver를 disabled/exported false로 막고 native package 등록을 제거했다. push remote notification, 운영자 발송 UI, 무지개다리 서비스, 고급 XP/랭킹은 release build에 의도치 않게 노출되지 않는다.
- 2026-07-02 V1.1.1 1차로 `전체메뉴 > 나의 반려동물 > 활동·칭호` 대시보드를 추가했다. 기존 XP ledger/RLS/RPC를 재사용해 현재 성장, 펫별 활동, 산책/타임라인/건강관리, 공통 커뮤니티/댓글, 칭호·훈장 보관함을 표시한다. 커뮤니티/댓글은 user-level 공통 활동으로만 표시해 멀티펫 카드에 중복 합산하지 않는다. 2026-07-09 고도화에서 Lv.1~30과 privacy-limited `누리 랭킹` MVP를 추가했으며, 공개 경쟁형 리더보드는 후속으로 유지한다.
- 2026-07-03 V1.1.1 closeout 갱신: 홈 간편 알림창 swipe dismiss와 `모두 치우기`는 전체보기 삭제가 아니라 home-only local/user-scoped hide로 분리했다. 전체보기/알림함 개별 삭제와 전체삭제는 기존 서버 RPC의 user-scoped hide를 유지하며, read/home dismiss/inbox delete는 분리 상태다. service role key가 현재 셸에 없어 adminQA 새 알림 row 생성 smoke는 미수행했고, focused test와 기존 read path evidence로 보완한다.
- 2026-07-03 활동·칭호 조건부 closeout 해소: `adminQA`에 QA 전용 `AdminQAPet2`를 추가해 실제 멀티펫 edge를 확인했다. `AdminQAPet2` 기준 산책 2건, 식사 1건, 일기장 1건, 생활 1건을 저장했고, 활동·칭호는 총 `120 XP`, AdminQAPet `60 XP · 훈장 2개`, AdminQAPet2 `45 XP · 훈장 1개`, AdminQAPet2 카테고리 `전체 5 / 산책 2 / 식사 1 / 일기장 1 / 생활 1`을 표시했다. 같은 날 산책 2건은 streak/timeline에는 반영되지만 XP daily cap으로 추가 산책 XP가 중복 지급되지 않았다. pet/common owner label을 칭호·훈장 조건에 표시하도록 보강했다.
- 2026-07-03 알림 live row 조건부: authenticated 안전 생성 RPC나 QA fixture가 없고 `user_notifications`는 select-only RLS라 새 알림 row 기반 live retention smoke는 수행하지 않았다. service role key는 요구하거나 노출하지 않았고, home quick dismiss와 inbox delete 분리는 focused test와 기존 read path evidence로 보완한다. release blocker는 아니다.
- 2026-07-09 V1.1.1 고도화 1차: additive remote migration으로 운영자 알림 campaign/audit table, admin-only 발송 RPC, QA-only self notification RPC, Lv.1~30 curve, 장기 activity summary RPC, privacy-limited ranking RPC를 적용했다. 전체메뉴에는 `누리 랭킹` 사용자 read-only 화면만 추가했고, 운영자 발송 UI는 앱 내부에 노출하지 않았다. push notification은 실제 발송/permission prompt/token 저장을 열지 않고 정책 문서로만 정리했다. 랭킹 RPC는 email/phone/user_id/pet_id/raw id를 반환하지 않고 pending deletion 사용자를 제외한다. Android 실기기 ranking smoke와 notification live retention evidence는 이번 고도화 closeout evidence로 별도 캡처한다.
- 2026-07-10 운영자 알림 관리 콘솔/live retention closeout: 앱 내부 일반 사용자 UI가 아닌 `admin-console/notification-console.html` 별도 정적 콘솔을 추가했다. `admin_send_qa_user_notification_v1`와 `admin_notification_audit_feed_v1`를 remote에 적용했고, `profiles.deleted_at` 가정을 제거하는 corrective migration도 적용했다. anon admin RPC는 401/42501, non-admin admin send는 42501로 차단된다. 실제 admin wrapper 경로로 `adminQA` 단일 대상 새 알림 row를 만들고 Android에서 홈 표시, home swipe dismiss, 알림함 유지, 알림함 개별 삭제, 전체삭제, 홈 재노출 없음까지 확인했다. service role key/push secret/전체 broadcast는 사용하지 않았다.
- 2026-07-11 V1.1.1 고도화 final closeout: Android `SM_S937N / R5CY613NMSY`에서 `누리 랭킹` 종합/산책/글/댓글/건강/생활/미용 탭, 기둥그래프, raw id/email/phone/pet_id 미노출 상태를 유지한다. PremiumRewardModal은 max 상태에서 progress bar와 `최고 레벨 달성` 문구를 표시하도록 보강했고 focused max state test로 over-max crash 없음까지 고정했다.
- 2026-07-11 pre-store 필수 polish: 성장 시스템을 Lv.1~100 / max `1,250,000 XP`로 확장하고, 기존 Lv.1~30 threshold는 유지했다. 향후 XP 지급은 base 1.3배 + level-band 감쇠를 적용하며 daily cap/source idempotency는 유지한다. 메인 홈에는 현재 펫의 pet-level 대표 칭호 badge를 추가했고, user-level 공통 칭호는 펫 칭호처럼 오표시하지 않는다. adminQA 첫 pet에 산책/식사/일기장/생활-미용/건강 QA 게시글을 실제 생성해 XP ledger 12건 / 262 XP, Lv.3, pet-level `추억 수집가` 홈 badge 표시까지 확인했다. push 실제 발송, Play Store 자산, 홈 위젯, 무지개다리는 열지 않았다.
- 2026-07-11 홈/주요 도메인 로딩 최적화: Home shell은 세션/user 기준으로 즉시 표시하고, 기록/일정 bootstrap, 날씨 refresh, 추천 가이드 fetch, 대표 칭호 RPC는 interaction 이후 또는 cache/background refresh로 분리했다. `활동·칭호`는 skeleton card를 먼저 보여주고, `누리 랭킹`은 탭별 cache/skeleton으로 이전 탭 데이터 flicker를 줄인다. DB/RPC/RLS/seed 변경은 없다.
- 2026-07-11 실서비스급 최적화/안정화: Home 기록/일정 preview에 `userId + petId` scoped disk cache를 추가했고, schema version/3일 TTL/corrupt fallback/logout clear를 적용했다. 활동·칭호 service는 `get_user_activity_long_summary_v1`를 우선 사용해 level summary와 community/comment count 중복 query를 줄인다. `누리 랭킹`은 React Query category key 기반 cache/stale policy로 전환했다. Timeline/Community의 count/summary/initial fetch는 interaction 이후로 지연해 첫 paint와 경쟁하지 않게 했다. Play Store 자산, push 실제 발송, 관리자 홈페이지 본구현, 앱 폰트/디자인 전체 리뉴얼은 진행하지 않았다.
- 2026-07-11 병원/산책 조건부 closeout: Android `SM_S937N / R5CY613NMSY` release build에서 `우리동네 동물병원` 리스트/상세/back, `산책` 리스트/상세/back direct visual smoke를 확보했다. 병원 public text 기준 운영시간/24시/야간/주말/응급/특수동물/주차/장비/홈페이지/SNS/raw/internal/source 노출 0건, 산책 위치/API 준비 전 crash 0건, logcat fatal/ANR/unhandled/RN fatal 0건으로 확인했다.
- 2026-07-11 관리자 홈페이지 1차: 앱 내부 일반 사용자 화면이 아닌 `admin-console/index.html` 별도 정적 admin web shell을 추가했다. 1920px/1440px/tablet/mobile responsive QA를 수행했고, 기존 `notification-console.html` 진입 링크를 유지한다. 인증/권한 gate, public hosting, 실운영 데이터 write 기능은 본구현 트랙으로 분리한다.
- 2026-07-12 관리자 홈페이지 source of truth 정정: 앱 repo의 `admin-console`은 QA/임시 콘솔 및 참고 자산으로만 보고, 실제 관리자 홈페이지 본구현은 별도 `nuri-web` 프로젝트의 `/admin` 트랙에서 진행한다. `nuri-web` 관리자 홈은 NURI Ops dashboard로 리디자인했고, Users/Pets/Timeline/Health/Walk/Hospitals/Community/Notifications/Rankings/Activity/Reports/QA/Settings/Audit Logs/Guides CMS IA를 담는다. 현재 실제 write 기능은 가이드 CMS만 유지하고, 유저 조치/게시글 삭제/공지 발송/전체 broadcast는 권한/RLS/audit 본구현 전까지 disabled 상태로 둔다.
- 2026-07-12 관리자 홈페이지 인증/한글화 closeout: `nuri-web /admin`은 관리자 로그인, HttpOnly cookie 세션, 비밀번호 변경 화면, 로그아웃을 갖췄다. 관리자 ID는 `pet_nuri`이고 초기 비밀번호 값은 코드/문서/로그에 남기지 않는다. `/admin` 비로그인 접근은 `/admin/login`으로 redirect되고, 관리자 세션 기반 1920/1440/tablet/mobile visual QA를 완료했다. 위험 write/broadcast는 계속 비활성이다.
- 2026-07-12 관리자 홈페이지 본구현 2차: `nuri-web /admin`에 신고/콘텐츠 soft action, 동물병원 검수 action, 사용자 검토 flag, 공통 확인 모달, 운영 action audit log를 추가했다. 앱 repo에는 additive migration `20260712130000_admin_operations_phase2_actions.sql`로 overlay 상태 table과 admin-only RPC를 추가/remote 반영했다. hard delete, 사용자 권한 상승, 전체 broadcast, 앱 내부 admin UI 노출은 계속 금지 상태다. nuri-web lint/build/diff와 responsive screenshot QA, Supabase anon 차단/service-role smoke를 통과했다.
- 2026-07-12 관리자 홈페이지 본구현 3차/4차: `nuri-web /admin`에 role/capability model, action disabled reason, server action capability guard, `/admin/notifications`, 운영 통계 dashboard, audit before/after diff, action history, conflict-safe undo UI를 추가했다. 앱 repo에는 additive migration `20260712143000_admin_operations_phase3_undo_stats.sql`로 undo link table, v2 action RPC, undo/history/dashboard summary RPC, nuri-web 서버 전용 QA 알림 wrapper를 추가/remote 반영했다. hard delete, 권한 상승, 전체 broadcast, push 실제 발송, 앱 내부 admin UI 노출은 계속 금지 상태다. nuri-web lint/build/diff, responsive screenshot QA, Supabase anon negative smoke/service-role read smoke를 통과했다.
- 디자인 수정은 이번 release QA 턴에서 하지 않았다. 앱 폰트/디자인 전체 리뉴얼은 별도 트랙으로 유지하며, Play Store 자산 패키지는 모든 기능 안정화, 관리자 홈페이지, 앱 전체 디자인 재정비, 최종 QA 이후 최종 제출 직전 단계에서만 진행한다.

## 2026-06-30 Full App E2E / Navigation / Hospital Coverage RC QA

- [x] 신규 QA 계정 생성 및 신규 사용자 플로우 검증
  - 테스트 계정: `qa0623145019@example.com`
  - 비밀번호: 문서화하지 않음
  - Splash, Login/Signup, Google/Kakao 버튼, Nickname, Pet Create, Home 진입 확인
- [x] 신규 계정 release blocker 수정
  - 로그아웃 후 email/password 재로그인에서 profile/pet이 있는데도 `NicknameSetup`으로 잘못 진입하는 문제를 수정했다.
  - `authStore.setSession` 로그인 세션 boot gate와 `shouldReloadUserScopedState` same-user reload 기준을 보강했다.
  - focused auth/app boot tests 13/13 통과, release APK rebuild/install 후 cold start와 재로그인 home 복귀 확인.
- [x] 전체 기능 E2E smoke
  - Home, Profile/Pet, Pet Edit/Create guard, Health, Timeline, Animal Hospital, Walk/POI, Community/Policy, Weather, 전체메뉴/설정, Logout/session restore 확인.
- [x] navigation/back audit
  - 주요 사용자-facing 화면 17개에서 상단 뒤로가기와 Android system back을 확인했다.
  - Animal Hospital 전화/길찾기 CTA와 Community policy 외부 문서에서 앱 복귀 확인.
- [x] Animal Hospital 전국 커버리지 read-only audit
  - public active count 5,427건
  - 서울/경기/인천/부산/대구/대전/광주/울산/세종/제주/강원/충청/전라/경상 대표 좌표 모두 10km/20건 반환
  - 판정: `우리동네 병원 찾기 전국 확장 완료, coordinate missing 122건은 release blocker 아님`
  - coordinate missing 122건은 V1.1 데이터 품질 보강 후보
- [x] Walk/POI 회귀
  - approved/public/active POI 1,145건 유지
  - nearby/search/detail RPC 정상, direct anon table select `42501`, Ready 권역 Kakao 차단 유지
- [x] crash-free
  - Android `SM_S937N` logcat fatal / ANR / unhandled promise / ReactNativeJS fatal pattern 0건

## 2026-06-30 Animal Hospital Coordinate Missing / V1.1 Planning Update

- [x] Animal Hospital coordinate missing 122건 read-only audit
  - public active count: 5,427건
  - coordinate missing public active: 122건
  - primary address 보유: 122건
  - road address 보유: 110건
  - lot address 보유: 121건
  - official phone 보유: 82건
  - providerPlaceUrl 보유: 0건
  - 판정: `우리동네 병원 찾기 전국 확장 완료, coordinate missing 122건은 release blocker 아님`
- [x] coordinate missing UX 판정
  - nearby 좌표 기반 리스트는 좌표가 있는 병원만 반환한다.
  - text search/detail은 주소/전화가 있으면 정보형으로 표시한다.
  - 좌표가 없으면 지도 preview와 좌표 기반 길찾기 URL은 열지 않고 주소 기준 안내로 안전 처리한다.
  - 병원 좌표 보정은 V1.1 데이터 품질 보강 후보이며 이번 턴에서 DB write/seed 수정은 하지 않았다.
- [x] V1.1 추가 업데이트 공식 작업서 생성
  - 문서: `docs/planning/v1.1-additional-update-plan-and-checklist.md`
  - 대상 기능: 타임라인 카테고리 count, 최근 로그인 방식, 무지개다리 서비스 제안, 연속 출석/데일리판, 홈 위젯, 회원탈퇴 입력 확인, 알림 수신 검증, XP/레벨/칭호
  - 1차 MVP는 구현 완료 상태이며, 2차 MVP는 2026-07-01 기준 정책 v1 확정과 최소 구현까지 진행했다. V1.1.1 후보는 별도 트랙으로 유지한다.
- [x] 운영/출시 기준 갱신
  - Supabase/Codex 운영비: PO 확정 완료
  - 디자인 조정: 앱 폰트/디자인 전체 리뉴얼은 별도 트랙으로 진행
  - Play Store 자산 패키지: 모든 기능 안정화, 관리자 홈페이지, 앱 전체 디자인 재정비, 최종 QA 이후 최종 제출 직전 진행
  - admin 운영자 QA: 별도 홈페이지/관리 페이지 트랙으로 이동

## 2026-06-30 V1.1 추가 업데이트 1차 MVP 구현

- [x] 회원탈퇴 입력 확인
  - `회원탈퇴` 직접 입력 전 `탈퇴 요청하기` disabled 확인
  - 7일 유예 탈퇴 flow와 복구/차단 계약 유지
  - 취소와 Android back dismiss 확인
  - `회원탈퇴` 정확 입력, 오타/공백 trim, 탈퇴 요청 성공 시 최근 로그인 기록 삭제는 focused test로 고정
  - 실제 탈퇴 예약 실행은 QA 계정 보호와 실기기 한글 입력 자동화 제약 때문에 미수행. release blocker 아님
- [x] 최근 로그인 방식 표시
  - 저장 provider는 `email`, `google`, `kakao`만 허용
  - 이메일 주소와 소셜 계정 식별자는 저장하지 않음
  - 로그아웃 후 로그인 화면 email 영역 `최근 로그인` 표시와 cold start 유지 확인
  - Kakao는 실제 OAuth callback 후 신규 온보딩 진입 확인
  - Google은 account chooser와 `nuri://auth/callback` redirect 진입 확인
  - social 최종 pill은 외부 계정 consent/신규 온보딩 완료 조건 때문에 focused provider persistence test로 보완
- [x] 타임라인 카테고리 count
  - 전체/산책/식사/일기장 count badge 표시
  - 현재 선택 반려동물 기준 minimal metadata aggregation 사용
  - 신규 RPC/migration 없음
  - QA 계정에서 `QA_COUNT_TEST_WALK` 작성 후 전체 1/산책 1 확인
  - 작성 글을 식사로 수정 후 산책 0/식사 1 확인
  - 작성 글 삭제 후 전체 0/식사 0과 empty UX 원복 확인
- [x] 검증
  - focused tests: account deletion confirmation, recent login provider, timeline category count, auth boot/onboarding regression 통과
  - Android: 타임라인 count write/edit/delete, 회원탈퇴 모달 disabled/cancel/back, 로그아웃 후 최근 로그인 pill, Kakao/Google OAuth 진입 확인
  - 금지 범위 준수: 디자인, Play Store 자산, admin UI, seed, DB, migration 변경 없음

## 2026-07-01 실기기 키보드바 QA 기준

- [x] 키보드바 QA 기준을 release checklist에 추가
  - 대상: 로그인 이메일/비밀번호, 닉네임, 펫 이름, 날짜 직접 입력, 회원탈퇴 입력 모달, 타임라인 작성/수정, 커뮤니티 작성/댓글, 병원 검색, 산책 검색, 앱 내 모든 TextInput.
  - 기준: 키보드가 떠도 입력창과 해당 화면의 primary action이 가려지지 않는다.
  - 기준: 완료/취소/저장/로그인 버튼이 접근 가능하다.
  - 기준: Android system back으로 keyboard가 먼저 dismiss되고, dismiss 후 layout이 깨지지 않는다.
  - 기준: 모달 높이/너비가 답답하지 않고 문구가 잘리지 않는다.
  - 기준: NURI의 귀여움, 따뜻함, 고급스러운 정돈감을 해치지 않는다.
- [x] Android 로그인 입력 keyboard smoke
  - 기기: `SM_S937N / R5CY613NMSY`
  - 로그인 화면 이메일 입력 focus 시 IME top `y=1395`, IME height `945` 확인.
  - 이메일/비밀번호 입력과 로그인 primary button은 키보드 위에 남아 접근 가능.
  - Android back으로 keyboard dismiss 후 로그인 화면 layout 유지.
  - 입력 중 소셜 버튼은 키보드 아래 위치하지만 입력 상태의 primary action은 로그인 버튼이므로 blocker 아님.
- [ ] 다음 실기기 QA에서 회원탈퇴 모달, 닉네임, 펫 날짜, 커뮤니티 댓글, 병원/산책 검색의 keyboard evidence를 화면별로 누적한다.
- [x] 타임라인 작성 keyboard evidence 누적
  - 2026-07-01 Android `SM_S937N / R5CY613NMSY`에서 타임라인 기록 작성 화면의 제목/내용 입력 focus, IME 표시, 상단/하단 완료 버튼 접근 가능, Android back keyboard dismiss, dismiss 후 draft 보존 모달을 확인했다.

## 2026-07-01 V1.1 추가 업데이트 2차 MVP 구현 / adminQA smoke

- [x] 고정 테스트 계정 정책 반영
  - 테스트 계정 표시명: `adminQA`
  - 권한: 일반 사용자
  - admin/super_admin 권한 부여 없음
  - 테스트 pet: `AdminQAPet`
  - 비밀번호, token, provider 계정 전체값, 이메일 전체값 문서화 없음
- [x] additive DB/RPC/RLS 구현
  - migration: `20260701090000_v11_second_mvp_activity_notifications_xp.sql`
  - corrective migration: `20260701093000_fix_v11_xp_award_ambiguous_columns.sql`
  - tables: daily activity, streak summary, announcement/user notification/read receipt, XP ledger, level summary, title
  - RPC: daily status/record/remove, notification unread/list/mark read, XP award/level/title
  - RLS: authenticated user-owned select, anon direct select row 0, unauthenticated RPC permission denied
- [x] 데일리 streak / 데일리판
  - 타임라인 산책 카테고리 작성 성공 시 KST user+pet+date 기준 하루 1회 인정
  - 같은 날 중복 작성은 streak 중복 증가 없음
  - 타임라인 화면에 오늘 완료, current/best streak, 하루 1회 안내 표시
  - 삭제/카테고리 변경 시 당일 source 제거와 summary 재계산 경로 구현
- [x] 알림 read path
  - 전체메뉴 `알림함` entry와 unread dot/count 추가
  - `UserNotifications` 화면에서 목록, empty state, mark read 제공
  - 홈 상단 알림 아이콘에서 `오늘의 메시지로 하루를 시작해요` 문구 아래 위치에 floating notification shade overlay 제공
  - 홈 알림 카드는 제목 1줄, 본문 preview 최대 2줄, 날짜 하단, 화살표-only 펼침/접힘 구조로 제공
  - 알림별 작은 X는 제거하고, 좌우 스와이프 시 카드가 이동하면서 user-scoped dismiss 처리
  - 운영자 발송 UI와 push는 제외
- [x] XP / 레벨 / 칭호 MVP
  - source idempotency, daily cap, Lv.1~10 level curve, 최소 칭호 지급 구현
  - 타임라인 작성과 산책 카테고리 작성에 XP 연결
  - 타임라인 활동 성장 카드에 total XP, level, 최신 칭호, 다음 레벨 progress 표시
  - V1.1.1 1차: 전체메뉴 `활동·칭호` 화면에서 pet-scoped 활동과 user-scoped 공통 활동을 분리 표시
  - Lv.1~100 확장과 XP reward 감쇠는 2026-07-11 서버/app curve와 focused test로 반영
- [x] Android `adminQA` smoke
  - release APK rebuild/install/cold start
  - 로그인 후 홈 진입, 타임라인 데일리판/XP 카드 표시
  - 전체메뉴 알림함 진입, unread count, 목록, mark read 확인
  - 타임라인 작성 입력과 keyboard bar smoke 확인
  - logcat fatal / ANR / unhandled promise / ReactNativeJS fatal pattern 0건

## 2026-07-01 V1.1 추가 업데이트 2차 MVP edge QA closeout

- [x] `adminQA` 고정 계정 상태 확인
  - 권한: 일반 사용자
  - profile, nickname, `AdminQAPet`, onboarding 정상
  - pending deletion 없음
  - admin/super_admin 권한 부여 없음
  - 무작위 신규 QA 계정 생성 없음
- [x] 데일리 streak edge
  - transaction rollback smoke로 KST 다음날 current streak 증가 확인
  - missed day reset 확인
  - best streak 유지 확인
  - 같은 날 중복 작성 시 streak 중복 증가 없음
  - 삭제/카테고리 변경 후 당일 상태 재계산 확인
  - user/pet isolation 확인
- [x] 알림 read path edge
  - unread count, 목록, mark read, mark read idempotency 확인
  - 알림별 X 제거, 카드 이동형 좌우 스와이프 dismiss, 전체삭제 확인
  - collapsed/expanded card, 아래/위 화살표 tap, 세로 swipe 펼침/접힘 확인
  - 삭제는 원본 데이터 hard delete가 아니라 user-scoped dismiss로 처리
  - 사용자 알림과 활성 공지 read path 확인
  - cross-user notification hidden 확인
  - 전체메뉴 badge/dot과 알림함 진입점 유지
  - 홈 상단 알림 아이콘 탭 -> floating notification shade overlay -> X/backdrop/Android back 닫기 확인
  - 2026-07-02 코드 기준 inline panel 제거와 overlay shade 구현, typecheck/lint/focused test/release build 통과
  - 2026-07-02 `SM_S937N / R5CY613NMSY`에서 overlay screenshot/uiautomator bounds, open 전후 홈 콘텐츠 y좌표 유지, adminQA empty/list/read path 가능 범위를 재확인했다. 최신 final sign-off smoke에서는 adminQA inbox가 이전 전체삭제 후 empty 상태였으므로 live item gesture는 focused test와 직전 다중 알림 실기기 evidence로 보완한다.
- [x] XP / 레벨 / 칭호 edge
  - source idempotency 확인
  - 150 XP/day cap 확인
  - Lv.1~10 level curve 확인
  - title 1회 지급과 중복 방지 확인
  - cross-user XP/title hidden 확인
  - 삭제/신고/차단 콘텐츠 XP clawback은 V1.1.1 정책 후보이며, 같은 source_id 반복 지급 방지는 동작함
- [x] RLS/RPC 보안 재검증
  - anon direct table select row 0
  - anon RPC `42501` 계열 거부
  - authenticated own-data only
  - cross-user/cross-pet hidden
  - raw/internal/admin field와 secret/token 노출 없음
- [x] Android `adminQA` edge smoke
  - release APK rebuild/install
  - 타임라인 데일리판과 활동 성장 카드 확인
  - 전체메뉴 알림함과 알림 목록/읽음 확인
  - 홈 상단 알림 아이콘, 상단 floating notification shade, `ADMIN_QA_NOTICE` 항목, X/backdrop/Android back 닫기 확인
  - `ADMIN_QA_NOTICE` 다중 알림 상태에서 내부 스크롤, 높아진 overlay panel, 카드 이동형 좌우 스와이프 dismiss, 알림별 X 없음, 화살표-only 펼침/접힘, 전체삭제 후 empty state 확인
  - overlay open 전후 홈 콘텐츠와 하단 네비게이션 layout이 밀리지 않는지 확인
  - 타임라인 작성 keyboard bar smoke 확인
  - logcat fatal / ANR / unhandled promise / ReactNativeJS fatal pattern 0건

## 2026-07-02 V1.1 final sign-off / V1.1.1 scope audit

- [x] V1.1 final sign-off 판정
  - 판정: `V1.1 final sign-off 가능`
  - V1.0 회귀 blocker 없음.
  - V1.1 산책 POI closeout 가능 상태 유지.
  - V1.1 1차 MVP는 release blocker 없이 조건부 closeout 유지.
  - V1.1 2차 MVP는 notification/daily streak/XP final sign-off 가능.
- [x] notification 최신 UX 기준
  - 알림별 작은 X 제거는 최신 UX 정리 결과이며 release blocker가 아니다.
  - 주요 삭제 UX는 좌우 swipe dismiss와 `전체삭제`로 유지한다.
  - collapsed/expanded는 화살표-only indicator와 위/아래 스와이프를 사용한다.
  - 삭제는 user-scoped dismiss이며 공지 원본 hard delete가 아니다.
- [x] V1.1.1 후보 scope audit
  - push remote notification: 미구현/후속. local schedule notification infra는 별도 기존 범위.
  - 운영자 발송 UI: 앱 내부 미구현/후속. 일반 사용자와 `adminQA`에 노출되지 않음.
  - 홈 위젯: Android native/JS 일부 코드 존재. V1.1 release scope leak을 막기 위해 receiver disabled/exported false와 native package 미등록으로 차단.
  - 무지개다리 서비스: pet memorial profile state는 있으나 상품/문의/결제 flow는 미구현/후속.
  - 고급 XP/랭킹: privacy-limited `누리 랭킹` MVP 구현. leaderboard/ranking public exposure는 제한 필드와 마스킹 정책으로만 허용.
- [x] 보안 smoke
  - private tables anon direct select row 0.
  - user RPC anon 호출 `42501` 계열 거부.
  - notification dismiss는 user-scoped hide.
  - XP/streak는 user/pet isolation 유지.
  - walk/hospital public projection은 기존 public-safe 계약 유지.

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
  - V1.0 기능/QA blocker가 아니며 V1.1 작업도 아니다. NURI 앱 개발과 QA가 완전히 끝난 뒤 최종 제출 직전 준비 단계에서 진행한다.
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

이 항목들은 신규 기능 개발이 아니며, 2026-06-04 기준 P0/P1 closeout은 닫힌 상태다. Play Store 제출 자산은 별도 final submission prep으로 분리한다.

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
  - 2026-06-04 기준 P2: 4건
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

### 0-1-1. 2026-06-23 Release Candidate Smoke

- [x] release APK update install
  - Android `SM_S937N` / `R5CY613NMSY`에 `android/app/build/outputs/apk/release/app-release.apk` update install 성공
  - installed package: `versionName=1.0`, `versionCode=1`, `lastUpdateTime=2026-06-23 08:49:08`
- [x] 사용자-facing 핵심 플로우 smoke
  - 홈, 로그인 세션 복귀, Profile/Pet 카드, Weather, 전체메뉴, Community/Policy, Timeline read path 확인
  - Health Report read path와 `건강 기록하기` write entrypoint 진입 확인. 운영 DB에 테스트 기록은 남기지 않음
  - Animal Hospital 리스트/상세/전화하기/길찾기 CTA 표시 확인
  - Walk/POI 리스트, empty UX, detail tap, gate 밖 safe UX 확인
  - 로그아웃 확인 모달, 로그아웃 완료, 로그인 홈 복귀, `카카오로 시작하기`/`Google로 시작하기` 버튼 노출 확인
- [x] 산책 POI 회귀
  - approved/public/active POI 1,145건 유지
  - public nearby 20건, `호수공원` search 6건, detail 1건
  - pending/rejected/held public active leak 0건
  - public RPC internal key leak 0건
  - anon direct `walk_pois` select: `42501 permission denied`
  - anon admin RPC: `WALK_POI_ADMIN_REQUIRED`
  - Ready 권역: `kakaoBlocked: true`, `gateLimited: true`, `resultCount: 8`
  - gate 밖 좌표: `gateLimited: false`, `kakaoBlocked: true`, safe empty UX 표시
- [x] crash-free logcat
  - `FATAL EXCEPTION`: 0건
  - `ANR in`: 0건
  - `Unhandled promise` / `Possible Unhandled Promise Rejection`: 0건
  - `ReactNativeJS fatal`: 0건
- [x] 운영비 readiness
  - Supabase project `NURI`: CLI 기준 `ACTIVE_HEALTHY`
  - DB size: 약 177MB
  - Edge Functions: 6개 ACTIVE
  - 실제 Supabase plan/청구 사용량과 Codex 실제 플랜은 dashboard/account owner 확인 필요

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
  - 확인: 홈 날씨 카드 데이터 렌더링, 상세 `오늘의 날씨` 진입, 미세먼지/주간 예보/대기 질 정보 렌더링, 날씨 상세 `날씨 데이터: Open-Meteo` attribution 노출. 2026-07-11 PO 요청 기준 로그인 홈 compact 카드의 attribution 문구는 숨김 처리했다.
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

### 4. 최종 제출 직전 준비: 스토어 제출 자산

- 스토어 출시 자산 세팅은 V1.0 기능/QA blocker가 아니며 V1.1 작업도 아니다.
- 이 섹션은 NURI 앱 개발과 QA가 완전히 끝난 뒤 최종 제출 직전 준비 단계에서 닫는다.
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

## 2026-07-12 관리자 홈페이지 본구현 1차 체크

- [x] 실제 관리자 홈페이지 source of truth를 `nuri-web /admin`으로 유지
- [x] React Native 앱 내부 일반 사용자 화면에 관리자 UI 미노출
- [x] 신규 관리자 route를 protected route group에 추가
  - `/admin/reports`
  - `/admin/community`
  - `/admin/hospitals`
  - `/admin/users`
  - `/admin/users/[id]`
  - `/admin/pets`
  - `/admin/pets/[id]`
  - `/admin/audit-logs`
- [x] Dashboard/sidebar를 실제 1차 route로 연결
- [x] 신고/콘텐츠, 커뮤니티, 동물병원, 사용자, 반려동물, audit log read-only 구현
- [x] 사용자 hard delete, 게시글/댓글 hard delete, 사용자 권한 상승, 동물병원 approve/reject/hold, 전체 broadcast 비활성 유지
- [x] raw UUID/email/phone/password/token/secret UI 노출 방지
- [x] DB/RPC/RLS/seed 변경 없음
- [x] Play Store 자산 없음

## 2026-07-12 관리자 홈페이지 본구현 3차/4차 체크

- [x] `nuri-web /admin` role/capability model 구현
- [x] action별 capability disabled reason 표시
- [x] server action capability guard 유지
- [x] `/admin/notifications` 통합 route 추가
- [x] QA 닉네임 단일 대상 알림 발송 wrapper 추가
- [x] 전체 broadcast, segment 발송, push 실제 발송 disabled 유지
- [x] 운영 통계 dashboard read-only RPC 연결
- [x] action history와 audit before/after diff 표시
- [x] conflict-safe undo UI와 undo RPC 추가
- [x] hard delete, 사용자 권한 상승, 게시글/댓글/병원 원본 삭제 없음
- [x] raw UUID/email/phone/password/token/service role key UI 노출 방지
- [x] additive migration remote 반영 및 anon negative smoke 확인
- [x] `nuri-web` lint/build/diff 통과

## 2026-07-14 최종 Release QA Gate 재판정

- [x] 최신 release APK 새 빌드/설치
  - APK SHA-256: `57c660393d4de35e1a00c8d19e4b29e85422fcddd60c86cb6048ac621ac6cbeb`
  - 기기: `SM_S937N / R5CY613NMSY`
  - package: `com.nuri.app`, versionName/versionCode: `1.0` / `1`
- [x] Google OAuth 실기기 smoke
  - Google 버튼 노출, Naver/Apple 미노출
  - provider flow 취소 후 앱 로그인 화면 복귀
  - controlled Google identity 실제 성공, `NicknameSetup -> PetCreate -> Home`, session restore 확인
- [ ] Kakao OAuth 취소/복귀 완전 closeout
  - controlled Kakao identity 실제 성공, `NicknameSetup -> PetCreate -> Home`, session restore 확인
  - Kakao SSO/외부 앱 전환 특성 때문에 순수 취소 후 로그인 화면 복귀는 이번 턴에서 깨끗하게 닫지 못했다.
- [ ] 전체 TextInput keyboard/navigation sweep
  - 로그인, NicknameSetup, PetCreate 일부 입력/validation/back은 확인
  - 게시글 작성/수정, 댓글, 신고, 검색, 건강/체중/날짜, 펫 수정, 닉네임 변경, 탈퇴 확인 등 전체 노출 route sweep은 완료하지 못했다.
- [x] notification token isolation E2E (2026-07-19: logout revoke, controlled account switch, cross-user active binding 0)
  - `adminQA` 재로그인 사용자 입력이 완료되지 않아 opt-in/out, logout revoke, account switch ownership을 최신 APK 실기기에서 닫지 못했다.
  - actual push는 계속 비활성이다.
- [ ] 최종 release regression gate
  - typecheck/lint/Jest/Supabase dry-run/logcat short gate는 통과
  - `adminQA` 세션 기반 Home/Community/Hospital/Walk/Notification/Settings 전체 물리 회귀는 완료하지 못했다.

## 2026-07-14 관리자 Android Evidence Closeout 체크

- [x] Android release APK 최신 빌드/설치
  - 기기: `SM-S937N / R5CY613NMSY`
  - APK SHA-256: `66fc6c761cd862e8943c87c234f45aa180db8dcfcfe6e2fcfa105d8ed8e38c45`
  - package: `com.nuri.app`, versionName/versionCode: `1.0` / `1`
  - lastUpdateTime: `2026-07-14 00:29:23`
- [x] 관리자 soft-hide 앱 read-path 반영
  - QA 게시글: production admin approval flow로 `active -> hidden`, 앱 feed 제거, count `6개 -> 5개`, cold start 후 숨김 유지
  - undo 후 `active` 복구, 앱 feed count `6개` 복원
  - direct detail hidden/null 정책은 `communityReadPathPolicy.test.ts`로 고정
- [x] 댓글 soft-hide 앱 read-path 반영
  - QA 댓글: `active -> hidden`, feed preview `5 -> 4`
  - undo 후 `active` 복구, feed preview `5` 복원
- [x] Android 알림 lifecycle 대표 경로
  - 시스템 알림 권한 허용
  - 운영 알림 opt-in 후 `push_opt_in=true`, provider `disabled`, token status `provider_unavailable`
  - opt-out 후 `push_opt_in=false`, token status `revoked`
  - 실제 push 발송 없음
- [x] Keyboard/nav/back 대표 입력 경로
  - 커뮤니티 댓글 입력 focus 시 keyboard bar가 TextInput/CTA를 가리지 않음
  - Android back으로 keyboard dismiss와 리스트 복귀 정상
- [x] latest logcat
  - `/tmp/nuri-qa/final-android-logcat-20260714.txt`
  - `FATAL EXCEPTION`, `ANR`, `Unhandled promise`, `ReactNativeJS fatal`, `Fatal signal` pattern 0건
- [ ] 남은 외부/운영 조건
  - MFA/recovery 실제 등록/사용 QA
  - 검색 전용 UI hidden 제거 캡처
  - logout/account switch token isolation 실기기 증적
  - custom domain / 외부 runtime monitoring

## v1.1 업데이트 백로그

- 아래 항목은 v1.0 미완성 이월이 아니라 신규 업데이트 후보로 관리한다.

## 2026-07-09 V1.1.1 프리미엄 보상 모달 release 체크

- [x] `PremiumRewardModal` 구현 검토
  - XP 획득량, 누적 XP, 현재 레벨, 레벨업 여부, streak 표시 확인
  - NURI premium pet-app tone 확인
  - 서버 XP/RPC/RLS 계약 변경 없음
- [x] `오늘 하루 안 보기` 정책 검토
  - KST 기준 user-scoped AsyncStorage key
  - 같은 날 재노출 suppress
  - 다음 날 다시 표시 가능한 구조
  - 다른 사용자/서버 데이터 영향 없음
- [x] Android visual QA
  - 기기: `SM_S937N / R5CY613NMSY`
  - XP 지급 모달: `/tmp/nuri-qa/v111-premium-reward-modal-walk-xp.png`
  - 오늘 하루 안 보기: `/tmp/nuri-qa/v111-premium-reward-modal-hide-today.png`
  - cold start persistence: `/tmp/nuri-qa/v111-premium-reward-modal-cold-start-persistence.png`
  - 후속 같은 날 기록 suppress: `/tmp/nuri-qa/v111-premium-reward-modal-suppressed-after-hide.png`
- [x] 회귀 범위
  - 기록 작성 후 상세 이동 유지
  - 기록 수정 완료 premium completion/reward path 확인
  - 날씨 활동 완료 모달 premium tone 적용
  - 활동·칭호 대시보드 반영 유지
  - 알림 home quick dismiss / inbox delete 분리 유지
- [x] 최종 검증 명령
  - typecheck
  - lint
  - focused tests
  - diff check
  - release APK rebuild/install
  - logcat fatal/ANR/unhandled/ReactNativeJS fatal 0건

판정: release blocker 없음. 최종 검증 명령 통과 후 V1.1.1 프리미엄 보상 모달 closeout 가능.

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

## 2026-07-23 자주 쓰는 기록 E2E release evidence

- [x] 홈 `자주 쓰는 기록` 프리미엄 UI
  - 스파클 헤더, 9px 설명 문구, 전체 보기, 산책·식사·건강·미용 카드
  - 모든 화면 1:1:1:1 동일 폭 4열
  - 카테고리 카드 배경 투명, 강한 그림자 제거
  - 폰트: 제목 18/600, 설명 9/400, 전체 보기 12/500, 카테고리 13/600, 상대시간 9/500, 요약 10/500
- [x] 실제 최신 기록 연동
  - 선택된 반려동물 기준 `MemoryRecord` 최신 1건
  - 상대시간·요약·기록 없음·로딩·오류 상태
- [x] 실기기 기록 저장 및 영속성
  - `adminQA`에서 산책·식사·건강·미용 각 1건 저장
  - 저장 직후 홈 반영 및 강제 종료 후 재실행 유지
  - evidence: `/tmp/nuri-qa/frequent-records-four-qa.png`, `/tmp/nuri-qa/frequent-records-after-restart.png`
- [x] 코드 게이트
  - typecheck, lint, 68 suites / 272 tests, release APK build 통과
- [x] 상대시간 실시간 갱신
  - focus·active 상태에서 60초 interval 및 foreground 즉시 sync
  - 실기기 60초 이상 대기 후 네 카드 상대시간 증가 확인
  - evidence: `/tmp/nuri-qa/frequent-records-1x4-window-scrolled.xml`, `/tmp/nuri-qa/frequent-records-1x4-window-after-60s.xml`

## 2026-07-23 자주 쓰는 기록 한국어 요약·타이포그래피 보정 release evidence

- [x] 홈 `자주 쓰는 기록` 최종 타이포그래피와 간격 보정
  - 섹션 제목: `18px / 600` 유지
  - 설명 문구: `10px / 400`
  - 전체 보기: `11px / 500`, 투명 배경, 최소 높이 34dp
  - 카테고리명: `12px / 500`
  - 기록 시간: `9px / 500`, 좌우 padding 10dp
  - 기록 요약: `9px / 500`
  - 로딩·오류 문구: `13px / 500`
  - 스파클 래퍼 26dp, 카테고리 아이콘 24dp, 카드 아이콘 래퍼 36dp
  - `오늘의 말`과 `오늘 한장` 사이 간격을 `todayPhotoSection`으로 확대
- [x] 실제 데이터 기반 한국어 요약 규칙
  - 산책: 기록 시각의 오전/오후 및 저장된 시간·거리 데이터에서 `오전 산책 완료`, `32분 산책 완료`, `1.8km · 32분` 형태를 생성
  - 식사: 저장된 수량·단위에서 `사료 180g` 형태를 생성하며 임의의 `0g`을 만들지 않음
  - 건강: 저장된 감정 태그에서 `컨디션 나빠요`, `컨디션 좋아요`, `컨디션 무난해요`를 생성
  - 미용: 저장된 목욕·털·발톱 관련 metadata에서 `목욕 & 털 정리`, `목욕 완료`, `털 정리 완료`, `발톱 정리 완료`를 생성
- [x] 최신 실기기 재검증
  - `adminQA`의 QA 펫에 아래 새 기록 4건을 저장하고 삭제하지 않음:
    - `QA_walk_morning_20260723`
    - `QA_meal_food_180g_20260723`
    - `QA_health_condition_bad_20260723`
    - `QA_grooming_bath_fur_20260723`
  - 홈 카드 출력: `오전 산책 완료`, `사료 180g`, `컨디션 나빠요`, `목욕 & 털 정리`
  - 앱 강제 종료·재실행 후 동일 출력 및 QA 기록 유지 확인
  - 60초 갱신 전후 산책 `2분 전 → 3분 전`, 식사 `1분 전 → 2분 전` 등 상대시간 진행 확인
  - evidence:
    - `/tmp/nuri-qa/frequent-records-korean-final-before-60s.png`
    - `/tmp/nuri-qa/frequent-records-korean-final-after-60s.png`
    - `/tmp/nuri-qa/frequent-records-korean-final-before-60s.xml`
    - `/tmp/nuri-qa/frequent-records-korean-final-after-60s.xml`
    - `/tmp/nuri-qa/frequent-records-korean-relaunch-scrolled.xml`
    - `/tmp/nuri-qa/frequent-records-korean-final-logcat-20260723.txt`
  - 최종 APK 재설치 evidence:
    - `/tmp/nuri-qa/frequent-records-korean-final-release.png`
    - `/tmp/nuri-qa/frequent-records-korean-final-release.xml`
    - `/tmp/nuri-qa/frequent-records-korean-final-release-logcat.txt`
- [x] 최종 코드 게이트
  - typecheck 통과
  - lint 통과, 신규 error 없음
  - Jest `68 suites / 273 tests` 통과
  - release APK build/install 통과
  - APK SHA-256: `5a9d19e5021fdb0553d3cc10caa6fb628ec0a96ac9ce6fe2e658f64c8adc53dd`
  - logcat `FATAL EXCEPTION`, `ANR in`, `Fatal signal`, `ReactNativeJS fatal`, `Unhandled promise` 0건
  - Supabase dry-run: remote up to date. 이 항목은 구조화 입력 migration 적용 전의 이전 typography-only evidence다.

## 2026-07-23 자주 쓰는 기록 구조화 입력·중앙 정렬 최종 release evidence

- [x] 카드 콘텐츠 중앙 정렬
  - 아이콘·카테고리·상대시간·요약을 하나의 중앙 stack과 고정 slot으로 배치
  - 1:1:1:1 동일 폭, 투명 카드, 강한 그림자 없음
- [x] 실제 입력 필드와 홈 요약 계약
  - 산책: `createdAt` 로컬 시간대 기반 오전/점심/오후/저녁/밤
  - 식사: 급여량 숫자 입력, 0 이하 차단, 선택 펫 기본 급여량 자동 입력
  - 건강: 컨디션 선택, 선택 체중 kg
  - 미용: 다중 care type, 전체 미용과 세부 항목 상호 배타
- [x] Supabase additive migration
  - `20260723110000_record_structured_fields.sql` 적용
  - `memories.metadata`, `pets.default_meal_amount_grams`
  - `supabase db push --dry-run`: remote up to date
- [x] Android 실기기 E2E
  - `SM_S937N / R5CY613NMSY`, `adminQA`와 기존 QA 펫
  - 산책 저장, 식사 180g 기본값 저장/자동 입력, 식사 150g 수동 변경, 건강 `지켜봐야 해요`+4.8kg, 미용 `목욕 & 털 정리`
  - 홈 즉시 반영 및 강제 종료·재실행 후 유지
  - 최종 기록은 QA 계정에 유지하고 cleanup하지 않음
- [x] 최종 evidence
  - APK SHA-256: `1ef8949f46732814fe35162d4fc93e0352d09e59d3781062679ac06d1beeb578`
  - `/tmp/nuri-qa/frequent-records-structured-final-release.png`
  - `/tmp/nuri-qa/frequent-records-structured-final-release.xml`
  - `/tmp/nuri-qa/frequent-records-structured-final-release-logcat.txt`
  - app fatal/ANR/ReactNativeJS fatal/unhandled promise 0건
- [x] 코드 게이트
  - typecheck, lint, focused 8 tests, 전체 69 suites / 277 tests, release build/install, Supabase dry-run

## 2026-07-23 최근 기록 리스트 리디자인 release evidence

- [x] 홈 최근 기록 전용 행 UI
  - 공용 타임라인 카드의 100dp 썸네일·세로 rail을 홈에서 제거하고, 날짜 그룹과 88dp 최소 높이의 둥근 행으로 교체
  - 카테고리 아이콘, 카테고리명, 실제 metadata 기반 한국어 요약, 기록 시각과 chevron의 수평 정렬 표시
  - 섹션 제목 `18/600`, 전체보기 `11/500`, 카테고리명 `14/500`, 기록 시간·요약 `11/500`, 상태 문구 `13/500`
- [x] Android 실기기
  - `SM_S937N / R5CY613NMSY`, 최신 release APK 설치
  - 고정된 건강 행 탭 후 해당 `추억상세보기` 이동 및 Android back 복귀 확인
  - evidence: `/tmp/nuri-qa/recent-records-redesign-list-v2.png`, `/tmp/nuri-qa/recent-records-row-navigation-health-v2.png`, `/tmp/nuri-qa/recent-records-redesign-list-v2.xml`
- [x] 최종 코드 게이트
  - typecheck, lint, diff check, release build/install 통과
  - 앱 프로세스 logcat `FATAL EXCEPTION`, `ANR in`, `Fatal signal`, `ReactNativeJS fatal`, `Unhandled promise` 0건
  - APK SHA-256: `c066fe5f5e41a9f8bf68cecca031e11ce6bcd0d5655264efdaa56398fb3d0334`
  - 앱 프로세스 logcat: `/tmp/nuri-qa/recent-records-redesign-logcat-app-v2.txt`

## 2026-07-31 이번 주 요약 리디자인·주간 집계 release evidence

- [x] 레퍼런스 기반 주간 요약 UI
  - 헤더, 2x2 통계 카드, 한 줄 요약, footer 정보 바 구현
  - metric card 높이 144dp, icon 42dp로 압축
  - 최근 기록 섹션과 맞춘 폰트: 제목 18/600, 설명 11/500, 라벨 14/500, 숫자 28/800, 단위 11/500, 요약 제목 14/600, 요약 본문 11/500, footer 11/500/12/700
- [x] 주간 집계 계약 보정
  - KST 월요일 시작·다음 월요일 미만 범위
  - 선택된 펫의 category-first 분류
  - 산책·식사·생활 count, distinct 기록일, 총 기록 계산
  - 건강·일기·병원 명시 category의 잘못된 생활 합산 방지
- [x] 10건 이상 한글 실기기 QA
  - `SM-S937N / R5CY613NMSY`, 고정 QA 계정과 기존 QA 펫 사용
  - 산책 4건, 식사 3건, 생활 3건을 새로 저장하고 기존 산책 1건을 포함한 실제 결과 확인
  - 최종 표시: 산책 5, 식사 3, 생활 3, 기록한 날 1, 총 기록 11개
  - 앱 강제 종료·재실행 후 동일 수치 유지
  - QA 기록은 삭제하지 않고 유지
- [x] 최종 release artifact
  - APK: `android/app/build/outputs/apk/release/app-release.apk`
  - versionName `1.0`, versionCode `1`
  - SHA-256: `876c31e131d261ce78f86024b83acc85d690187389fb7c9e96002b4928f060b7`
  - 임시 `ClipboardActivity`는 최종 빌드 전에 제거
- [x] 검증
  - typecheck 통과
  - lint 통과, 신규 error 없음
  - Jest `69 suites / 279 tests` 통과
  - release build/install 통과
  - Supabase dry-run: remote up to date
  - 최종 logcat fatal/ANR/ReactNativeJS fatal 표식 0건
  - evidence: `/tmp/nuri-qa/weekly-summary-final-release-verified.png`, `/tmp/nuri-qa/final-release-weekly-full.xml`, `/tmp/nuri-qa/weekly-summary-qa-10plus-full.png`, `/tmp/nuri-qa/weekly-summary-qa-relaunch-final.png`, `/tmp/nuri-qa/final-release-logcat.txt`

## 2026-07-31 홈 전체 기준선 조사·최근 기록 단일 카드 release evidence

- [x] 홈 범위 변경
  - 로그인 홈 동적 오늘 메시지 영역과 헤더의 정적 오늘 메시지 문구 제거
  - 자주 쓰는 기록 clock icon 제거, 상대시간 텍스트·진입 동작 유지
  - 최근 기록을 외부 카드 1개와 row/inset divider로 정리
  - loading/empty 상태도 동일 외부 카드 안에 유지
  - 커뮤니티 파일 0개 변경
  - 앱 navigation 파일 0개 변경
- [x] 정적 기준선 조사
  - 비커뮤니티·비네비게이션 source 303개
  - 고유 route 52개, 비커뮤니티 화면 파일 74개
  - fontSize 27개, fontWeight 14개, lineHeight 29개, letterSpacing 13개
  - paddingHorizontal 25개, paddingVertical 23개, gap 20개, borderRadius 40개
  - PretendardVariable.ttf 단일 자산 및 shared GuestHome hero style 확인
- [x] Android physical device
  - `SM-S937N / R5CY613NMSY`, Android 16, 1080x2340, density 450
  - release APK install/cold start/home scroll 확인
  - 오늘 메시지 미노출, 자주 쓰는 기록 clock icon 미노출, 최근 기록 단일 card/inset divider 확인
  - evidence: `/tmp/nuri-qa/home-after-recent-card.png`, `/tmp/nuri-qa/home-recent-single-card.png`, `/tmp/nuri-qa/home-final-release-no-today-message.png`, `/tmp/nuri-qa/home-final-release-logcat-app.txt`
- [x] 최종 코드 게이트
  - typecheck 통과
  - lint 통과, 신규 error 없음
  - Jest `69 suites / 279 tests` 통과
  - release build/install 통과
  - app-PID filtered logcat fatal/ANR/ReactNativeJS fatal 0건
  - APK SHA-256: `cb21911013ebc74debc2b2f3b54b1d467cb3adf4f4bfd2bdf4b3da6500a0bc60`
  - logcat: `/tmp/nuri-qa/home-logcat-app.txt`

## 2026-07-31 비제외 전역 UI 및 홈 기록 영역 최종 release evidence

- [x] unified typography 적용
  - unifiedTitle: 18/600
  - unifiedLabel: 14/500
  - unifiedBody/unifiedMeta: 11/500
  - unifiedDate: 13/500
  - PretendardVariable 기반, 커뮤니티·네비게이션·날씨 preset/소스 미변경
- [x] 홈 자주 쓰는 기록
  - 4열 동일 폭 유지
  - 외부 gradient 및 항목별 카드 배경 제거
  - marker형 시간 강조, clock icon 없음
  - 공통 `전체 보기` action 적용
- [x] 홈 최근 기록
  - 단일 외부 카드 내부에 헤더·날짜 그룹·row 배치
  - 전체 보기 버튼을 카드 내부로 이동
  - divider를 icon 영역까지 전체 row 폭으로 확장
  - 마지막 row divider 없음
- [x] physical device
  - `SM-S937N / R5CY613NMSY`, Android 16, 1080x2340, density 450, portrait
  - 최종 release APK install/cold start/home scroll 성공
  - Galaxy S24 동일 모델 evidence는 미확인
- [x] 최종 코드 게이트
  - typecheck 통과
  - lint 통과, 신규 error 없음
  - Jest `69 suites / 279 tests` 통과
  - Supabase `db push --dry-run`: remote up to date
  - release build 성공
  - APK SHA-256: `15992eeceeed7ce99a205d84d2691384b0e62fb8d17d20554a5a713df853eefb`
  - evidence: `/tmp/nuri-qa/global-ui-final.png`, `/tmp/nuri-qa/global-ui-final-records.png`, `/tmp/nuri-qa/global-ui-final-recent.png`, `/tmp/nuri-qa/global-ui-final-logcat.txt`
  - 앱 PID 기준 Fatal/ANR/ReactNativeJS fatal/Fatal signal/unhandled promise 0건
  - diff check 통과
