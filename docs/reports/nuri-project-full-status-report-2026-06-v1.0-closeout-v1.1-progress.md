# NURI 전체 프로젝트 현황 보고서

기준일: 2026-07-09
최종 정합성 검수일: 2026-07-09
문서 목적: ChatGPT, Codex, 운영자, 후속 개발 세션이 현재 NURI 앱의 전체 맥락을 한 번에 파악하기 위한 source of truth 문서

최신 갱신: 2026-07-09 V1.1.1 고도화 1차로 운영자 알림 발송 관리 체계의 DB/RPC/RLS/audit 기반, service role key 없는 QA-only self notification RPC, Lv.1~30 curve, 장기 activity summary RPC, 전체메뉴 `누리 랭킹` MVP를 추가했다. 랭킹 RPC는 email, phone, user_id, pet_id, raw id를 반환하지 않고 pending deletion 사용자를 제외한다. QA ranking fixture 6개는 `adminQA` 계열 QA fixture caller가 명시 요청할 때만 포함한다. push notification은 token/permission/opt-out/secret storage 정책만 문서화했고 실제 remote push 발송은 하지 않았다. 앱 내부 일반 사용자에게 운영자 발송 UI는 열지 않으며, 홈 위젯/무지개다리/Kakao Local global hard delete는 Parking 유지다.

## 1. 문서 목적

이 문서는 V1.0 closeout 이후 NURI 앱이 어디까지 완성됐고, V1.1에서 무엇을 진행 중이며, 앞으로 어떤 작업이 남았는지 한 번에 공유하기 위해 작성한다.

이 문서의 기준은 실제 코드, 현재 git 이력, Supabase migration 상태, project-memory, QA 문서, V1.1 산책 POI 문서다. 문서와 코드가 충돌할 경우 실제 코드와 실제 remote 동작을 우선한다.

## 2. 프로젝트 개요

- 프로젝트명: NURI
- 서비스 설명: 반려동물의 기억, 일상, 건강, 추억을 기록하고 관리하는 디지털 메모리얼 앱
- 핵심 가치: 반려동물과 보호자의 기록을 안전하게 보존하고, 일상 기록과 생활 정보를 신뢰 가능한 방식으로 제공한다.
- 대상 사용자: 반려동물을 키우거나 떠나보낸 보호자, 가족과 추억을 공유하고 싶은 사용자
- 출시 전략: Android 우선 개발과 실기기 QA를 기준으로 V1.0을 안정화하고, V1.1부터 위치/운영/데이터 기반 기능을 확장한다.

주요 기술 스택:

- React Native
- TypeScript
- Supabase Auth / Database / RLS / RPC / Edge Functions
- PostGIS / pg_trgm
- styled-components 기반 theme 구조
- Android 실기기 QA
- 외부 지도 앱 deep link
- 자체 POI DB 기반 location discovery 전환

## 3. 현재 전체 진행률

진행률은 기능 구현, 운영 QA, 보안 gate, 데이터 coverage, 제출 준비를 분리해 산정했다. V1.0은 기능/QA 기준으로 닫혔지만 Play Store 제출 자산은 최종 제출 직전 준비 단계로 별도 분리돼 있다.

| 구분 | 진행률 | 근거 |
| --- | ---: | --- |
| V1.0 기능 개발 | 100% | P0/P1 0건, 필수 기능 closeout, Code Freeze 유지 |
| V1.0 QA/출시 준비 | 약 99% | release APK exact install smoke, 2026-06-30 신규 QA 계정 full E2E/navigation audit, stale onboarding blocker 최소 수정/재검증, admin/super_admin 서버 계약 확인, P0 corrective 회귀 완료, 2026-07-02 V1.1 final sign-off 중 V1.0 회귀 smoke 통과. Play Store 제출 자산은 디자인 조정과 전체 closeout 뒤 최종 제출 직전 준비 |
| V1.1 산책 POI 전환 트랙 | 약 99% | remote DB 기준 approved/public/active POI 1,145건, PostGIS foundation, 앱 POI RPC read path, admin import/review, 전국 주요 coverage, 한글 표시값 기준 유지, walk-domain Kakao fallback 제거, public projection safety, RC smoke 통과 |
| V1.1 추가 업데이트 1차 MVP | 약 98% | 타임라인 count write/edit/delete edge closeout 완료. 회원탈퇴 모달/back/7일 유예와 email 최근 로그인 cold start 확인. 실제 탈퇴 예약과 social 최종 pill은 조건부 evidence |
| V1.1 추가 업데이트 2차 MVP | 100% | 데일리 streak/데일리판, 알림 read path, XP/레벨/칭호 최소 MVP 구현 후 `adminQA` edge QA, KST 날짜 edge, RLS/RPC negative smoke, Android keyboard bar smoke 통과. 홈 상단 알림 아이콘은 floating notification shade overlay로 closeout |
| V1.1 추가 기능 구현 | 약 88% | 1차 MVP 3개 edge QA와 2차 MVP 서버/앱 구현 및 edge QA, 홈 알림 overlay/dismiss/expand UX closeout, V1.1.1 후보 scope audit과 홈 위젯 release 노출 차단, `활동·칭호` 대시보드, 프리미엄 보상 모달, 알림 보존 정책, 운영자 알림 기반, Lv.30, 장기 summary RPC, `누리 랭킹` MVP 완료. push 실제 발송/운영자 관리 UI/무지개다리/공개 리더보드는 후속 |
| V1.1 전체 | 약 77% | 산책 POI 트랙 closeout 가능, full E2E/navigation audit 통과, 병원 coverage 판정 완료, V1.1 추가 업데이트 1차/2차 MVP, 홈 알림 final UX, V1.1.1 활동·칭호/보상 모달/Lv.30/랭킹/운영자 알림 기반 반영 |
| V1.1.1 1차 기능 | 100% | V1.1.1 우선순위와 활동·칭호 정책 v1 문서화, `활동·칭호` route/entry/card UI 구현, 실제 adminQA 멀티펫 분리, 다중 타임라인 XP write smoke, daily cap/idempotency 확인, 카테고리별/글/댓글 focused test, 알림 home dismiss와 inbox delete 분리, 프리미엄 보상 모달 visual QA 완료 |
| V1.1.1 고도화 1차 | 약 86% | 운영자 알림 DB/RPC/RLS/audit 기반, QA 알림 생성 RPC, Lv.1~30, 장기 summary RPC, privacy-limited 랭킹 MVP 구현. Android 최종 캡처와 운영자 관리 페이지 UI는 후속 |
| 전체 제품 로드맵 | 약 98.4% | V1.0 release-ready 기준선은 닫혔고 V1.1/V1.1.1 주요 사용자 기능과 운영 기반 대부분 완료. Play Store 자산, 디자인 polish, 운영자 관리 페이지 UI, push 실제 발송, 홈 위젯, 무지개다리, 공개 리더보드는 남음 |
| 최종 제출 준비 | 약 20% | release artifact/provenance와 정책 URL 기준은 정리됐지만 Play Store 스크린샷, 설명문, Console 입력, store listing package는 아직 최종 제출 직전 준비로 남음 |

남은 작업의 성격:

- 기능 개발: 결제/AI/편지함/Apple 등 신규 업데이트. 앱 내부 admin UI 운영자 QA는 홈페이지/관리 페이지 트랙으로 Parking
- 운영 QA: release candidate 반복 smoke, public projection safety 반복 확인, 병원 coordinate 품질 점검
- 데이터 확장: 산책 POI 전국 coverage는 1,145건 기준 closeout 가능. 추가 seed는 V1.1 품질/운영 후보
- 스토어 제출 준비: 앱 내부 디자인 조정 완료 후 Play Store 스크린샷, 설명문, 정책 URL, 문의처, store listing package
- 장기 고도화: 자체 지도 스택, Premium AI, subscription entitlement, moderation/admin 운영 고도화

## 3-1. 2026-06-30 신규 QA 계정 full E2E / navigation audit / 병원 전국 coverage

- 신규 QA 계정: `qa0623145019@example.com`. 비밀번호는 문서화하지 않음
- 신규 사용자 플로우: Splash, 로그인/회원가입, Google/Kakao 버튼, 닉네임 `qa5019`, 펫 `QAPet`, 홈 진입 확인
- release blocker 수정: 로그아웃 후 email/password 재로그인 시 profile/pet이 존재해도 `NicknameSetup`으로 잘못 진입하는 stale onboarding 문제를 수정
- 수정 범위: `src/store/authStore.ts`, `src/services/app/boot.ts`, focused auth/app boot tests
- 재검증: release APK rebuild/install, cold start home 복귀, logout -> email login home 복귀
- 전체 E2E: Home, Profile/Pet, Pet Edit/Create guard, Health, Timeline, Animal Hospital, Walk/POI, Community/Policy, Weather, 전체메뉴/설정, Logout/session restore 확인
- 뒤로가기 audit: 주요 사용자-facing 화면 17개에서 상단 뒤로가기와 Android system back 확인
- Animal Hospital 판정: `우리동네 병원 찾기 전국 확장 완료, coordinate missing 122건은 release blocker 아님`
  - public active count 5,427건
  - 서울/경기/인천/부산/대구/대전/광주/울산/세종/제주/강원/충청/전라/경상 대표 좌표 모두 10km/20건 반환
  - coordinate missing 122건은 V1.1 데이터 품질 보강 후보
- Walk/POI 회귀: approved/public/active 1,145건, nearby/search/detail 정상, direct anon table select `42501`, Ready Kakao 차단 유지
- 디자인: 수정하지 않음. 스토어 출시 전 디자인 조정 후보는 별도 트랙으로 유지
- Play Store 자산: V1.0/V1.1 전체 완료와 디자인 조정 완료 후 진행

## 3-2. 2026-06-30 V1.1 추가 업데이트 1차 MVP 구현

- 회원탈퇴 입력 확인: 기존 7일 유예 탈퇴 flow는 유지하고, 확인 모달에서 `회원탈퇴`를 trim 후 정확히 입력해야 `탈퇴 요청하기`가 활성화된다. Android smoke에서 모달 진입, 입력 전 disabled, 취소, back dismiss, 7일 유예 안내를 확인했고 실제 탈퇴 예약은 QA 계정 보호와 실기기 한글 입력 자동화 제약 때문에 실행하지 않았다.
- 최근 로그인 방식 표시: Supabase session provider metadata에서 `email`, `google`, `kakao` provider key만 AsyncStorage에 저장한다. 이메일 주소와 provider 계정 정보는 저장하지 않는다. 로그아웃 후 로그인 화면 email 영역 `최근 로그인`과 cold start 유지, Kakao callback, Google chooser/redirect 진입을 확인했다.
- 타임라인 카테고리 count: 현재 선택된 반려동물 기준으로 minimal metadata read와 client aggregation을 사용해 전체/산책/식사/일기장 count badge를 표시한다. QA 계정에서 작성 -> 카테고리 수정 -> 삭제 count 갱신을 확인했고 신규 RPC/migration은 만들지 않았다.
- 검증: `accountDeletionConfirmation`, `recentLoginProvider`, `timelineQuery`, `authStoreRecovery`, `appBoot` focused tests 통과. `tsc`, `lint`, `git diff --check` 통과.
- 범위 제외: streak, XP/칭호, 알림 시스템, 무지개다리 서비스, 홈 위젯, 디자인 조정, Play Store 자산, admin UI, seed/DB/migration 변경은 수행하지 않았다.

## 3-3. 2026-07-01 1차 MVP 조건부 closeout / 키보드 QA / 2차 MVP 정책표

- 1차 MVP 판정: `조건부 closeout 유지`. 타임라인 count는 closeout 완료이고, 회원탈퇴 실제 예약과 Kakao/Google social 최종 pill은 QA 계정 보호와 외부 OAuth consent 조건 때문에 조건부 evidence로 유지한다. release blocker와 V1.1 blocker는 없다.
- 키보드바 QA 기준: 앞으로 모든 실기기 QA에는 키보드바/키보드 회피/입력창 가림/primary action 접근성/모달 크기/Android back keyboard dismiss/dismiss 후 layout 유지 확인을 포함한다.
- Android evidence: `SM_S937N / R5CY613NMSY` 로그인 이메일 입력에서 IME top `y=1395`, height `945` 상태를 확인했다. 이메일/비밀번호 입력창과 로그인 primary button은 키보드 위에 남았고, Android back 후 keyboard가 dismiss되며 layout이 유지됐다.
- 데일리 streak 정책표: KST 00:00 기준, user+pet 하루 1회 인정, 산책 카테고리 타임라인 또는 산책 장소 기록 완료를 기본 인정 조건으로 둔다. missed day는 MVP에서 reset하고, 서버 activity summary/RPC가 필요하다.
- XP/칭호 정책표: 산책 기록 20 XP, 산책 타임라인 30 XP, 일반 타임라인 15 XP, 커뮤니티 글 10 XP, 댓글 3 XP, 건강 기록 10 XP를 초안으로 두고 daily cap과 server ledger/idempotency를 필수 조건으로 둔다.
- 알림 read path 정책표: 홈 badge, 앱 내부 알림 목록, 읽음 처리, 특정 사용자 알림 수신을 MVP로 둔다. 운영자 발송은 별도 홈페이지/관리 페이지, push는 후속으로 분리한다.
- 진행률: 이 섹션은 2차 MVP 구현 전 기준의 archive/reference다. 최신 기준은 아래 3-4 섹션을 따른다.

## 3-4. 2026-07-01 V1.1 추가 업데이트 2차 MVP 구현

- 고정 QA 계정: `adminQA`를 일반 사용자 권한으로 고정했다. profile과 `AdminQAPet`이 있으며 admin 권한은 부여하지 않았다. 민감정보는 문서화하지 않는다.
- untracked closeout: `docs/## GitHub Copilot Chat.md`는 Copilot 임시 문서이고 민감정보가 없어 삭제했다.
- 정책 spec: `docs/planning/v1.1-second-mvp-policy-spec.md`
- migration: `20260701090000_v11_second_mvp_activity_notifications_xp.sql`, `20260701093000_fix_v11_xp_award_ambiguous_columns.sql`
- DB/RPC/RLS: daily activity/streak summary, notification/read receipt, XP ledger/level/title 테이블과 user-scoped RPC/RLS를 추가했다. anon direct select와 unauthenticated RPC는 차단된다.
- 데일리판: 타임라인 산책 카테고리 작성 성공 시 KST user+pet+date 기준 하루 1회 인정한다. 타임라인 화면에 오늘 완료, current/best streak, 하루 1회 안내를 표시한다.
- 알림 read path: 전체메뉴 `알림함` entry와 `UserNotifications` 화면을 추가했다. unread count, 목록, empty state, mark read를 제공한다. push와 운영자 발송 UI는 제외했다.
- XP/레벨/칭호: source idempotency, daily cap, Lv.1~10, 최소 칭호 지급을 서버 기준으로 처리한다. 타임라인 화면에 total XP, level, 최신 칭호, 다음 레벨 progress를 표시한다.
- Android evidence: `SM_S937N / R5CY613NMSY`에서 release APK rebuild/install, `adminQA` 로그인, 타임라인 데일리판/XP 카드, 알림함 목록/읽음, 타임라인 작성 입력과 keyboard bar smoke를 확인했다.
- logcat: fatal / ANR / unhandled promise / ReactNativeJS fatal pattern 0건. Firebase namespaced API deprecation warning은 fatal crash로 보지 않는다.
- 진행률: 이 섹션은 2차 MVP 구현 직후 기준이다. 최신 edge closeout 기준은 아래 3-5 섹션을 따른다.

## 3-5. 2026-07-01 V1.1 추가 업데이트 2차 MVP edge QA closeout

- 고정 QA 계정: `adminQA` 일반 사용자. profile, `AdminQAPet`, onboarding 정상, pending deletion 없음, admin 권한 없음, 무작위 신규 QA 계정 생성 없음.
- Daily streak: transaction rollback smoke로 KST 다음날 current streak 증가, missed day reset, best streak 유지, 같은 날 중복 방지, 삭제/카테고리 변경 재계산을 확인했다.
- Notification read path: unread count, 목록, mark read, mark read idempotency, 사용자 알림, 활성 공지 read path, cross-user hidden을 확인했다.
- XP/레벨/칭호: source idempotency, daily cap, Lv.1~10 curve, title 1회 지급과 중복 방지, cross-user hidden을 확인했다.
- RLS/RPC: anon direct select row 0, anon RPC `42501` 계열 거부, authenticated own-data only, cross-user/cross-pet hidden을 확인했다. public projection이나 raw/internal/secret 노출은 없다.
- Android evidence: `SM_S937N / R5CY613NMSY`에서 release APK rebuild/install 후 `adminQA` 세션으로 타임라인 데일리판/활동 성장 카드, 전체메뉴 알림함, 알림 목록/읽음, 타임라인 작성 keyboard bar smoke를 확인했다.
- 홈 상단 알림 아이콘은 2026-07-02 UX closeout에서 floating notification shade overlay로 수정했다. overlay는 `오늘의 메시지로 하루를 시작해요` 문구 아래 위치에 뜨지만 홈 레이아웃 flow에 들어가지 않아 날씨/펫/하단 네비게이션을 밀지 않는다. X/backdrop/Android back 닫기 경로를 제공하고, 다중 알림에서는 높아진 panel과 내부 스크롤을 사용한다. 알림별 작은 X는 제거했고, 카드가 이동하며 사라지는 좌우 스와이프 dismiss, 화살표-only 펼침/접힘, 전체삭제는 user-scoped dismiss RPC/RLS와 client UI 상태로 처리한다. 실기기 screenshot/uiautomator 증적과 logcat no-crash를 확보했다. push와 운영자 발송 UI는 후속 트랙이다.
- 진행률: V1.1 추가 업데이트 2차 MVP 100%, V1.1 추가 기능 구현 약 78%, V1.1 전체 약 70%, 전체 제품 로드맵 약 97%.

## 3-6. 2026-07-02 V1.1 final sign-off / V1.1.1 scope audit

판정: `V1.1 final sign-off 가능`

- V1.0 회귀: auth/login/onboarding, timeline, health, hospital, walk, community, 회원탈퇴 입력 확인, 최근 로그인 provider, keyboard/nav bar smoke에서 release blocker 없음.
- V1.1 산책 POI: approved/public/active 1,145건 closeout 가능 상태 유지. public nearby/search/detail, pending/rejected/held 미노출, public projection safety 유지.
- V1.1 1차 MVP: 회원탈퇴 입력 확인과 최근 로그인은 조건부 evidence 유지, 타임라인 category count는 closeout 완료. release blocker 없음.
- V1.1 2차 MVP: daily streak, XP/level/title, notification read/dismiss/expand UX, RLS/RPC negative smoke, Android `adminQA` smoke 기준 final sign-off 가능.
- notification 최신 UX: 알림별 작은 X 제거는 최신 UX 정리 결과이며 release blocker가 아니다. 주요 삭제 UX는 좌우 swipe dismiss와 `전체삭제`로 유지한다. collapsed/expanded는 화살표-only indicator와 위/아래 스와이프를 사용한다.
- security: private tables anon direct select는 row 0, user RPC anon 호출은 `42501`, authenticated own-data only 기준을 유지한다. walk/hospital은 기존 public-safe projection만 허용한다.
- Android evidence: release APK rebuild/install/cold start, home, notification overlay empty/list 가능 범위, X/backdrop/Android back 닫기, bottom nav 미밀림, logcat fatal/ANR/unhandled/RN fatal pattern 0건.
- scope fix: V1.1.1 후보 audit 중 Android 홈 위젯 native receiver/package가 release scope에 남아 있음을 확인했다. 새 기능 구현 없이 receiver를 disabled/exported false로 막고 native package 등록을 제거했다. 이후 packaged manifest에서도 receiver disabled/exported false로 확인했다.

| 후보 기능 | 현재 상태 | 코드 존재 | 앱 노출 | DB/RPC 존재 | 보안 리스크 | V1.1 포함 여부 | V1.1.1 후속 범위 | 판정 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| push 알림 | remote push 미구현. local schedule notification infra만 존재 | 일부 local notification code | remote push UI/permission 노출 없음 | push token table/RPC 없음 | 현재 V1.1 risk 없음 | 제외 | FCM/permission/token 저장/발송/opt-out/delivery log 설계 | 미구현/후속 |
| 운영자 발송 UI | 앱 내부 발송 UI 미구현 | 일반 admin route는 role-gated로 존재 | 일반 사용자/adminQA 미노출 | read/dismiss 계약만 사용 | 일반 사용자 노출 없음 | 제외 | 별도 홈페이지/관리 페이지 발송 UI와 audit log | 미구현/후속 |
| 홈 위젯 | Android native/JS 일부 코드 존재. release 노출 차단 완료 | receiver/provider/bridge code 일부 존재 | `enabled=false`, `exported=false`, native package 미등록 | 별도 DB/RPC 없음 | release scope leak은 최소 수정으로 차단 | 제외 | Android AppWidget 정책, snapshot 계약, 권한/QA 재설계 | 부분 구현/비노출/후속 |
| 무지개다리 서비스 | pet memorial profile state는 존재, 상품/문의/결제 flow 없음 | profile/memorial field code 일부 | 서비스 제안/상품 flow 미노출 | 기존 pet profile field 범위 | 민감 UX 문구는 후속 확정 필요 | 서비스 제외 | 한 번만 노출되는 조심스러운 문의 UX, 결제/상품 정책 | 문서 후보/부분 기반 |
| 고급 XP/랭킹 | privacy-limited `누리 랭킹` MVP 구현. 공개 경쟁형 leaderboard 없음 | ranking screen/service/RPC 존재 | 전체메뉴 `누리 랭킹` 노출 | 제한 필드 ranking RPC 존재 | email/user_id/raw id 미반환, pending deletion 제외 | 제한 포함 | opt-in 공개 리더보드, abuse 정책, 운영 모니터링 | 부분 구현/안전 제한 |

진행률: V1.0 기능 개발 100%, V1.0 QA/출시 준비 약 99%, V1.1 산책 POI 트랙 약 99%, V1.1 추가 업데이트 1차 MVP 약 98%, V1.1 추가 업데이트 2차 MVP 100%, V1.1 추가 기능 구현 약 85%, V1.1 전체 약 74%, V1.1.1 1차 기능 약 96%, 전체 제품 로드맵 약 98%.

## 3-7. 2026-07-02 V1.1.1 우선순위 / 활동·칭호 대시보드 1차 구현

- 우선순위: 1순위 `고급 XP/칭호/훈장/활동내역`, 2순위 운영자 알림 발송 관리 체계, 3순위 push 알림, 4순위 휴대폰 실기기 홈 위젯, 5순위 무지개다리 서비스, 6순위 공개 경쟁형 리더보드로 재정리했다.
- 구현 위치: `전체메뉴 > 나의 반려동물 > 활동·칭호`
- 명칭 사유: `활동·칭호`는 XP, 레벨, 칭호, 훈장을 포괄하면서 `나의 활동내역`보다 덜 딱딱하고 반려동물 앱 톤에 맞다.
- 데이터 계약: 신규 migration/RPC 없이 기존 `user_xp_ledger`, `user_level_summaries`, `user_titles`, streak/timeline count read path와 RLS를 재사용한다.
- 레벨: 현재 서버/app 계약은 Lv.1~30이다. 기존 Lv.1~10 threshold는 유지하고, Lv.11부터 요구 XP가 크게 증가한다. Lv.30 이후는 `최고 레벨 달성`으로 표시한다.
- 실제 XP 연결: 산책/일반 타임라인은 기존 연결을 유지하고, 건강 카테고리 타임라인은 `health_record`, 커뮤니티 글은 `community_post`, 댓글은 `comment` XP 후처리로 연결했다. XP 실패는 원본 작성 flow를 막지 않는다.
- 멀티펫 분리: pet_id가 있는 산책/streak/timeline/health/XP/title은 pet별로 표시한다. 커뮤니티 글과 댓글은 `pet_id=null` user-level 공통 활동으로 표시하고 각 pet 카드에 중복 합산하지 않는다.
- UI 카드: 현재 성장 카드, 아이별 성장 기록, 산책/타임라인/건강관리 카드, 공통 커뮤니티/댓글 카드, 칭호·훈장 보관함을 추가했다.
- 제외: push 실제 발송, 운영자 관리 페이지 UI, 홈 위젯, 무지개다리, 공개 경쟁형 리더보드, Play Store 자산, 디자인 전체 리뉴얼은 구현하지 않았다.

진행률: V1.1 추가 기능 구현 약 85%, V1.1 전체 약 74%, V1.1.1 1차 기능 약 96%, 전체 제품 로드맵 약 98%.

## 3-8. 2026-07-03 V1.1.1 1차 closeout / 알림 보존 정책 분리

- 알림 보존 정책: 홈 간편 알림창 swipe dismiss와 `모두 치우기`는 전체보기 삭제가 아니라 home-only local/user-scoped hide로 분리했다. 전체보기/알림함 개별 삭제와 전체삭제는 기존 서버 RPC의 user-scoped hide를 유지한다.
- 상태 분리: read, home quick dismiss, inbox delete를 별도 상태로 유지한다. close/backdrop/Android back close는 삭제도 home dismiss도 아니다.
- live 알림 row: 현재 셸에는 service role key가 없어 adminQA 새 알림 row 생성 smoke를 수행하지 못했다. policy는 focused test와 기존 read path evidence로 고정하고, 관리 도구가 준비된 뒤 실제 row evidence를 보강한다.
- XP write smoke: `adminQA`에 QA 전용 `AdminQAPet2`를 추가한 뒤 산책 2건, 식사 1건, 일기장 1건, 생활 1건을 저장해 데일리 streak와 활동·칭호 반영을 확인했다.
- 활동·칭호 반영: 총 `120 XP`, AdminQAPet `60 XP · 훈장 2개`, AdminQAPet2 `45 XP · 훈장 1개`, AdminQAPet2 카테고리 `전체 5 / 산책 2 / 식사 1 / 일기장 1 / 생활 1`, 공통 커뮤니티/댓글 `0개`, pet/common owner label이 반영된 획득/잠금 칭호를 확인했다.
- focused test: notification home dismiss vs inbox delete, broken local storage safety, 타임라인 카테고리별 XP event mapping, 글/댓글/카테고리별 게시물 등록 결과의 활동·칭호 카드 반영을 추가했다.
- RLS: anon direct select는 row 0 또는 42501, anon RPC는 notification/streak/XP/title 계열 모두 42501로 차단됐다.

진행률: V1.1 추가 기능 구현 약 85%, V1.1 전체 약 74%, V1.1.1 1차 기능 약 96%, 전체 제품 로드맵 약 98%.

## 4. V1.0 완료 내역

### Auth / Social Login

- 이메일 로그인/회원가입 흐름 구현
- 비밀번호 재설정 deep link 복귀 구현
- 인증 callback과 password reset deep link 분리
- Google OAuth V1.0 성공 smoke 완료
- Kakao OAuth V1.0 성공 smoke 및 신규 사용자 온보딩 확인 완료
- V1.0 소셜 로그인 provider는 Google + Kakao로 확정
- Naver는 V1.0 public surface에서 soft disable
- Supabase `custom:naver` provider와 app-side Naver 코드는 hard delete하지 않음
- Apple 로그인은 Android-first V1.0 범위에서 제외
- 소셜 신규 사용자도 이메일 가입과 동일하게 NicknameSetup -> PetCreate 흐름을 탄다.
- provider metadata nickname/avatar/email은 NURI 확정 profile source of truth가 아니다.

### Profile / Pet / Onboarding

- 닉네임 정책은 `2..10` 기준으로 정렬
- 닉네임 중복확인과 저장 흐름 구현
- 신규 사용자 펫 등록 흐름 구현
- 펫 프로필 수정 흐름 구현
- PetCreate / PetProfileEdit 날짜 모달에 `YYYY-MM-DD` 직접 입력 추가
- 과거 날짜 `2010-05-12` 입력 및 저장 payload 반영 확인
- 잘못된 날짜와 미래 날짜 validation 차단
- Android 키보드 대응 확인

### Account / Policy

- 이용약관/개인정보처리방침 public 문서 연결
- 계정 삭제 안내 연결
- 탈퇴 7일 유예 구조 적용
- 자동 최종 삭제 worker와 storage cleanup 흐름 적용
- `profiles.role self-escalation` P0 corrective migration 완료
- 일반 사용자 role update 차단, 일반 profile update 유지
- 악성 role update 후 admin RPC 권한 거부 확인

### Community

- 게시글/댓글 write-path 방어선 구현
- rate limit, dedupe, blocked-term 처리
- 신고 정책, self-report 차단, duplicate 차단
- auto-hide와 moderation queue/action log 구조 구현
- confirmed nickname 기반 author 표시
- hidden 이미지 public 비노출
- 커뮤니티 인앱 정책 notice와 글쓰기 helper 적용

### Health

- 건강관리 Phase 1 구현
- 체중관리, 건강기록, 인사이트 탭 구성
- 월 단위 조회
- `pet_weight_logs`와 `pets.weight_kg` snapshot 동기화
- 체중 insert/update/delete/fallback 회귀 확인
- Android 실기기 QA 완료

### Weather

- Open-Meteo 클라이언트 직접 호출 제거
- Supabase `weather-cache` Edge Function 경유
- 60분 cache와 stale fallback 적용
- Android smoke 완료
- public endpoint abuse/rate limit 고도화는 V1.1 운영 후보

### Animal Hospital

- Localdata canonical source 기반 동물병원 DB 구축
- public projection 분리
- 리스트 주소 미노출, 상세에서 주소/전화/길찾기 제공
- Google Places/Photos runtime 차단
- approved thumbnail/phone/coordinates gate 적용
- admin/super_admin 운영자 QA 서버 계약 확인
- approve/reject/held/action log/public projection 서버 계약 확인

### Walk / Location Discovery V1.0

- Kakao REST key 클라이언트 직접 호출 제거
- `location-discovery-seed` Edge Function 서버 경유 구조 적용
- client cache / in-flight dedupe / Edge Function URL cache / fan-out 제한
- V1.0에서는 provider-zero가 아니라 controlled-server-call 상태로 close

### Map / API Cost Defense

- Google Places runtime 차단
- Google Place Photos 차단
- `NURI_PLACE_ENRICHMENT_HARD_CAP=0`
- `place-enrichment-worker` no-op
- production Google Places key 제거
- 길찾기 / Routes API는 외부 지도 앱 deep link로 위임
- 지도/API 비용 폭탄 gate close

## 5. V1.1 현재 진행 내역

V1.1 1순위 트랙은 산책/location discovery를 자체 POI DB + Supabase PostGIS 기반으로 전환하는 작업이다.

### DB / RPC Foundation

- migration: `20260604110000_walk_poi_postgis_foundation.sql`
- canonical table: `walk_pois`
- source/import table: `walk_poi_source_records`, `walk_poi_import_batches`
- review/audit table: `walk_poi_reviews`, `walk_poi_audit_logs`
- alias table: `walk_poi_search_aliases`
- PostGIS radius/distance 기반 검색 구조 적용
- `pg_trgm` 기반 검색 확장 가능 구조 적용

Public RPC:

- `walk_poi_public_nearby_v1`
- `walk_poi_public_search_v1`
- `walk_poi_public_detail_v1`

Admin RPC:

- `walk_poi_admin_import_dry_run_v1`
- `walk_poi_admin_import_commit_v1`
- `walk_poi_admin_review_v1`
- `walk_poi_admin_read_summary_v1`
- `walk_poi_admin_audit_detail_v1`

### App Read Path

- 앱 산책/location discovery read path를 자체 POI RPC 우선 구조로 전환
- POI 결과가 있으면 `walk_poi` canonical 카드로 표시
- POI 결과 0건, RPC error, feature flag off, 좌표 없음 등에서는 기존 Kakao fallback 유지
- Kakao Local runtime은 아직 삭제하지 않음
- fallback reason marker:
  - `poi_disabled`
  - `coordinate_missing`
  - `poi_empty`
  - `poi_rpc_error`
  - `detail_not_found`

### Admin Import / Review / Audit

- admin import commit workflow 구현
- approve / reject / held review workflow 구현
- approved + public + active만 public RPC 노출
- pending / rejected / held public 미노출
- audit log 기록
- anon direct table SELECT 차단 유지
- 비관리자 admin RPC `WALK_POI_ADMIN_REQUIRED` 확인
- admin read-only UI 구현
- admin write UI 최소 구현
- 실제 admin/super_admin 세션에서 approve/reject/held button tap e2e와 action log drill-down 확인

### Seed Coverage

- Android smoke starter seed: 3건
- 일산/주엽/호수공원 생활권: approved POI 20건 확보
- 고양시 1차 batch: 신규 33건 승인
- 서울 주요 산책 권역 1차 batch: 신규 33건 승인
- 서울 주요 산책 권역 2차 batch: 신규 44건 승인
- 서울 보류 권역 보강 batch: 신규 67건 승인
- seed 한글화 정규화 + 북서울꿈의숲/수도권 1차 batch: 신규 48건 승인
- 현재 총 approved/public/active POI: 245건

Coverage/fallback gate:

- 적용 지역:
  - 일산 / 주엽 / 호수공원
  - 백석 / 마두 / 정발산
  - 월드컵공원 / 난지 / 망원
  - 반포 / 잠원 / 이촌
  - 뚝섬 / 서울숲
  - 송파 / 올림픽공원 / 석촌호수
  - 양재천 / 탄천
  - 중랑천
  - 안양천
  - 보라매 / 도림천
- 보류 지역:
  - 화정 / 행신 / 삼송 / 원당
  - 서울 전체
  - 수도권 전체
  - 전국 전체
- 보류 사유:
  - 수도권 전체와 전국 전체는 아직 단일 gate를 적용할 coverage 단위가 아니다.

Android 실기기 smoke:

- 고양시 대표 좌표 리스트/검색/상세 확인
- 서울 월드컵공원 대표 좌표 리스트/상세 확인
- pending/rejected/held 앱 미노출 확인
- logcat fatal / ANR / unhandled promise 0건 확인

### 2026-06-15 정합성 검수 근거

이번 보고서의 서울 1차 seed와 admin e2e 항목은 2026-06-15 linked remote read-only query와 실제 코드 기준으로 재확인했다.

- approved/public/active POI count: 86건
- 고양시 1차 seed batch: `1d6bf293-c51d-4c6b-bdb8-74eec00989d6`, source provider `osm`, createdCount 33, reviewCount 33
- 서울 1차 seed batch: `eff5b9af-3fba-447b-8c93-1d48dedc923c`, source provider `osm`, createdCount 33, reviewCount 33
- public search evidence:
  - `seoul0606`: 33건
  - `hangang0606`: 9건
  - `worldcup0606`: 4건
  - `goyang0606`: 32건
- `walk_poi_admin_audit_detail_v1`: remote function 존재 확인
- admin e2e QA source: `v1.1_admin_ui_e2e_2026_06_06` 3건 확인
- admin QA audit action count:
  - `review_approve`: 1건
  - `review_reject`: 1건
  - `review_held`: 2건
- public projection safety: non-approved public active count 0건
- app code evidence:
  - `src/services/locationDiscovery/walkPoiAdmin.ts`에서 `walk_poi_admin_audit_detail_v1` 호출
  - `src/screens/LocationDiscovery/WalkPoiAdminReadOnlyScreen.tsx`에 approve/reject/held action area와 audit detail modal 존재

따라서 2026-06-15 정합성 검수 당시의 “서울 1차 coverage 완료”, “총 approved/public/active POI 86건”, “admin write UI e2e/action log drill-down 완료”, “다음 액션 서울 2차 coverage” 표기는 맞는 것으로 확인됐다. 이후 같은 날 서울 2차 coverage를 반영해 현재 수치는 아래 기준으로 갱신한다.

### 2026-06-15 서울 2차 확장 근거

- 서울 2차 seed batch: `f2e96855-43af-4da9-98da-f182ab030129`
- source provider: `operator-seed`
- 신규 approved seed: 44건
- 총 approved/public/active POI: 130건
- public search evidence:
  - `seoul0615`: 44건
  - `worldcup0615`: 4건
  - `banpo0615`: 6건
  - `seoulforest0615`: 7건
- public detail evidence: `하늘공원 억새 산책로` 1건 반환
- public projection safety: non-approved public active count 0건
- anon direct table SELECT: permission denied
- 비관리자 admin import RPC: `WALK_POI_ADMIN_REQUIRED`
- fallback gate 추가 적용:
  - `seoul_worldcup_nanji_mangwon`
  - `seoul_banpo_jamwon_ichon`
  - `seoul_ttukseom_seoulforest`
- Android 실기기 evidence:
  - `SM_S937N` / Galaxy 멀티윈도우 보존
  - `서울 월드컵공원·난지·망원 권역` route에서 `하늘공원` 리스트 카드와 상세 진입 확인
  - `9999` 검색 empty state와 `poi_empty`, `gateLimited: true`, `gateRegionId: seoul_worldcup_nanji_mangwon` logcat 확인
  - fatal / ANR / unhandled promise / ReactNativeJS fatal pattern 0건

### 2026-06-15 서울 보류 권역 보강 근거

- 서울 보류 권역 batch: `b4a09762-dfff-4191-b93e-e8debdf63eac`
- source provider: `operator-seed`
- 신규 approved seed: 67건
- 총 approved/public/active POI: 197건
- public search evidence:
  - `seoulheld0615`: 67건
  - `songpaheld0615`: 10건
  - `yangjaeheld0615`: 11건
  - `jungnangheld0615`: 9건
  - `anyangcheonheld0615`: 10건
  - `dreamforestheld0615`: 10건
  - `boramaeheld0615`: 12건
- public nearby/detail evidence: 송파/올림픽공원/석촌호수 5km nearby 27건, detail RPC 1건 반환
- public projection safety: non-approved public active count 0건
- anon direct table SELECT: permission denied
- 비관리자 admin import RPC: `WALK_POI_ADMIN_REQUIRED`
- fallback gate 추가 적용:
  - `seoul_songpa_olympic_lake`
  - `seoul_yangjae_tancheon`
  - `seoul_jungnangcheon`
  - `seoul_anyangcheon`
  - `seoul_boramae_dorimcheon`
- fallback gate 보류:
  - 서울 전체
  - 북서울꿈의숲: 3km 12건, 5km 19건으로 5km 기준 미달
  - 수도권 전체: 다음 별도 batch에서 착수
- Android 실기기 evidence:
  - `SM_S937N` / Galaxy 멀티윈도우 보존
  - `서울 송파·올림픽공원·석촌호수 권역` route에서 `몽촌호 산책로` 리스트 카드와 상세 진입 확인
  - `poi_empty`, `gateLimited: true`, `gateRegionId: seoul_songpa_olympic_lake` logcat 확인
  - POI RPC timeout 조건에서 기존 `location-discovery-seed` fallback 호출 유지 확인
  - fatal / ANR / unhandled promise / ReactNativeJS fatal pattern 0건

### 2026-06-15 seed 한글화 정규화 / 북서울꿈의숲 / 수도권 1차 근거

- seed/alias normalization SQL: `docs/sql/산책-위치기반-기능/v1.1-walk-poi-korean-normalization-bukseoul-metro-seed-coverage-2026-06-15.sql`
- rollback SQL: `docs/sql/산책-위치기반-기능/v1.1-walk-poi-korean-normalization-bukseoul-metro-seed-rollback-2026-06-15.sql`
- import batch: `b6764de4-6a8c-4fb6-a1dd-998e6195379b`
- 신규 approved seed: 48건
- 총 approved/public/active POI: 245건
- public 표시 필드 영어 노출: 0건
- alias normalization audit: `alias_localization` 173건
- public RPC smoke:
  - 북서울꿈의숲 nearby 5km: 27건
  - `북서울꿈의숲 산책` search: 18건
  - 성남·분당·판교·탄천 nearby 5km: 40건
  - `성남·분당·판교·탄천 권역` search: 40건
  - `수도권 1차 0615` search: 40건
  - detail sample `구미동 탄천 산책로`: 1건
- public projection safety:
  - pending/rejected/held public active leak: 0건
  - anon direct table SELECT: permission denied
  - 비관리자 admin import RPC: `WALK_POI_ADMIN_REQUIRED`
- Android smoke:
  - release APK update install 후 `서울 북서울꿈의숲 권역` 신규 seed 리스트, `석계역문화공원` 상세, `성남·분당·판교·탄천 권역` 리스트를 확인했다.
  - Galaxy 멀티윈도우를 보존했고 NURI 외 앱을 종료하지 않았다.
  - NURI PID 한정 logcat fatal / ANR / unhandled promise / ReactNativeJS fatal pattern은 0건이다.
- fallback gate 추가 적용:
  - 북서울꿈의숲: 3km 20건, 5km 27건
  - 성남·분당·판교·탄천: 3km 29건, 5km 40건
- fallback gate 보류:
  - 서울 전체
  - 수도권 전체
  - 전국 전체

### 2026-06-16 수도권 2차 coverage / gate 적용 권역 empty UX 검증 근거

- 추가 seed: 60건
- 대상 권역:
  - 하남·미사한강공원
  - 수원·광교호수공원
  - 과천·서울대공원
- import batch: `d03e7cef-fb93-4b45-9e61-ec0c926952da`
- source provider: `operator-seed`
- source/attribution: `누리 운영자 검수 자료 · 수도권 2차 산책 권역 · 2026-06-16`
- 총 approved/public/active POI: 305건
- import summary: requested 60, created 60, review 60, duplicate 0, conflict 0, skipped 0
- rollback SQL: `docs/sql/산책-위치기반-기능/v1.1-walk-poi-metro-2nd-seed-rollback-2026-06-16.sql`

coverage 측정:

| 권역 | 3km | 5km | search | 판정 |
| --- | ---: | ---: | ---: | --- |
| 하남·미사한강공원 | 17건 | 21건 | 20건 | gate 적용 |
| 수원·광교호수공원 | 20건 | 20건 | 20건 | gate 적용 |
| 과천·서울대공원 | 20건 | 23건 | 20건 | gate 적용 |

검증:

- focused Jest `__tests__/locationDiscoveryFanout.test.ts`: 11개 통과
- gate 내부 POI 0건: Kakao fallback 제한
- gate 밖 POI 0건: 기존 Kakao fallback 유지
- POI RPC error: 기존 Kakao fallback 유지
- Android 실기기 smoke:
  - 하남·미사한강공원 권역 deep link 리스트 표시 확인
  - `0616` 검색 결과 확인
  - `9999` 검색 empty state와 `poi_empty`, `gateLimited: true`, `gateRegionId: metro_hanam_misa_hangang` logcat 확인
  - `미사한강공원 중앙 산책로` 상세 진입 확인
  - 수원·광교호수공원 권역 리스트 표시 확인
  - 과천·서울대공원 권역 리스트 표시 확인
  - NURI PID 기준 fatal / ANR / unhandled promise / ReactNativeJS fatal pattern 0건
- 신규 seed public 표시 필드 영문 노출: 0건
- pending/rejected/held public active leak: 0건
- anon direct table SELECT: `42501 permission denied`
- 비관리자 admin RPC: `WALK_POI_ADMIN_REQUIRED`
- Kakao Local runtime: 삭제하지 않음

## 2026-06-17 V1.1 수도권 3차 / 전국 주요 도시 1차 업데이트

- 수도권 3차 seed: 80건 승인
- 수도권 3차 import batch: `ee62c190-595e-4e42-a50c-56301b8dcfb2`
- 수도권 3차 대상: 인천 송도 센트럴파크, 부천 상동호수공원, 안양·학의천·안양천, 남양주·다산·왕숙천
- 전국 주요 도시 1차 seed: 80건 승인
- 전국 주요 도시 1차 import batch: `88910305-736c-4e9c-bb09-3d0d735e4be9`
- 전국 주요 도시 1차 대상: 부산 해운대·동백섬, 대구 수성못, 대전 갑천·엑스포, 울산 태화강 국가정원
- 총 approved/public/active POI: 465건
- admin workflow: `walk_poi_admin_import_commit_v1` -> `walk_poi_admin_review_v1(approve)`
- public projection safety: pending/rejected/held leak 0건, raw/source/review/audit public RPC 미노출
- 권한 safety: anon direct table SELECT `42501 permission denied`, 비관리자 admin RPC `WALK_POI_ADMIN_REQUIRED`
- fallback gate 신규 적용: 인천 송도, 부천 상동, 안양·학의천·안양천, 남양주·다산·왕숙천, 부산 해운대·동백섬, 대구 수성못, 대전 갑천·엑스포, 울산 태화강 국가정원
- fallback gate 보류: 서울 전체, 수도권 전체, 전국 전체, 미처리 광역 권역
- Android smoke: `SM_S937N`에서 Galaxy 멀티윈도우를 보존한 채 송도 리스트/상세, 부산 리스트, `9999` empty UX와 `gateLimited: true` logcat을 확인했다.
- logcat: fatal / ANR / unhandled promise / ReactNativeJS fatal pattern 0건
- Kakao Local runtime: 삭제하지 않음

## 2026-06-19 V1.1 전국 seed 2차 / 수도권 잔여 / Kakao runtime readiness 업데이트

- 전국 seed 2차: 140건 승인
- 전국 seed 2차 import batch: `77bd70bd-58b7-45e7-a068-b13afac1628e`
- 전국 seed 2차 대상: 광주 광주천·영산강, 세종호수공원·금강, 청주 무심천·문암생태공원, 천안 천호지·불당천, 춘천 공지천·의암호, 강릉 경포호·남대천, 제주 이호테우·탑동해안
- 수도권 잔여 seed: 80건 승인
- 수도권 잔여 import batch: `4ed823a2-4a4c-48eb-8174-76a52ed4a203`
- 수도권 잔여 대상: 용인·기흥호수공원, 군포 초막골생태공원, 시흥 갯골생태공원, 김포 한강신도시 호수공원
- 총 approved/public/active POI: 685건
- admin workflow: `walk_poi_admin_import_commit_v1` -> `walk_poi_admin_review_v1(approve)`
- public projection safety: pending/rejected/held leak 0건, raw/source/review/audit public RPC 미노출
- 권한 safety: anon direct table SELECT `42501 permission denied`, 비관리자 admin RPC `WALK_POI_ADMIN_REQUIRED`
- 한글화 safety: 신규 220건 기준 한글 alias 누락 0건, public 영어 지역명 노출 0건
- fallback gate 신규 적용: 광주, 세종, 청주, 천안, 춘천, 강릉, 제주, 용인·기흥, 군포 초막골, 시흥 갯골, 김포 한강신도시
- fallback gate 보류: 서울 전체, 수도권 전체, 전국 전체, 도시 전체 broad gate, 미처리 광역 권역
- Kakao runtime readiness: gate 적용 권역은 Ready 후보로 분류하되 code delete 대상은 아니며, gate 밖/좌표 없음/RPC error/detail missing/feature flag off 조건에서는 fallback을 유지한다.
- Android smoke: `SM_S937N`에서 Galaxy 멀티윈도우를 보존한 채 광주 리스트/상세, 시흥 리스트/empty UX, `gateLimited: true` logcat을 확인했다.
- logcat: fatal / ANR / unhandled promise / ReactNativeJS fatal pattern 0건
- Kakao Local runtime: 삭제하지 않음

현재 진행률 요약:

| 구분 | 진행률 | 근거 |
| --- | ---: | --- |
| V1.0 기능 개발 | 100% | P0/P1 0건, 기능 Code Freeze 유지 |
| V1.0 QA/출시 준비 | 약 96% | release/Android smoke와 주요 서버 gate 완료, Play Store 제출 자산은 최종 제출 직전 준비 |
| V1.1 산책 POI 트랙 | 약 94% | PostGIS/RPC/admin workflow/admin UI/read path/fallback gate, POI 685건, Ready 권역 Kakao 호출 차단까지 진행. Kakao hard delete와 전국 3차 coverage가 남음 |
| V1.1 전체 | 약 45% | 산책 POI 트랙은 closeout 단계에 접근했지만 결제/AI/편지함/타이포/지도 스택 등 장기 후보가 남음 |
| 전체 제품 로드맵 | 약 85% | V1.0 closeout + V1.1 핵심 POI 운영 확장 + Ready 권역 Kakao 호출 차단 진행 기준 |
| 최종 제출 준비 | 약 20% | Play Store 스크린샷, 설명문, Console 입력은 아직 별도 단계 |

## 6. 현재 남은 작업

### V1.0

- 필수 남은 작업 없음
- P0: 0건
- P1: 0건
- V1.0 기능 재오픈 금지

### 최종 제출 직전 준비

Play Store 제출 자산은 V1.0 기능/QA blocker가 아니며, NURI 앱 개발과 QA가 완전히 끝난 뒤 최종 제출 직전 준비 단계에서 진행한다.

남은 제출 준비:

- Play Store 스크린샷 캡처
- Play Store 짧은 설명 작성
- Play Store 전체 설명 작성
- Play Console 입력
- 문의처 최종 입력
- 개인정보처리방침 URL 제출 화면 입력
- 이용약관 URL 제출 화면 입력
- store listing asset pack 생성
- 최종 제출용 점검

### V1.1

- Kakao Local hard delete 가능 여부 판단
- 전국 seed 3차 확대
- gate 적용 권역의 fallback 비율/empty UX 지속 검증
- admin write UI queue filtering / batch drill-down 고도화
- coverage 충족 권역 fallback gate 추가 적용
- 수도권 주요 산책 권역 확장
- 광역시/전국 seed coverage 확장
- Kakao Local 사용자 runtime 점진 제거
- admin import/review UI 고도화
- MapLibre / PMTiles / 자체 지도 스택 검토
- Naver OAuth cleanup
- Apple 로그인
- 결제/구독 foundation
- Premium AI reply
- Guestbook private letters 확장
- Typography foundation rollout
- Weather 운영 고도화
- P2 evidence archive

## 7. 주요 리스크

- POI coverage 부족: coverage가 부족한 지역에서 Kakao fallback을 줄이면 empty UX가 늘 수 있다.
- source/attribution 불명확: 공공데이터/OSM/운영자 seed 출처와 라이선스 기록이 필요하다.
- 좌표 오류: 잘못된 좌표는 사용자 신뢰를 바로 떨어뜨린다.
- public projection 누수: pending/rejected/held 또는 raw payload가 public으로 새면 trust boundary가 깨진다.
- admin 권한 관리: admin/super_admin gate와 audit log가 계속 유지돼야 한다.
- Kakao fallback 축소 UX 저하: coverage 미충족 지역에서는 fallback을 유지해야 한다.
- Supabase 비용 증가: POI 데이터와 RPC 호출량 증가 시 DB/compute 비용 관찰이 필요하다.
- Play Store 제출 전 자산 준비: 기능 blocker는 아니지만 제출 직전에는 누락되면 배포가 지연된다.
- 결제/AI 정책 리스크: 유료 기능과 AI reply는 정책, 동의, 비용 통제가 먼저다.
- 장기 운영 비용: 데이터 검수, admin workflow, 서버 비용을 지속적으로 관리해야 한다.

## 8. 다음 액션

1. Kakao Local hard delete 가능 여부 판단
2. 전국 seed 3차 확대
3. gate 적용 권역의 fallback 비율/empty UX 지속 검증
4. admin write UI queue filtering / batch drill-down 고도화
5. Play Store 제출 자산은 전체 개발/QA 종료 후 최종 제출 직전 준비

## 2026-06-20 V1.1 Kakao Local runtime closeout 1단계 업데이트

- 코드 변경: Ready 권역에서 POI RPC 정상 응답 + 결과 있음이면 `poi_ready`, `kakaoBlocked: true` 로그를 남기고 Kakao fallback을 호출하지 않는다.
- 기존 gate 내부 + POI RPC 정상 + 결과 0건은 `poi_empty`, `gateLimited: true`로 empty UX를 표시하고 Kakao fallback을 호출하지 않는다.
- Keep Fallback 유지: feature flag off, POI RPC disabled, gate 밖 좌표, POI RPC error, 좌표 없음, detail missing.
- Kakao Local fallback path hard delete: 하지 않음.
- focused test: `__tests__/locationDiscoveryFanout.test.ts` 16개 통과. Ready result 있음 Kakao 호출 0, Ready empty Kakao 호출 0, gate 밖 fallback 유지, RPC error fallback 유지, 좌표 없음 fallback 유지, feature flag off fallback 유지를 포함한다.
- public RPC smoke: approved/public/active 685건, non-approved public active leak 0건, public detail RPC internal key leak 0건.
- Android smoke: `SM_S937N`에서 Galaxy 멀티윈도우를 유지하고 광주/시흥/고양 Ready 리스트, Ready empty UX, gate 밖 Keep Fallback을 확인했다. logcat fatal / ANR / unhandled promise / ReactNativeJS fatal pattern은 0건이다.
- 상세 화면: Android 실기기에서 고양 `문화공원 오거리공원`, 수도권 `미사한강공원 중앙 산책로`, 전국 `치평동 공원 산책지점` 카드 tap 후 `산책 장소 상세` 진입을 확인했다.
- 전국 seed 3차: 이번 턴은 runtime closeout 우선으로 문서화만 진행. 신규 seed import 없음.

## 2026-06-20 V1.1 Kakao Local hard delete closeout 판정

Kakao Local hard delete는 이번 턴에서 보류한다.

근거:

- 산책 Ready 권역에서는 이미 Kakao 호출이 차단됐다. focused test 16개 통과, Android logcat `kakaoBlocked: true`로 확인했다.
- 그러나 Kakao Local provider와 `location-discovery-seed`는 산책 fallback 전용이 아니다. pet-friendly 장소 검색, 동물병원 provider matching, 행정동 조회에도 연결되어 있다.
- Keep Fallback 조건인 feature flag off, gate 밖 좌표, POI RPC error, 좌표 없음, detail missing은 아직 Kakao fallback 또는 safe fallback 설계가 필요하다.
- Kakao Login/OAuth와 Kakao Local은 분리 확인했으며 Kakao Login은 수정하지 않았다.

Android detail tap 증적:

- 고양 Ready 권역: `문화공원 오거리공원` 카드 tap -> `산책 장소 상세`
- 수도권 Ready 권역: `미사한강공원 중앙 산책로` 카드 tap -> `산책 장소 상세`
- 전국 Ready 권역: `치평동 공원 산책지점` 카드 tap -> `산책 장소 상세`
- empty UX: `검색 결과가 없어요`
- NURI PID 기준 fatal / ANR / unhandled promise / ReactNativeJS fatal pattern: 0건

현재 진행률:

| 구분 | 진행률 | 근거 |
| --- | ---: | --- |
| V1.0 기능 개발 | 100% | P0/P1 0건, 필수 기능 closeout |
| V1.0 QA/출시 준비 | 약 96% | release smoke 완료, Play Store 자산은 최종 제출 직전 준비 |
| V1.1 산책 POI 트랙 | 약 94% | POI 685건, Ready 권역 Kakao 호출 차단과 detail tap 증적 보강 완료. hard delete는 shared dependency 때문에 보류 |
| V1.1 전체 | 약 45% | 산책 POI 외 billing/AI/letters/typography/admin 고도화 잔여 |
| 전체 제품 로드맵 | 약 85% | V1.0 완료 + V1.1 주요 비용 방어/POI 전환 진척 기준 |

다음 액션:

1. Kakao Local hard delete 최종 잔여 정리: pet-friendly, 동물병원, 행정동 조회와 산책 fallback의 provider 분리 설계
2. 전국 seed 3차/4차 확대: 전주, 창원, 포항, 김해, 여수 우선

## 2026-06-21 V1.1 전국 seed 3차/4차 확대 결과

전국 seed 3차와 4차는 직접 canonical table insert 없이 `walk_poi_admin_import_commit_v1` -> `walk_poi_admin_review_v1(approve)` workflow로 처리했다. 신규 seed는 모두 한글 표시값과 한글 alias를 포함하고, public projection은 approved/public/active row만 반환한다.

전국 seed 3차:

- import batch: `badb210c-3cb3-4643-a812-032222d415b4`
- 추가 seed: 180건
- 대상 도시: 전주, 창원, 포항, 김해, 여수, 순천, 목포, 구미, 진주
- 도시별 approved/public/active: 각 20건
- duplicate/conflict/skipped: duplicate 0건, conflict 2건, skipped 0건
- rollback SQL: `docs/sql/산책-위치기반-기능/v1.1-walk-poi-national-3rd-seed-rollback-2026-06-21.sql`

전국 seed 4차:

- import batch: `b8fc90fa-7680-48ba-9cdf-d7638b4a2c7e`
- 추가 seed: 120건
- 대상 도시/권역: 부산 온천천·수영강, 대구 신천·금호강, 대전 유림공원·한밭수목원, 울산 선암호수공원·울산대공원, 경주 보문호·황성공원, 군산 은파호수공원·금강
- 권역별 approved/public/active: 각 20건
- duplicate/conflict/skipped: duplicate 0건, conflict 1건, skipped 0건
- rollback SQL: `docs/sql/산책-위치기반-기능/v1.1-walk-poi-national-4th-seed-rollback-2026-06-21.sql`

검증:

- 총 approved/public/active POI: 985건
- public nearby/search/detail RPC: 신규 15개 권역 모두 3km 20건 이상, 5km 20건 이상, 대표 검색어 20건 이상 반환
- public projection safety: non-approved public active leak 0건
- 비관리자 admin RPC: `WALK_POI_ADMIN_REQUIRED`
- anon direct `walk_pois` SELECT: `42501 permission denied`
- focused fallback gate tests: `__tests__/locationDiscoveryFanout.test.ts` 17/17 통과
- Android 실기기: `SM_S937N`에서 전주 3차 seed 리스트/상세, 부산 4차 seed 리스트/상세, `zzzwalkpoi` empty UX, `gateLimited: true`, `kakaoBlocked: true` logcat 확인
- logcat fatal / ANR / unhandled JS exception pattern: 0건

fallback gate:

- 신규 적용: 전주 전주천·한옥마을, 창원 용지호수·창원천, 포항 영일대·형산강, 김해 연지공원·해반천, 여수 웅천해변·이순신공원, 순천 동천·순천만국가정원, 목포 평화광장·갓바위, 구미 동락공원·낙동강, 진주 남강·진주성, 부산 온천천·수영강, 대구 신천·금호강, 대전 유림공원·한밭수목원, 울산 선암호수공원·울산대공원, 경주 보문호·황성공원, 군산 은파호수공원·금강
- 보류: 서울 전체, 수도권 전체, 전국 전체, 도시 전체 broad gate, 미처리 광역 권역
- Kakao Local hard delete: 하지 않음. Ready 권역 Kakao 호출 차단과 Keep Fallback 조건은 유지한다.

현재 진행률:

| 구분 | 진행률 | 근거 |
| --- | ---: | --- |
| V1.0 기능 개발 | 100% | P0/P1 0건, 필수 기능 closeout |
| V1.0 QA/출시 준비 | 약 96% | release smoke 완료, Play Store 자산은 최종 제출 직전 준비 |
| V1.1 산책 POI 트랙 | 약 96% | POI 985건, 전국 4차 coverage, fallback gate 추가, public projection safety, Android detail tap/empty UX smoke 완료 |
| V1.1 전체 | 약 47% | 산책 POI 외 billing/AI/letters/typography/admin 고도화 잔여 |
| 전체 제품 로드맵 | 약 87% | V1.0 완료 + V1.1 주요 비용 방어/POI 전국 확장 진척 기준 |

다음 액션:

1. 전국 seed 5차 확대: 마산/진해, 통영, 거제, 안동, 익산, 나주, 사천, 양산 등 source/attribution이 명확한 후보부터 처리한다.
2. Kakao Local hard delete 최종 잔여 정리: shared provider 분리 설계와 Keep Fallback의 safe UX 대체 조건을 먼저 고정한다.

## 2026-06-21 V1.1 전국 seed 5차 / 품질 점검 / Kakao shared provider 판정

전국 seed 5차는 직접 canonical table insert 없이 `walk_poi_admin_import_commit_v1` -> `walk_poi_admin_review_v1(approve)` workflow로 처리했다. 신규 seed는 모두 한글 표시값과 한글 alias를 포함하고, public projection은 approved/public/active row만 반환한다.

- import batch: `3f345ae7-e8a6-404b-a5b5-d7f555fb75b0`
- 추가 seed: 160건
- 총 approved/public/active POI: 1,145건
- 대상 권역: 마산·진해 해안, 통영 강구안·미륵도, 거제 고현천·장승포, 안동 낙동강·월영교, 익산 배산공원·서동공원, 나주 영산강·금성산, 사천 삼천포·노산공원, 양산 양산천·황산공원
- 권역별 approved/public/active: 각 20건
- duplicate/conflict/skipped: duplicate 0건, conflict 1건, skipped 0건
- rollback SQL: `docs/sql/산책-위치기반-기능/v1.1-walk-poi-national-5th-seed-rollback-2026-06-21.sql`

품질 점검:

- 한글 alias: 신규 alias 960개, 한글 alias 누락 0건
- 영어 지역명 public 노출: 0건
- source/attribution 누락: 0건
- categoryLabel 누락: 0건
- address 누락: 0건
- 좌표 과밀 cluster: 0건
- duplicate name cluster: 0건
- public projection safety: non-approved public active leak 0건
- 비관리자 admin RPC: `WALK_POI_ADMIN_REQUIRED`
- anon direct `walk_pois` SELECT: `42501 permission denied`

fallback gate:

- 신규 적용: 마산·진해 해안, 통영 강구안·미륵도, 거제 고현천·장승포, 안동 낙동강·월영교, 익산 배산공원·서동공원, 나주 영산강·금성산, 사천 삼천포·노산공원, 양산 양산천·황산공원
- 보류: 서울 전체, 수도권 전체, 전국 전체, 도시 전체 broad gate, 미처리 광역 권역
- focused fallback gate tests: `__tests__/locationDiscoveryFanout.test.ts` 18/18 통과
- Kakao Local hard delete: 하지 않음. Ready 권역 Kakao 호출 차단과 Keep Fallback 조건은 유지한다.

Kakao Local shared provider:

- 사용처: 산책/location discovery Keep Fallback, 반려동물 동반 장소 검색, 동물병원 provider matching, coord2region Edge Function
- 판정: `provider 분리 가능`
- 이번 턴 범위: 설계 판정과 문서화. 실제 provider 대수술과 hard delete는 하지 않음
- 다음 closeout: 산책 fallback adapter를 분리하고 다른 도메인의 Kakao Local provider 의존은 유지한다.

현재 진행률:

| 구분 | 진행률 | 근거 |
| --- | ---: | --- |
| V1.0 기능 개발 | 100% | P0/P1 0건, 필수 기능 closeout |
| V1.0 QA/출시 준비 | 약 96% | release smoke 완료, Play Store 자산은 최종 제출 직전 준비 |
| V1.1 산책 POI 트랙 | 약 97% | POI 1,145건, 전국 5차 coverage, 대량 seed 품질 점검, fallback gate 추가, public projection safety 유지 |
| V1.1 전체 | 약 48% | 산책 POI 외 billing/AI/letters/typography/admin 고도화 잔여 |
| 전체 제품 로드맵 | 약 88% | V1.0 완료 + V1.1 주요 비용 방어/POI 전국 확장 진척 기준 |

다음 액션:

1. Kakao Local shared provider 분리 closeout
2. 광역시/전국 seed 운영 품질 점검

## 2026-06-22 V1.1 Kakao Local provider split closeout / 전국 POI 품질 재점검

이번 단계에서는 신규 seed import 없이 산책/location discovery의 Kakao Local shared provider 직접 의존을 분리하고, 1,145건 approved/public/active POI 품질을 재점검했다.

구현 결과:

- 산책/location discovery 직접 의존 제거: `service.ts`에서 shared `kakaoLocalSearchProvider` 직접 import 제거
- 산책 fallback adapter: `walkKakaoFallbackProvider`
- 펫동반 검색 adapter: `petFriendlyKakaoSearchProvider`
- 동물병원 provider matching: 기존 경로 유지, focused test 통과
- coord2region Edge Function: 기존 `location-discovery-seed` 경로 유지
- Kakao Login / Google Login / social provider 설정: 변경 없음
- Kakao Local hard delete: 보류. 다른 도메인 유지 경로가 남아 있으므로 provider 파일 삭제는 하지 않는다.

품질/보안 검증:

- 총 approved/public/active POI: 1,145건
- 한글 alias 누락: 0건
- 영어 지역명 public 노출: 0건
- source/attribution 누락: 0건
- coordinate out-of-Korea bounds: 0건
- duplicate name cluster: 5개. 서로 다른 도시/주소의 일반 명칭 중복으로 즉시 hidden 후보는 아니다.
- coordinate over-density cluster: 1개. 같은 공원 내 paired POI로 즉시 hidden 후보는 아니다.
- pending/rejected/held public active leak: 0건
- public detail internal key leak: 0건
- anon direct `walk_pois` SELECT: `42501 permission denied`
- 비관리자 admin RPC: `WALK_POI_ADMIN_REQUIRED`

Android 실기기:

- 기기: `SM_S937N`
- release APK 재설치 후 통영 강구안 deep link로 전국 5차 seed 리스트 확인
- `미수해안로 산책로` 카드 tap 상세 진입 확인
- 상세 설명은 앱 public mapper에서 `통영 강구안·미륵도 권역의 운영자 검수 산책 자료입니다.`로 표시된다.
- `zzzwalkpoi` empty UX: `검색 결과가 없어요` 표시
- logcat fatal / ANR / unhandled promise / ReactNativeJS fatal pattern: 0건

현재 진행률:

| 구분 | 진행률 | 근거 |
| --- | ---: | --- |
| V1.0 기능 개발 | 100% | P0/P1 0건, 필수 기능 closeout |
| V1.0 QA/출시 준비 | 약 96% | release smoke 완료, Play Store 자산은 최종 제출 직전 준비 |
| V1.1 산책 POI 트랙 | 약 98% | POI 1,145건, provider split closeout, 품질 재점검, gate 과적용 점검, Android detail/empty UX smoke 완료 |
| V1.1 전체 | 약 49% | 산책 POI 외 billing/AI/letters/typography/admin 고도화 잔여 |
| 전체 제품 로드맵 | 약 89% | V1.0 완료 + V1.1 주요 비용 방어/POI 전국 운영 품질 closeout 진척 기준 |

다음 액션:

1. Kakao Local hard delete 최종 closeout
2. archive/reference: admin UI queue filtering/batch drill-down 고도화는 구현 완료, 운영자 QA는 홈페이지/관리 페이지 트랙으로 Parking

## 2026-06-22 V1.1 Walk-domain Kakao fallback closeout / admin UI 고도화

이번 단계에서는 신규 seed import 없이 산책/location discovery runtime에서 Kakao Local fallback 호출 경로를 제거하고, POI admin read UI에 queue filtering과 batch drill-down을 추가했다.

구현 결과:

- 판정: `walk-domain hard delete 완료`
- 산책/location discovery: `walkKakaoFallbackProvider` export와 호출 제거
- safe fallback UX: POI RPC disabled/error, gate 밖, 좌표 없음, feature flag off, result 0 모두 `walk_poi` empty 응답으로 처리
- Ready 권역 Kakao 호출 0: focused test에서 유지
- pet-friendly adapter: `petFriendlyKakaoSearchProvider` 유지
- 동물병원 provider matching: 기존 Kakao provider 경로 유지, focused test 통과
- coord2region Edge Function: 변경 없음
- Kakao Login / Google Login / social provider 설정: 변경 없음

admin UI:

- review queue status filter 추가: 전체/대기/승인/반려/보류
- import batch selector 추가
- batch drill-down summary 추가: requested/created/duplicate/conflict/review
- batch id/source provider/import mode/status 표시 강화
- audit detail modal과 approve/reject/held workflow 유지
- 일반 사용자 admin UI 미노출 유지

검증:

- 총 approved/public/active POI: 1,145건
- public RPC smoke: nearby 20건, `호수공원` search 6건, detail 1건
- pending/rejected/held public active leak: 0건
- 비관리자 admin RPC: `WALK_POI_ADMIN_REQUIRED`
- focused walk-domain closeout tests: 17/17 통과
- admin queue helper tests: 2/2 통과
- pet-friendly adapter test: 통과
- animal hospital provider matching impact test: 통과
- typecheck: 통과
- lint: 에러 0건, 기존 warning 6건
- Android release build/install: `SM_S937N`에 `app-release.apk` update install 성공
- Android smoke: 일산 Ready 권역 리스트/`문화공원 오거리공원` 상세, 부산 Ready 권역 리스트/`해운대해수욕장 산책로` 상세를 카드 tap으로 확인
- Android empty/safe fallback: `hanam`/`songdo` ASCII 검색은 `검색 결과가 없어요`, gate 밖 `0.0,0.0` 좌표는 `현재 위치 주변 산책 장소를 아직 찾지 못했어요`로 표시
- logcat: `kakaoBlocked: true`, gate 밖 `poi_empty` safe-fallback 확인, `location-discovery-seed`/Kakao Local 호출 흔적 0건, fatal / ANR / unhandled promise pattern 0건

현재 진행률:

| 구분 | 진행률 | 근거 |
| --- | ---: | --- |
| V1.0 기능 개발 | 100% | P0/P1 0건, 필수 기능 closeout |
| V1.0 QA/출시 준비 | 약 96% | release smoke 완료, Play Store 자산은 최종 제출 직전 준비 |
| V1.1 산책 POI 트랙 | 약 99% | 1,145건 POI, walk-domain Kakao fallback 제거, admin queue/batch 운영 UX 고도화, public projection safety 유지 |
| V1.1 전체 | 약 50% | 산책 POI closeout 임박, billing/AI/letters/typography 잔여 |
| 전체 제품 로드맵 | 약 90% | V1.0 완료 + V1.1 비용 방어/POI 운영 closeout 진척 기준 |

다음 액션:

- Parking/reference: admin UI 운영자 QA closeout은 앱 출시 blocker가 아니며 별도 홈페이지/관리 페이지 트랙에서 재개
- archive/reference: 광역시/전국 seed 운영 품질 최종 점검은 2026-06-22 final audit에서 read-only로 수행

## 2026-06-22 최종 closeout audit / 문서 정리 기준

이번 기준에서는 admin UI 운영자 QA closeout을 앱 출시 blocker에서 제외하고 Parking한다. 앱 안의 운영자 도메인은 Play Store 사용자-facing 출시 흐름에서 사용하지 않으며, 운영자 관리는 앱 작업 완료 후 별도 홈페이지/관리 페이지 트랙에서 다룬다.

산책 POI 트랙 판정:

- 판정: `산책 POI 트랙 closeout 가능`
- approved/public/active POI: 1,145건
- public nearby/search/detail RPC: 정상
- pending/rejected/held public leak: 0건
- public RPC internal key leak: 0건
- anon direct table SELECT: `42501 permission denied`
- 한글 alias 누락: 0건
- source/attribution 누락: 0건
- duplicate name cluster: 5개. 서로 다른 도시/주소의 일반 명칭 중복으로 즉시 hidden 후보 아님
- 영어 표시 후보: `APEC`, `MBC` 정식 약어 3건으로 영어 region key 노출 아님
- broad gate 오적용: 서울 전체/수도권 전체/전국 전체/도시 전체 gate 없음
- walk-domain Kakao Local fallback: 제거 완료
- Kakao Local global provider hard delete: 보류
- Kakao Login / Google Login 영향: 없음
- Android `SM_S937N`: 일산 Ready 리스트/상세, 부산 전국 권역 리스트/상세, gate 밖 safe empty UX 통과
- logcat fatal / ANR / unhandled promise / ReactNativeJS fatal pattern: 0건

진행률:

| 구분 | 진행률 | 근거 |
| --- | ---: | --- |
| V1.0 기능 개발 | 100% | P0/P1 0건, 기능 Code Freeze 유지 |
| V1.0 QA/출시 준비 | 약 96% | release smoke와 주요 서버 gate 완료, Play Store 자산은 최종 제출 직전 준비 |
| V1.1 산책 POI 트랙 | 약 99% | 1,145건 POI, walk-domain Kakao fallback 제거, public projection safety, Android smoke 통과 |
| V1.1 전체 | 약 50% | 산책 POI 트랙은 closeout 가능이나 billing/AI/letters/typography 등 V1.1 잔여 존재 |
| 전체 제품 로드맵 | 약 90% | V1.0 closeout 유지와 V1.1 핵심 비용/POI 리스크 축소 기준 |

다음 액션:

1. archive/reference: release candidate smoke와 비용 점검은 2026-06-30 기준 닫힘
2. 최신 다음 액션은 아래 `2026-06-30 RC closeout / Animal Hospital coordinate audit / V1.1 추가 업데이트 planning` 섹션을 따른다.

## 2026-06-30 RC closeout / Animal Hospital coordinate audit / V1.1 추가 업데이트 planning

이번 기준에서는 신규 기능 구현이나 seed/DB 변경 없이, release candidate 상태와 Animal Hospital coordinate missing 품질을 read-only로 확인하고 V1.1 추가 업데이트 8개를 공식 planning 문서로 정리했다.

RC 상태:

- 신규 QA 계정 full E2E: 통과
- onboarding stale blocker: `authStore.ts`, `boot.ts` 최소 수정 후 focused test 13/13과 release APK 재검증 통과
- navigation/back audit: 주요 사용자-facing 화면 17개 통과
- 산책 POI: approved/public/active 1,145건 유지, closeout 가능 상태 유지
- logcat: fatal / ANR / unhandled promise / ReactNativeJS fatal pattern 0건
- 디자인 조정: 스토어 출시 전 별도 예정, 이번 기준 디자인 수정 없음
- Play Store 자산: V1.0/V1.1 전체 완료와 디자인 조정 완료 후 최종 제출 직전 진행
- admin 운영자 QA: 앱 내부가 아니라 별도 홈페이지/관리 페이지 트랙으로 이동
- Supabase/Codex 운영비: PO 확정 완료

Animal Hospital coordinate audit:

- public active count: 5,427건
- coordinate missing public active: 122건
- primary address 보유: 122건
- road address 보유: 110건
- lot address 보유: 121건
- official phone 보유: 82건
- providerPlaceUrl 보유: 0건
- 대표 권역 coverage: 서울, 경기, 인천, 부산, 대구, 대전, 광주, 울산, 세종, 제주, 강원, 충청, 전라, 경상 10km/20건 반환
- 판정: `우리동네 병원 찾기 전국 확장 완료, coordinate missing 122건은 release blocker 아님`
- 후속: coordinate missing 122건은 V1.1 데이터 품질 보강 후보로 관리한다. 이번 기준 DB write/seed 수정은 하지 않는다.

V1.1 추가 업데이트 planning:

- 공식 문서: `docs/planning/v1.1-additional-update-plan-and-checklist.md`
- 대상 기능 8개: 타임라인 카테고리 count, 최근 로그인 방식, 무지개다리 서비스 제안, 연속 출석/데일리판, 홈 위젯, 회원탈퇴 입력 확인, 알림 수신 검증, XP/레벨/칭호
- 1차 MVP: 회원탈퇴 입력 확인, 최근 로그인 표시, 타임라인 카테고리 count. 2026-06-30 edge QA 기준 타임라인 write/edit/delete count 갱신은 완료했고, 회원탈퇴 실제 예약과 social 최종 pill은 조건부 evidence로 관리한다.
- 2차 MVP: 연속 출석/데일리판, 로그인 후 알림 read path, XP/칭호 최소 MVP 구현과 edge QA 완료. 홈 상단 알림 아이콘은 floating notification shade overlay로 closeout
- V1.1.1 후보: 무지개다리 추억 서비스 제안, Android 홈 위젯 1차, XP/레벨/칭호 전체 시스템, 운영자 알림 발송 관리 페이지, push notification

진행률:

| 구분 | 진행률 | 근거 |
| --- | ---: | --- |
| V1.0 기능 개발 | 100% | P0/P1 0건, 기능 Code Freeze 유지 |
| V1.0 QA/출시 준비 | 약 99% | 신규 QA 계정 E2E/navigation audit, blocker 재검증, V1.1 final sign-off 중 V1.0 회귀 smoke 완료 |
| V1.1 산책 POI 트랙 | 약 99% | 1,145건 POI, public projection safety, Android smoke 통과 |
| V1.1 추가 업데이트 기획 | 100% | 8개 기능 공식 작업서/체크리스트/진행률표 작성 완료 |
| V1.1 추가 업데이트 1차 MVP | 약 98% | 구현/focused test/Android edge QA 완료. 실제 탈퇴 예약과 social 최종 pill은 조건부 evidence |
| V1.1 추가 업데이트 2차 MVP | 100% | 데일리 streak/데일리판, 알림 read path, XP/레벨/칭호 최소 MVP 구현 후 edge QA/RLS 재검증/adminQA Android smoke와 홈 알림 overlay UX closeout 완료 |
| V1.1 추가 기능 구현 | 약 85% | 1차 MVP 3개 edge QA와 2차 MVP 서버/앱 구현 및 edge QA, 홈 알림 overlay/dismiss/expand UX closeout, V1.1.1 scope audit과 홈 위젯 release 노출 차단, `활동·칭호` 대시보드 1차 구현, 실제 멀티펫/다중 XP write smoke, 알림 보존 정책 분리 완료 |
| V1.1 전체 | 약 74% | RC 상태 갱신, 병원 품질 판정, 1차 MVP 조건부 closeout 유지, 2차 MVP edge closeout과 홈 알림 overlay/dismiss/expand UX closeout, V1.1.1 후보 scope audit과 1차 대시보드 조건부 closeout 해소 smoke 반영 |
| V1.1.1 1차 기능 | 약 96% | 우선순위/정책 문서화, `활동·칭호` route/entry/card UI 구현, 실제 adminQA 멀티펫 분리, 다중 타임라인 XP write smoke, daily cap/idempotency 확인, 카테고리별/글/댓글 test, 알림 home dismiss와 inbox delete 분리 완료 |
| 전체 제품 로드맵 | 약 98% | 운영비 PO 확정, V1.1 1차/2차 MVP edge QA, V1.1 final sign-off, V1.1.1 1차 대시보드 조건부 closeout 해소 smoke 반영 기준 |

다음 액션:

1. V1.1.1 후보: 홈페이지/관리 페이지 트랙의 운영자 알림 발송 관리 체계 정책 확정
2. 디자인 조정 예정: 스토어 출시 전 앱 내부 디자인 polish 후보 확정

## 2026-07-09 V1.1.1 프리미엄 보상 모달 closeout / master roadmap 문서화

이번 단계에서는 이미 구현된 프리미엄 보상 모달을 실기기 visual evidence로 닫고, 전체 프로젝트 진행률과 남은 작업을 master status 문서로 통합했다.

구현/정책 결과:

- `PremiumRewardModal` 추가: XP 획득량, 누적 XP, 현재 레벨, 레벨업 여부, 산책 streak 표시
- `rewardNoticePreference` 추가: KST 기준 user-scoped `오늘 하루 안 보기`
- `RecordCreateScreen`: XP/streak 보상 발생 시 보상 모달 표시 후 기존 성공 이동 유지
- `RecordEditScreen`: XP 지급 시 보상 모달, 일반 완료 시 `PremiumNoticeModal`
- `WeatherActivityRecordScreen`: 일반 완료 모달을 `PremiumNoticeModal`로 교체
- DB/RPC/RLS/seed/migration 변경 없음
- push/운영자 UI/홈 위젯/무지개다리/랭킹 구현 없음

Android 실기기 QA:

- 기기: `SM_S937N / R5CY613NMSY`
- `adminQA` 세션 유지
- 산책 타임라인 작성 후 `+30 XP`, `누적 XP 150`, `현재 레벨 Lv.2`, `1일 연속 산책` 표시 확인
- `오늘 하루 안 보기` tap 후 닫힘 확인
- 앱 cold start 후 같은 날 자동 재노출 없음 확인
- 같은 날 후속 기록 작성 후에도 보상 모달 suppress 확인
- evidence:
  - `/tmp/nuri-qa/v111-premium-reward-modal-walk-xp.png`
  - `/tmp/nuri-qa/v111-premium-reward-modal-hide-today.png`
  - `/tmp/nuri-qa/v111-premium-reward-modal-cold-start-persistence.png`
  - `/tmp/nuri-qa/v111-premium-reward-modal-suppressed-after-hide.png`

통합 문서:

- `docs/reports/nuri-project-master-status-and-roadmap-2026-07.md` 생성
- `docs/reports/nuri-father-development-progress-budget-2026-07-04.md`는 아버지 보고용 예산 문서로 보존하고 master status 문서에서 참조한다.

진행률:

| 구분 | 진행률 | 근거 |
| --- | ---: | --- |
| V1.0 기능 개발 | 100% | 기능 Code Freeze 유지 |
| V1.0 QA/출시 준비 | 약 99% | Android QA와 주요 회귀 기준 완료. Play Store 자산은 최종 제출 직전 |
| V1.1 산책 POI 트랙 | 약 99% | 1,145건 POI, public projection safety, Android smoke |
| V1.1 추가 업데이트 1차 MVP | 약 98% | 구현/QA 완료, 일부 destructive/social evidence 조건부 |
| V1.1 추가 업데이트 2차 MVP | 100% | streak/notification/XP MVP와 알림 UX final sign-off |
| V1.1 전체 | 약 74% | V1.1 기능 closeout 가능, 디자인/스토어/후속 운영 기능 별도 |
| V1.1.1 1차 기능 | 약 98% | 활동·칭호 대시보드, 알림 보존 정책, 프리미엄 보상 모달 visual QA 완료 |
| 전체 제품 로드맵 | 약 98.2% | 사용자-facing core 대부분 닫힘, 운영자 발송/push/디자인/스토어 준비 잔여 |

다음 액션:

1. 홈페이지/관리 페이지 이동: 운영자 알림 발송 관리 체계 정책/관리 페이지 트랙 착수
2. 디자인 조정 예정: 스토어 출시 전 앱 내부 디자인 polish 후보 확정
