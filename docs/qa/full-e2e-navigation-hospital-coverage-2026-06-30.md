# NURI Full App E2E / Navigation / Hospital Coverage Audit - 2026-06-30

## Scope

- 기준 APK: `android/app/build/outputs/apk/release/app-release.apk`
- 설치 앱: `com.nuri.app`, `versionName=1.0`, `versionCode=1`
- Android 기기: `SM_S937N` / `R5CY613NMSY`
- 테스트 계정: `qa0623145019@example.com`
- 비밀번호: 문서에 기록하지 않음
- DB/seed/migration 변경: 없음
- 디자인 수정: 없음
- Play Store 자산 작업: 없음
- admin UI 운영자 QA: 없음

## New Account Onboarding

- Splash: 앱 첫 실행 후 인증 화면 진입 확인
- Login/Signup: 이메일/비밀번호 가입 경로 확인
- Social buttons: `카카오로 시작하기`, `Google로 시작하기` 노출 확인
- Nickname: `qa5019` 저장, 중복 확인 성공 문구 확인
- Pet create: `QAPet` 등록, species는 앱 허용값 사용
- Date direct input: `YYYY-MM-DD` 직접 입력 모달과 validation 동작 확인. ADB focus 제약 때문에 최종 저장값 증적으로는 사용하지 않음
- Home: `qa5019님, 반가워요!`, `QAPet`, weather 표시 확인
- Logout/session restore: 로그아웃 후 email/password 재로그인과 cold start 홈 복귀 확인

## Release Blocker Fixed

신규 계정으로 로그아웃 후 email/password 재로그인하는 과정에서 profile/pet이 이미 존재하는데도 `NicknameSetup`으로 잘못 이동하는 blocker를 확인했다.

원인:

- manual sign-in 직후 Splash가 provider auth listener의 profile/pet reload 완료 전에 평가될 수 있었다.
- 같은 사용자 `SIGNED_IN`/`INITIAL_SESSION` 이벤트에서 user-scoped reload가 생략될 수 있어 stale `profile=null` 상태가 onboarding 분기를 이겼다.

수정:

- `src/store/authStore.ts`: 로그인 세션 반영 시 `profileSyncStatus='loading'`, `profileErrorMessage=null`, `booted=false`로 boot gate를 다시 닫는다.
- `src/services/app/boot.ts`: 같은 사용자 `SIGNED_IN`/`INITIAL_SESSION`도 user-scoped state reload 대상에 포함한다.
- `__tests__/authStoreRecovery.test.ts`, `__tests__/appBoot.test.ts`: 회귀 테스트 추가.

재검증:

- focused auth/app boot tests 통과
- release APK rebuild/install 통과
- cold start 후 home 복귀 확인
- logout -> email/password login -> home 복귀 확인
- logcat fatal / ANR / unhandled promise / ReactNativeJS fatal pattern 0건

## User-Facing E2E Smoke

- Home: 통과
- Profile/Pet: profile list, pet edit, pet create entry 확인
- Health Report: empty state와 `건강 기록하기` action sheet 확인. 운영 DB에 health record는 남기지 않음
- Timeline: read path 진입, Android back 복귀 확인
- Animal Hospital: 리스트, 상세, 전화 CTA, 길찾기 resolver, 앱 복귀 확인
- Walk/POI: 리스트, 상세, search RPC, empty RPC, Ready 권역 Kakao 차단 회귀 확인
- Community: 목록, 상세, policy 외부 문서 진입, 앱 복귀 확인
- Weather: 홈 weather 표시 확인
- Settings/More: 전체메뉴와 알림 설정 진입/복귀 확인
- Logout/session restore: 통과

## Navigation / Back Audit

- 검증 화면 수: 17개 사용자-facing 화면/상태
- 상단 뒤로가기: 가능한 화면에서 정상 복귀
- Android system back: root 종료 확인 모달, detail/list/form/action sheet 복귀 정상
- Pet create/edit guard: `등록을 멈추고 나갈까요?` 확인 후 `나가기`로 정상 복귀
- Animal Hospital CTA: dialer와 map resolver에서 Android back으로 앱 복귀
- Community policy: 외부 Chrome/Notion 문서에서 Android back으로 앱 복귀
- blocker: 없음

## Animal Hospital National Coverage Audit

판정: `우리동네 병원 찾기 전국 기반 완료, 일부 권역 품질 점검 필요`

- public active count: 5,427건
- 과거 ingest/canonical 기준: 약 10,507건. 이번 턴에서는 로컬 `psql` 부재로 SQL catalog 직접 재확인은 하지 못했고, public projection과 기존 evidence를 우선한다.
- public active 시도/광역 분포:
  - 경기 1,398
  - 서울 969
  - 경북 365
  - 경남 364
  - 충남 297
  - 부산 280
  - 인천 253
  - 전남 240
  - 전북 220
  - 대구 213
  - 충북 180
  - 강원 167
  - 광주 129
  - 대전 121
  - 제주 116
  - 울산 80
  - 세종 35
- public active address missing: 0건
- public active coordinate missing: 122건
- 대표 좌표 search smoke: 일산, 서울, 부산, 대구, 대전, 광주, 울산, 세종, 제주 모두 10km/20건 반환
- source/raw table anon read: RLS로 row 0건
- Google Places/Photos runtime 재발: 없음
- seed/DB write: 없음

후속:

- 병원은 산책 POI처럼 수동 seed 확장 구조가 아니다.
- 전국 기반은 완료로 보되, coordinate missing 122건은 V1.1 품질 점검 후보로 둔다.

## Walk / POI Regression

- approved/public/active POI: 1,145건 유지
- nearby RPC: 일산 대표 좌표 20건
- search RPC: `호수공원` 6건, `zzzznuri` 0건
- detail RPC: nearby id 기반 1건
- public projection safety: pending/rejected/held leak 0건, internal raw/review/audit leak 0건
- direct anon table select: `42501 permission denied`
- Ready 권역 Kakao 차단: 유지
- gate 밖 safe UX: 유지

## Design Handling

- 디자인 수정: 하지 않음
- 발견된 release blocker급 디자인 이슈: 없음
- 스토어 출시 전 디자인 조정 후보: PO 지시에 따라 스플래시, 홈, 카드, 버튼, 문구 톤, typography final polish를 별도 트랙으로 유지
- Play Store 자산: V1.0/V1.1 전체 완료와 디자인 조정 완료 이후 진행

## Verification

- `corepack yarn tsc --noEmit --pretty false`: 통과
- `corepack yarn lint`: 에러 0건, 기존 warning 6건 유지
- focused auth/app boot tests: 13/13 통과
- `./gradlew assembleRelease`: 통과
- `adb install -r`: 통과
- `adb logcat -d`: fatal / ANR / unhandled promise / ReactNativeJS fatal pattern 0건
