# NURI Task 관리 현황

업데이트: 2026-04-21

## 1. 배경

- NURI는 지금까지 도메인 설명 문서 중심으로 정리되어 있었고, 실제 구현/검증/운영 상태는 project-memory와 release 문서, 코드, remote 상태에 흩어져 있었다.
- 이 문서는 도메인 소개 문서가 아니라, 앞으로 구현 우선순위와 QA, 릴리즈 판단, v1.1 확장 판단의 기준점이 되는 `Task Master Checklist`를 만드는 것이 목적이다.
- 이번 정리는 아래 source of truth를 우선했다.
- `AGENTS.md`
- `docs/engineering/advanced-codex-workflow.md`
- `docs/engineering/advanced-codex-checklist.md`
- `docs/engineering/advanced-codex-memory.md`
- `docs/project-memory/현재-프로젝트-상태.md`
- `docs/project-memory/핵심-결정사항.md`
- `docs/project-memory/다음-작업-우선순위.md`
- `docs/project-memory/최근-작업-로그.md`
- `docs/qa/release-checklist.md`
- `docs/출시-준비도-회복/*`
- 현재 코드 구조 `src/navigation`, `src/screens`, `src/services`, `src/store`, `src/hooks`, `supabase`, `__tests__`
- 관련 도메인 문서 `docs/domains/*`
- 2026-04-17 기준 linked remote 최소 확인

## 2. 문제

- 현재 문서는 도메인별 설명은 풍부하지만, 실제 운영 단위에서 무엇이 구현 완료인지, 무엇이 검증만 남았는지, 무엇이 placeholder인지 한 번에 보이지 않는다.
- `v1.0 출시 준비`와 `v1.1 확장 설계`가 같은 문서 층위에 섞여 있어 우선순위 해석이 흔들릴 수 있다.
- 코드에 버튼과 화면이 있다고 해서 구현 완료로 볼 수 없는 항목이 있다.
- 대표적으로 social login, Guestbook, entitlement, Premium AI, typography rollout은 문서와 코드의 체감이 다르다.
- release readiness는 일부 문서에서 상당히 닫힌 것처럼 보이지만, 실기기 최종 캡처와 evidence pack은 아직 미완료다.

## 3. 선택지

- 기존처럼 도메인 문서만 계속 누적한다.
- release checklist만 유지하고 v1.1 항목은 별도 제안서로만 관리한다.
- 프로젝트 전체를 Task 단위로 재편성하고, 각 Task마다 `구현됨 / 아직 안 됨 / 추가 작업 필요 / 검증 남음`을 동시에 판정한다.

## 4. 결정 이유

- 권장안은 세 번째다.
- NURI는 이미 단순 MVP가 아니라 인증, 기록, 건강, 장소, 여행, 커뮤니티, 정책, 운영 증적이 얽힌 상태다.
- 이제는 기능 설명보다 `운영 가능한 작업 단위`가 더 중요하다.
- 따라서 Task는 화면 단위가 아니라 `운영 계약 단위`로 끊고, 각 Task에 우선순위, 선행조건, 리스크, 다음 액션을 붙여야 실제 구현과 QA가 맞물린다.
- 이번 정리에는 아래 방향을 이미 반영했다.
- `우리동네 동물병원`은 v1.1 실질 1순위이며, 공식 source -> canonical -> public query 기반과 MVP 리스트/상세가 repo 기준 구현됐다.
- Guestbook 공개형 확장은 금지하고 `펫별 private letters` 방향으로 전환한다.
- typography는 foundation 재정의 후 화면군 단위 rollout으로 관리한다.
- social login은 `Google first / Apple iOS 동시 필수 / Kakao 후행`으로 관리한다.
- Premium AI 답장은 entitlement, consent, generation log, provider/policy 선행조건이 있어 독립 Task로 분리한다.
- `반려동물과 여행`은 앱 런타임에서 제거하고, remote migration 이력만 운영 히스토리로 남긴다.

## 5. 리스크

- 구현 lane과 후행 release lane이 다시 섞이면 우선순위가 쉽게 왜곡된다.
- 문서 기준으로는 설계가 있어도 코드와 remote가 비어 있는 항목이 있다.
- 대표 불일치는 social login, entitlement 스키마, Guestbook/letters, AI notice다.
- 일부 항목은 repo 구현과 remote 반영은 확인됐지만, 물리 실기기 QA 또는 release evidence가 남아 있다.
- 특히 장소/여행/산책, RC smoke, 운영 증적 패키지는 구현 상태를 과대평가하면 안 되지만, 현재는 후행 게이트로 두어야 한다.

## 6. 다음 액션 순서

1. 현재 최상위 목표가 구현 완료인 동안에는 release lane을 마지막 게이트로만 유지한다.
2. 구현 흔적이 있는 항목은 `추가 작업 필요`와 `검증 남음`을 분리한다.
3. placeholder와 설계-only 항목은 문서가 많아도 `아직 안 됨`으로 유지한다.
4. 다음 구현 착수는 `즉시 착수 가능`이며 `재사용 폭이 큰` Task부터 연다.
5. v1.1 기능은 Guestbook, social login, Premium AI처럼 UI만 먼저 여는 방식을 금지하고, 서버 계약과 정책 선행조건부터 닫는다.

# Task Master Checklist

판정 기준 메모:

- `구현됨`: 코드와 화면/서비스 계약이 실제로 존재하고, project-memory 또는 테스트/remote 검증 흔적이 있다.
- `아직 안 됨`: placeholder이거나, 버튼/문서만 있고 실제 동작 경로가 없다.
- `추가 작업 필요`: 일부 구현은 있으나 운영 기준 계약이 비어 있거나 v1.1 확장 기준 구조 보강이 필요하다.
- `검증 남음`: repo 구현은 있으나 실기기, remote, release smoke, 회귀 증적이 아직 부족하다.
- 상태 집계는 복수 선택 허용 기준이다.

## task1 [인증 baseline과 계정 라이프사이클]

- 분류: Auth / 운영 계약
- 현재 상태:
  - 구현됨
  - 검증 남음
- 우선순위:
  - P0
- 관련 도메인/화면:
  - SignIn
  - SignUp
  - Password Reset
  - Account Deletion
- 관련 파일/문서:
  - `src/services/supabase/auth.ts`
  - `src/screens/Auth/*`
  - `docs/project-memory/현재-프로젝트-상태.md`
  - `docs/qa/release-checklist.md`
  - `docs/출시-준비도-회복/11-release-blocker-evidence-pack.md`
- 현재까지 확인된 사실:
  - 이메일 가입/로그인, 비밀번호 재설정 복귀, 계정 탈퇴 7일 유예, 자동 파기 worker까지 project-memory 기준 닫혀 있다.
  - release 문서 기준 `yarn tsc`, `yarn lint`, 핵심 Jest, Android release build, Android smoke는 통과 기록이 있다.
  - linked remote 기준 계정 삭제 worker와 cleanup 흐름 증적이 문서화돼 있다.
- 구현 완료로 볼 수 있는 범위:
  - 이메일 기반 인증 핵심 플로우
  - 비밀번호 재설정
  - 탈퇴 요청, 유예, 복구 가드, 자동 파기 백엔드
- 아직 안 된 범위:
  - 없음
- 추가 작업이 필요한 이유:
  - 없음
- 검증이 남은 이유:
  - release candidate 빌드 기준 최종 smoke와 evidence pack 마감이 아직 남아 있다.
- 선행 조건 / 의존성:
  - linked remote 유지
  - Android 실기기
  - release candidate 빌드
- 리스크:
  - 문서상 완료와 스토어 제출 직전 운영 증적 완료를 같은 말로 해석하면 안 된다.
- 다음 액션:
  - RC 빌드 기준 가입, 로그인, 로그아웃, 재설정, 탈퇴를 한 번에 묶은 최종 smoke를 수행한다.

## task2 [소셜 로그인 도입]

- 분류: Auth / v1.1 확장
- 현재 상태:
  - 아직 안 됨
  - 추가 작업 필요
- 우선순위:
  - P1
- 관련 도메인/화면:
  - SignIn
  - SignUp
  - OAuth callback
- 관련 파일/문서:
  - `src/screens/Auth/SignInScreen.tsx`
  - `src/screens/Auth/SignUpScreen.tsx`
  - `src/navigation/linking.ts`
  - `src/services/supabase/auth.ts`
  - `ios/nuri/Info.plist`
  - `android/app/google-services.json`
- 현재까지 확인된 사실:
  - 코드 기준 SignIn/SignUp에 Google, Kakao 버튼은 노출되지만 `준비 중` Alert만 띄운다.
  - 코드 기준 OAuth provider 호출, provider linking, generic callback route는 없다.
  - remote 기준 2026-04-17 `auth/v1/settings`에서 `google`, `kakao`, `apple`은 모두 `false`다.
  - 코드 기준 password reset deep link는 `nuri://auth/reset`만 연결돼 있고 generic OAuth callback은 없다.
  - 코드 기준 iOS `GoogleService-Info.plist`는 없다.
  - Android `google-services.json`에는 OAuth client가 비어 있다.
- 구현 완료로 볼 수 있는 범위:
  - 없음
- 아직 안 된 범위:
  - Google OAuth 실제 로그인
  - Apple 로그인
  - Kakao 로그인
  - provider callback 복귀
  - account linking
  - provider mismatch UX
- 추가 작업이 필요한 이유:
  - provider enablement, native config, callback path, Supabase identity linking 정책, Apple iOS 동시 전략이 모두 비어 있다.
- 검증이 남은 이유:
  - 미구현이라 검증 단계 전이다.
- 선행 조건 / 의존성:
  - Supabase provider enablement
  - iOS/Android callback 설계
  - Apple 동시 출시 판단
  - stable error code 설계
- 리스크:
  - 버튼 노출만 보고 구현 완료로 오판할 위험이 크다.
  - Apple 없이 iOS에서 Google/Kakao만 열면 심사 리스크가 생긴다.
- 다음 액션:
  - `Google first + Apple iOS 동시 + Kakao 후행` 기준으로 auth contract 문서와 callback 경로를 먼저 고정한다.

## task3 [온보딩, 프로필, 펫 관리 baseline]

- 분류: Core product
- 현재 상태:
  - 구현됨
  - 검증 남음
- 우선순위:
  - P1
- 관련 도메인/화면:
  - Nickname Setup
  - Pet Create
  - Pet Profile Edit
  - Pet Management
- 관련 파일/문서:
  - `src/screens/Auth/NicknameSetupScreen.tsx`
  - `src/screens/Pets/*`
  - `src/store/petStore.ts`
  - `docs/project-memory/현재-프로젝트-상태.md`
- 현재까지 확인된 사실:
  - 닉네임 정책 `2..10`은 앱과 remote 기준 정렬됐다고 project-memory에 기록돼 있다.
  - 펫 생성/수정/멀티펫 선택 화면과 store는 존재한다.
  - 멀티펫 구독 제한은 설계 문서가 있으나 entitlement 기반 제한은 아직 실제 적용되지 않았다.
- 구현 완료로 볼 수 있는 범위:
  - 닉네임 설정
  - 펫 생성/수정
  - 펫 선택과 프로필 기본 관리
- 아직 안 된 범위:
  - entitlement 기반 멀티펫 운영 제어
- 추가 작업이 필요한 이유:
  - 핵심 baseline 자체는 닫혔으므로 즉시 보강 필요 항목은 크지 않다.
- 검증이 남은 이유:
  - RC smoke 기준 온보딩부터 펫 생성까지 연속 확인이 release 문서에서 아직 남아 있다.
- 선행 조건 / 의존성:
  - auth baseline
  - petStore hydrate
- 리스크:
  - 추후 entitlement 연결 시 현재 free-flow와 충돌할 수 있다.
- 다음 액션:
  - RC smoke에 닉네임 설정, 첫 펫 생성, 펫 전환 시나리오를 포함한다.

## task4 [홈 허브와 회상 경험]

- 분류: Core product
- 현재 상태:
  - 구현됨
  - 검증 남음
- 우선순위:
  - P2
- 관련 도메인/화면:
  - Main
  - LoggedInHome
  - Home recall
- 관련 파일/문서:
  - `src/screens/Main/MainScreen.tsx`
  - `src/services/home/homeRecall.ts`
  - `src/services/home/weeklySummary.ts`
  - `__tests__/homeWidgetSnapshot.test.ts`
- 현재까지 확인된 사실:
  - 홈 허브와 회상 카드, 위젯 snapshot, 주간 요약 로직은 코드와 테스트에 존재한다.
  - 건강관리의 최신 체중 반영 경로도 project-memory 기준 홈까지 이어진다.
- 구현 완료로 볼 수 있는 범위:
  - 로그인 홈 허브
  - 회상/요약 카드
  - 날씨/활동 연결 entry 일부
- 아직 안 된 범위:
  - 없음
- 추가 작업이 필요한 이유:
  - 없음
- 검증이 남은 이유:
  - RC smoke에서 홈 진입과 최신 데이터 반영 최종 확인이 남아 있다.
- 선행 조건 / 의존성:
  - petStore
  - memories
  - schedules
- 리스크:
  - 감성 문구는 충분하지만, 실제 최신 데이터 반영이 틀리면 신뢰 문제가 생긴다.
- 다음 액션:
  - RC smoke에 홈 최신 체중/회상 카드 반영 확인을 포함한다.

## task5 [타임라인과 기록 write/read baseline]

- 분류: Core product
- 현재 상태:
  - 구현됨
  - 검증 남음
- 우선순위:
  - P1
- 관련 도메인/화면:
  - Timeline
  - Record Create
  - Record Detail
  - Record Edit
- 관련 파일/문서:
  - `src/screens/Records/*`
  - `src/services/supabase/memories.ts`
  - `__tests__/recordsForm.test.ts`
  - `__tests__/timelineQuery.test.ts`
- 현재까지 확인된 사실:
  - 타임라인 조회/작성/수정 기본 축은 코드와 테스트로 존재한다.
  - 건강 입력 분산을 줄이기 위해 타임라인의 신규 `health` write entry는 숨기는 구조가 recent logs에 기록돼 있다.
- 구현 완료로 볼 수 있는 범위:
  - 일반 기록 create/read/update
  - 타임라인 query/view
  - legacy health read-path 유지
- 아직 안 된 범위:
  - 없음
- 추가 작업이 필요한 이유:
  - 없음
- 검증이 남은 이유:
  - 타임라인에서 건강 입력 제거 후 회귀 smoke가 release 후보 기준으로 남아 있다.
- 선행 조건 / 의존성:
  - memories table
  - record draft/local storage
- 리스크:
  - Guestbook/편지함 전환 시 returnTo와 탭 복귀 흐름에 영향이 갈 수 있다.
- 다음 액션:
  - 일반 기록과 건강관리 전용 기록하기의 경계가 유지되는지 QA 시나리오를 묶는다.

## task6 [건강관리, 체중 로그, Health Report Phase 1]

- 분류: Health domain
- 현재 상태:
  - 구현됨
  - 검증 남음
- 우선순위:
  - P1
- 관련 도메인/화면:
  - HealthReport
  - WeightLogEntrySheet
  - Health insights
- 관련 파일/문서:
  - `src/screens/HealthReport/HealthReportScreen.tsx`
  - `src/services/supabase/petWeightLogs.ts`
  - `src/services/health-report/viewModel.ts`
  - `docs/project-memory/현재-프로젝트-상태.md`
  - `__tests__/healthReportViewModel.test.ts`
- 현재까지 확인된 사실:
  - project-memory 기준 Phase 1 MVP는 repo 구현, remote migration, row-level 검증, Android 실기기 핵심 QA가 닫혔다.
  - recent logs 기준 인사이트 탭을 일반 사용자용으로 전환했고, 기록밀도와 저장 후 포커스 보정이 추가됐다.
- 구현 완료로 볼 수 있는 범위:
  - 건강기록/체중관리/인사이트 기본 화면
  - 체중 로그 저장과 `pets.weight_kg` 최신 snapshot 정합성
  - 홈 최신 체중 반영
- 아직 안 된 범위:
  - premium 인사이트
- 추가 작업이 필요한 이유:
  - 없음
- 검증이 남은 이유:
  - 최근 보정된 인사이트/일시 선택 모달의 실기기 smoke가 project-memory 다음 작업으로 남아 있다.
- 선행 조건 / 의존성:
  - `pet_weight_logs`
  - `pets.weight_kg` sync trigger
- 리스크:
  - 최근 UI/뷰모델 보정분이 release candidate에서 다시 흔들릴 수 있다.
- 다음 액션:
  - 건강관리 인사이트와 저장 후 포커스, 일정 연결 시나리오를 Android 실기기에서 연속 확인한다.

## task7 [일정 baseline과 건강관리 연계]

- 분류: Scheduling
- 현재 상태:
  - 구현됨
  - 추가 작업 필요
  - 검증 남음
- 우선순위:
  - P1
- 관련 도메인/화면:
  - Schedule List
  - Schedule Create
  - Schedule Edit
  - HealthReport 연계 일정
- 관련 파일/문서:
  - `src/screens/Schedules/*`
  - `src/services/schedules/form.ts`
  - `__tests__/schedulesForm.test.ts`
  - `docs/project-memory/최근-작업-로그.md`
- 현재까지 확인된 사실:
  - 일정 CRUD baseline은 존재한다.
  - recent logs 기준 날짜/시간을 `일시` 하나로 묶는 모달 보정, 건강관리 병원/약 write-path 이관이 진행됐다.
- 구현 완료로 볼 수 있는 범위:
  - 일반 일정 조회/작성/수정
  - 건강관리에서 병원/약 일정 생성으로의 연결
- 아직 안 된 범위:
  - 건강관리 전환 이후의 전체 UX 정리 마감
- 추가 작업이 필요한 이유:
  - 건강관리 write-path 일원화 이후 일정 생성 UX를 release 기준으로 한번 더 정리해야 한다.
- 검증이 남은 이유:
  - Android 실기기에서 `일시` 모달, 직접 입력 시간, 저장 후 반영 확인이 남아 있다.
- 선행 조건 / 의존성:
  - HealthReport 연계
  - schedule store/query invalidate
- 리스크:
  - 일정/건강관리 경계가 다시 갈라지면 입력 source of truth가 흔들린다.
- 다음 액션:
  - 건강관리에서 병원/약 일정 생성 후 리스트 반영과 시간 저장 정합성을 smoke 한다.

## task8 [커뮤니티 신고, 모더레이션, 운영 방어선]

- 분류: Community / release blocker
- 현재 상태:
  - 구현됨
  - 검증 남음
- 우선순위:
  - P0
- 관련 도메인/화면:
  - Community List
  - Community Detail
  - Report flow
  - Moderation queue backend
- 관련 파일/문서:
  - `src/screens/Community/*`
  - `src/services/supabase/community.ts`
  - `src/services/community/errors.ts`
  - `supabase/migrations/20260329*`
  - `docs/project-memory/현재-프로젝트-상태.md`
- 현재까지 확인된 사실:
  - project-memory 기준 write-path rate limit, dedupe, blocked-term, stable error contract, 신고 auto-hide, moderation queue/action log, hidden 이미지 비노출까지 닫혀 있다.
  - release evidence pack 문서에는 row-level 캡처와 cleanup 증적 일부가 아직 남아 있다.
- 구현 완료로 볼 수 있는 범위:
  - 게시글/댓글 작성 방어선
  - 신고/auto-hide backend
  - 인앱 정책 notice
- 아직 안 된 범위:
  - 운영자 전용 admin UI
- 추가 작업이 필요한 이유:
  - 현재 baseline은 출시 가능 수준이지만 장기 운영 UI는 별도 백로그다.
- 검증이 남은 이유:
  - release 보관용 row-level 증적 패키지 정리가 아직 끝나지 않았다.
- 선행 조건 / 의존성:
  - linked remote
  - moderation tables
- 리스크:
  - 기능이 있어도 운영 캡처와 SOP가 없으면 release 설명력이 떨어진다.
- 다음 액션:
  - moderation queue/action/image cleanup row-level 캡처를 evidence pack에 최종 반영한다.

## task9 [위치기반 펫동반 장소 탐색 foundation]

- 분류: Location discovery
- 현재 상태:
  - 구현됨
  - 검증 남음
- 우선순위:
  - P0
- 관련 도메인/화면:
  - Nearby Walk
  - Pet-friendly places
  - Location detail
  - Map preview
- 관련 파일/문서:
  - `src/hooks/useCurrentLocation.ts`
  - `src/hooks/useLocationDiscovery.ts`
  - `src/screens/LocationDiscovery/*`
  - `src/services/locationDiscovery/service.ts`
  - `docs/출시-준비도-회복/13-pettravel-trust-search-filter-계약.md`
- 현재까지 확인된 사실:
  - 위치 권한, 지도, 리스트, 상세, 외부 지도 열기, trust/user layer 분리 구조가 코드에 존재한다.
  - project-memory 기준 공개 라벨은 `후보 / 확인 필요 / 검수 반영`으로 잠겨 있고 `confirmed`는 닫혀 있다.
  - release 체크리스트 기준 장소/여행/산책 실기기 최종 캡처가 가장 큰 남은 리스크다.
- 구현 완료로 볼 수 있는 범위:
  - 위치 기반 후보 탐색
  - 지도/리스트/상세 baseline
  - trust label 분리
- 아직 안 된 범위:
  - 없음
- 추가 작업이 필요한 이유:
  - 없음
- 검증이 남은 이유:
  - 물리 실기기에서 공개 라벨, stale/conflict 문구, 지도 미리보기, 외부 지도 전환 캡처가 남아 있다.
- 선행 조건 / 의존성:
  - Kakao Local 연동
  - 위치 권한
- 리스크:
  - candidate 데이터를 추천처럼 읽히게 만들면 운영 원칙을 바로 위반한다.
- 다음 액션:
  - 장소/산책 상세와 지도 전환의 물리 실기기 최종 캡처를 확보한다.

## task10 [우리동네 동물병원 foundation]

- 분류: New v1.1 domain
- 현재 상태:
  - 구현됨
  - 추가 작업 필요
  - 검증 남음
- 우선순위:
  - P0
- 관련 도메인/화면:
  - 병원 리스트
  - 병원 상세
  - 현재 위치 기반 탐색
  - 공식 source canonical
  - field-level verification
- 관련 파일/문서:
  - `src/domains/animalHospital/*`
  - `src/services/animalHospital/*`
  - `src/services/supabase/animalHospitals.ts`
  - `src/hooks/useAnimalHospitalDiscovery.ts`
  - `src/hooks/useAnimalHospitalThumbnail.ts`
  - `src/components/animalHospital/*`
  - `src/screens/AnimalHospital/*`
  - `supabase/migrations/20260417101500_task10_animal_hospital_canonical_master.sql`
  - `supabase/migrations/20260420093000_animal_hospital_verification_reporting.sql`
  - `supabase/migrations/20260421110000_animal_hospital_public_thumbnail_verification.sql`
- 현재까지 확인된 사실:
  - 병원 도메인은 기존 `pet-friendly-place`와 분리된 전용 타입, source/canonical/public/internal projection으로 구현됐다.
  - Localdata 공식 source snapshot, canonical upsert, source provenance, change log schema가 repo와 remote 기준으로 열렸다.
  - EPSG:5174 좌표는 WGS84 변환 경로가 연결됐고, public query는 active/not hidden canonical을 우선한다.
  - public 기본 노출은 병원명, 주소, 좌표, 거리, 인허가/운영상태 요약, 공식/검수 전화, trust label, 길찾기/전화 CTA, 검수 썸네일 URL로 제한한다.
  - 운영시간, 24시간, 야간, 주말, 특수동물, 응급, 주차, 장비, 홈페이지/SNS는 public projection에서 계속 닫혀 있다.
  - 리스트는 썸네일, 동물병원, 병원명, 주소, 전화번호 중심으로 정리됐다.
- 구현 완료로 볼 수 있는 범위:
  - 도메인 타입/projection/public whitelist
  - 공식 source normalize/ingest contract
  - canonical upsert repository
  - conservative runtime candidate matching
  - canonical 우선 public query
  - 리스트/상세 MVP shell
  - 전화/길찾기 CTA
  - approved phone/coordinates/thumbnail verification gate
- 아직 안 된 범위:
  - 운영자 검수 UI
  - 사용자 신고 UI
  - 운영시간/응급/특수동물 등 민감 필드 public 개방
  - release evidence pack 최종 보관본
- 추가 작업이 필요한 이유:
  - verification/reporting은 schema/RPC 기반이 먼저 열렸고, 실제 운영자 화면과 SOP는 아직 별도 구현이 필요하다.
- 검증이 남은 이유:
  - Android 실기기에서 리스트 진입, 상세 진입/복귀, 전화 CTA, 지도 CTA, 로딩 종료를 최종 확인해야 한다.
- 선행 조건 / 의존성:
  - 위치/지도 재사용
  - Localdata canonical data
  - field-level verification policy
- 리스크:
  - 병원 운영시간, 24시간, 특수동물 진료를 raw 후보 데이터만으로 확정 문구처럼 노출하면 위험하다.
- 다음 액션:
  - Android 실기기 smoke를 닫고, 다음 턴에서 운영자 검수 UI와 사용자 신고 UI 중 하나를 먼저 연다.

## task11 [반려동물과 여행 제거]

- 분류: Removed domain
- 현재 상태:
  - 구현됨
  - 검증 남음
- 우선순위:
  - 종료
- 관련 도메인/화면:
  - 제거된 PetTravel List
  - 제거된 PetTravel Detail
  - 제거된 Travel trust layer app runtime
- 관련 파일/문서:
  - `src/navigation/RootNavigator.tsx`
  - `src/screens/More/MoreDrawerContent.tsx`
  - `src/services/supabase/placeTravelUserLayer.ts`
  - `src/services/local/placeTravelSearch.ts`
  - `src/store/mapViewportStore.ts`
  - `docs/policies/이용약관.md`
  - `docs/policies/정책-문서-정합성-점검.md`
  - `docs/domains/반려동물과-여행/*`
- 현재까지 확인된 사실:
  - 앱 런타임 기준 PetTravel route, More 메뉴, screen, service, hook, map panel, Jest suite는 제거됐다.
  - remote Supabase migration 이력은 과거 운영 히스토리라 삭제하지 않는다.
  - 도메인 설계 문서는 역사 문서로 남기되, 신규 제품 방향의 source of truth로 쓰지 않는다.
- 구현 완료로 볼 수 있는 범위:
  - 사용자 진입 경로 제거
  - navigation route/type 제거
  - app runtime import 제거
  - travel 전용 테스트 제거
- 아직 안 된 범위:
  - remote DB/RPC 물리 삭제
  - 도메인 역사 문서 아카이브 위치 재배치
- 추가 작업이 필요한 이유:
  - 없음
- 검증이 남은 이유:
  - 앱 전체 타입/실기기 진입에서 제거 후 route 참조가 남지 않는지 확인해야 한다.
- 선행 조건 / 의존성:
  - 없음
- 리스크:
  - remote DB/RPC를 즉시 삭제하면 구버전 앱 호출이 깨질 수 있으므로 이번 범위에서는 삭제하지 않는다.
- 다음 액션:
  - 다음 release 정리 턴에서 도메인 역사 문서 아카이브와 remote cleanup 여부를 별도 판단한다.

## task12 [가이드, 콘텐츠, 관리자 편집 baseline]

- 분류: Content domain
- 현재 상태:
  - 구현됨
  - 검증 남음
- 우선순위:
  - P2
- 관련 도메인/화면:
  - Guide List
  - Guide Detail
  - Guide Admin
- 관련 파일/문서:
  - `src/screens/Guides/*`
  - `src/services/guides/*`
  - `__tests__/guideCatalogSource.test.ts`
  - `docs/출시-준비도-회복/15-guide-source-of-truth.md`
- 현재까지 확인된 사실:
  - 가이드 조회와 관리자 편집 화면, source of truth 관련 테스트가 존재한다.
  - release 문서상 가이드는 최상위 blocker는 아니지만 실제 source 관리 기준은 잡혀 있다.
- 구현 완료로 볼 수 있는 범위:
  - 가이드 조회
  - 기본 관리자 편집
- 아직 안 된 범위:
  - 없음
- 추가 작업이 필요한 이유:
  - 없음
- 검증이 남은 이유:
  - RC smoke와 운영 source 확인이 아직 최종 마감되지 않았다.
- 선행 조건 / 의존성:
  - guides table/service
- 리스크:
  - source of truth가 흐려지면 콘텐츠 노출은 되더라도 운영 정합성이 무너진다.
- 다음 액션:
  - release smoke에 가이드 목록/상세 진입과 source 문서를 함께 점검한다.

## task13 [Guestbook 탭을 private 편지함으로 전환]

- 분류: IA 전환 / 신규 도메인 기반
- 현재 상태:
  - 아직 안 됨
  - 추가 작업 필요
- 우선순위:
  - P1
- 관련 도메인/화면:
  - GuestbookTab
  - 편지함 IA
  - 펫별 사적 기록 공간
- 관련 파일/문서:
  - `src/navigation/AppTabsNavigator.tsx`
  - `src/screens/Guestbook/GuestbookScreen.tsx`
  - `docs/프로젝트-현황-최종기획/5차-최종-기획서.md`
  - `docs/sql/공용/누리-전체초기구성-부트스트랩.sql`
- 현재까지 확인된 사실:
  - 코드 기준 GuestbookTab은 실제 탭에 남아 있지만 화면은 placeholder다.
  - 기획 문서 기준 Guestbook 공개형 확장은 금지 방향이다.
  - SQL 기준 `letters`, `ai_messages` 테이블은 존재하지만 앱 코드에서는 사용 흔적이 없다.
  - 이번 v1.1 방향 기준 Guestbook은 `펫별 private letters`로 재정의하는 것이 사실상 확정 방향이다.
- 구현 완료로 볼 수 있는 범위:
  - 없음
- 아직 안 된 범위:
  - 편지함 정보 구조
  - 펫별 편지 목록/상세/작성
  - 탭 명칭과 IA 전환
- 추가 작업이 필요한 이유:
  - 현재 탭은 제품 구조를 흐리는 placeholder이며, future premium AI reply의 진입점 역할도 해야 한다.
- 검증이 남은 이유:
  - 미구현이라 검증 단계 전이다.
- 선행 조건 / 의존성:
  - selected pet context
  - letters schema 방향 확정
  - privacy policy 확장
- 리스크:
  - legacy `letters` 테이블이 있다고 해서 현재 제품 기능이 있는 것으로 오판하면 안 된다.
- 다음 액션:
  - GuestbookTab을 `private letters` 전용 IA로 바꾸는 화면/데이터 계약을 먼저 고정한다.

## task14 [프리미엄 AI 답장]

- 분류: Premium / AI product
- 현재 상태:
  - 아직 안 됨
  - 추가 작업 필요
- 우선순위:
  - P1
- 관련 도메인/화면:
  - 편지 작성 후 AI 답장
  - regenerate
  - paywall
- 관련 파일/문서:
  - `docs/sql/공용/누리-전체초기구성-부트스트랩.sql`
  - `docs/policies/개인정보처리방침.md`
  - `src/components/common/PremiumNoticeModal.tsx`
  - `docs/project-memory/현재-프로젝트-상태.md`
- 현재까지 확인된 사실:
  - SQL 기준 `ai_messages` 테이블은 존재하지만 앱 코드에서 답장 생성/조회 흐름은 없다.
  - project-memory 기준 결제는 아직 도입하지 않으며 premium 확장은 v1.1 설계 대상으로 둔다.
  - 이번 전용 설계 방향 기준 AI 답장은 `grounded personalization`, `deathDate 분기`, `정서적 안전장치`가 필수다.
- 구현 완료로 볼 수 있는 범위:
  - 없음
- 아직 안 된 범위:
  - AI generation pipeline
  - grounded context retrieval
  - generation logs
  - regenerate 정책
  - paywall 연동
  - AI consent
- 추가 작업이 필요한 이유:
  - entitlement, consent, provider policy, schema normalization이 선행되지 않으면 여는 순간 운영 리스크가 크다.
- 검증이 남은 이유:
  - 미구현이라 검증 단계 전이다.
- 선행 조건 / 의존성:
  - task13 private letters
  - task15 entitlement/billing
  - task19 정책/AI notice
- 리스크:
  - 감성 표현이 안전 정책을 넘어서면 정서적 위해 리스크가 생긴다.
  - 기록에 없는 사실을 생성하면 제품 신뢰를 바로 잃는다.
- 다음 액션:
  - AI 자체 구현 전에 `pet_letters`, `reply logs`, consent, provider policy, usage limit 설계부터 닫는다.

## task15 [구독, entitlement, billing foundation]

- 분류: Monetization foundation
- 현재 상태:
  - 아직 안 됨
  - 추가 작업 필요
- 우선순위:
  - P1
- 관련 도메인/화면:
  - 멀티펫 구독
  - premium access
  - entitlement check
- 관련 파일/문서:
  - `docs/domains/멀티펫-구독/*`
  - `docs/sql/공용/누리-전체초기구성-부트스트랩.sql`
  - `src/components/common/PremiumNoticeModal.tsx`
  - remote table check 2026-04-17
- 현재까지 확인된 사실:
  - 도메인 문서 기준 권장 구조는 `user_subscriptions`, `user_entitlements`, `billing_events`다.
  - remote 기준 2026-04-17 `user_subscriptions`, `user_entitlements`는 `404`이고, legacy `subscriptions`, `billing_events`만 존재한다.
  - 코드 기준 entitlement store, purchase flow, receipt 검증, paywall gating은 없다.
- 구현 완료로 볼 수 있는 범위:
  - legacy `subscriptions`, `billing_events` 테이블 존재
- 아직 안 된 범위:
  - entitlement source of truth
  - 앱 권한 조회
  - 멀티펫 구독 실제 제한
  - premium feature gating
- 추가 작업이 필요한 이유:
  - AI premium reply와 향후 구독 기능 모두 entitlement가 없으면 안정적으로 운영할 수 없다.
- 검증이 남은 이유:
  - 미구현이라 검증 단계 전이다.
- 선행 조건 / 의존성:
  - schema normalization
  - billing provider 결정
  - app-side entitlement fetch/store
- 리스크:
  - 문서와 remote 스키마가 이미 불일치한다.
  - 현재 상태에서 premium 기능을 먼저 붙이면 결제/권한/감사 로그가 분리되지 않는다.
- 다음 액션:
  - `user_subscriptions + user_entitlements + billing_events` 실운영 스키마와 fetch contract부터 다시 잠근다.

## task16 [Typography, AppText foundation, 화면군 rollout]

- 분류: Design system
- 현재 상태:
  - 구현됨
  - 추가 작업 필요
  - 검증 남음
- 우선순위:
  - P1
- 관련 도메인/화면:
  - AppText
  - theme typography
  - 전 화면 공통 텍스트
- 관련 파일/문서:
  - `src/app/theme/tokens/typography.ts`
  - `src/app/ui/AppText.tsx`
  - `src/screens/Auth/SignInScreen.tsx`
  - `src/components/common/PremiumNoticeModal.tsx`
  - `src/components/locationDiscovery/LocationDiscovery.styles.ts`
- 현재까지 확인된 사실:
  - 코드 기준 PretendardVariable, `theme.typography`, `AppText` foundation은 이미 존재한다.
  - 코드 기준 Auth, modal, 일부 공통 컴포넌트, 홈/탐색 화면에는 raw `Text`, inline `fontSize/fontWeight`가 여전히 많이 남아 있다.
  - 이번 v1.1 방향은 foundation 재정의 후 화면군 단위 순차 적용이다.
- 구현 완료로 볼 수 있는 범위:
  - typography token 기초
  - AppText 공통 컴포넌트
- 아직 안 된 범위:
  - 전역 일관 적용
  - screen group rollout
  - luxury tone / cute tone 운영 원칙 반영
- 추가 작업이 필요한 이유:
  - foundation만 있고 실제 소비가 분산되어 있어 디자인 시스템의 실효성이 낮다.
- 검증이 남은 이유:
  - Android 실기기 가독성, line-height, 접근성 최소 크기 검증이 아직 체계적으로 닫히지 않았다.
- 선행 조건 / 의존성:
  - theme 유지
  - AppText preset 재정의
  - 화면군 rollout 계획
- 리스크:
  - 토큰 이름만 바꾸고 raw Text가 남으면 화면별 오차가 더 커질 수 있다.
- 다음 액션:
  - Auth, Home, Location, Modal 4개 화면군부터 typography preset과 AppText 소비를 통일한다.

## task17 [설정, More, 정책 링크 baseline]

- 분류: Settings / support flows
- 현재 상태:
  - 구현됨
  - 검증 남음
- 우선순위:
  - P2
- 관련 도메인/화면:
  - More drawer
  - More screen
  - 정책 링크
  - 계정 삭제 안내
- 관련 파일/문서:
  - `src/components/MoreDrawer/MoreDrawer.tsx`
  - `src/screens/More/MoreDrawerContent.tsx`
  - `src/services/legal/documents.ts`
  - `docs/project-memory/현재-프로젝트-상태.md`
- 현재까지 확인된 사실:
  - 정책 문서 public 연결과 앱 복귀는 실기기 검증까지 완료 기록이 있다.
  - More 구조와 계정 삭제 안내 동선은 실제 앱에 존재한다.
- 구현 완료로 볼 수 있는 범위:
  - More drawer baseline
  - 정책 링크 연결
  - 계정 관련 진입
- 아직 안 된 범위:
  - 없음
- 추가 작업이 필요한 이유:
  - 없음
- 검증이 남은 이유:
  - RC smoke 기준 More 진입과 링크 확인이 아직 남아 있다.
- 선행 조건 / 의존성:
  - legal documents source of truth
- 리스크:
  - public 문서 URL이 바뀌면 앱이 살아 있어도 정책 링크는 쉽게 깨진다.
- 다음 액션:
  - RC smoke에 More 정책 링크, 계정 삭제 안내, 앱 복귀를 포함한다.

## task18 [QA, release readiness, evidence pack]

- 분류: Release management
- 현재 상태:
  - 추가 작업 필요
  - 검증 남음
- 우선순위:
  - P3
- 관련 도메인/화면:
  - 전체 릴리즈 게이트
  - evidence pack
  - RC smoke
- 관련 파일/문서:
  - `docs/qa/release-checklist.md`
  - `docs/출시-준비도-회복/11-release-blocker-evidence-pack.md`
  - `docs/project-memory/현재-프로젝트-상태.md`
  - `__tests__/*`
- 현재까지 확인된 사실:
  - 정적 검증과 일부 Android smoke는 문서상 닫혀 있다.
  - release checklist 기준 가장 큰 남은 리스크는 장소/여행/산책 실기기 최종 캡처, 운영 증적 패키지, 스토어 자산, RC smoke다.
  - 다만 현재 최상위 목표가 배포가 아니라 구현 완료이므로, 이 Task는 마지막 게이트로 유지한다.
- 구현 완료로 볼 수 있는 범위:
  - 자동 검증 기반 일부 gate
  - evidence pack 수집 구조 일부
- 아직 안 된 범위:
  - 최종 physical-device capture 패키지
  - 운영 증적 보관 마감
  - 스토어 제출 자산 마감
  - RC smoke 종결
- 추가 작업이 필요한 이유:
  - 구현 lane이 모두 닫힌 뒤 최종 게이트로 한 번 더 정리해야 하기 때문이다.
- 검증이 남은 이유:
  - 이 Task 자체가 검증과 증적 수집을 닫는 역할이다.
- 선행 조건 / 의존성:
  - Android 실기기
  - linked remote access
  - release candidate build
- 리스크:
  - release lane을 너무 일찍 다시 최상위로 올리면 구현 우선순위가 흔들린다.
- 다음 액션:
  - 현재는 보류하고, 핵심 구현 task가 닫힌 뒤 마지막 게이트로 다시 연다.

## task19 [정책, 개인정보, 동의, AI notice]

- 분류: Policy / trust / compliance
- 현재 상태:
  - 구현됨
  - 추가 작업 필요
  - 검증 남음
- 우선순위:
  - P0
- 관련 도메인/화면:
  - 회원가입 동의
  - More 정책 링크
  - AI notice
  - consent history
- 관련 파일/문서:
  - `src/services/legal/consents.ts`
  - `src/services/legal/documents.ts`
  - `docs/policies/개인정보처리방침.md`
  - `docs/출시-준비도-회복/12-정책-문서-외부-공개-앱-링크.md`
  - remote table `user_consent_history`
- 현재까지 확인된 사실:
  - 현재 회원가입 동의와 정책 문서 public 연결은 닫혀 있다.
  - remote 기준 `user_consent_history` 테이블은 존재한다.
  - 그러나 AI 답장용 별도 동의, 외부 모델 제공자 고지, 학습 비사용 고지, 철회 UX는 아직 없다.
- 구현 완료로 볼 수 있는 범위:
  - 회원가입 동의 baseline
  - 정책 문서 외부 공개와 앱 링크 연결
- 아직 안 된 범위:
  - AI consent
  - Premium AI 데이터 활용 고지
  - provider-specific policy notice
- 추가 작업이 필요한 이유:
  - task14 Premium AI reply를 열려면 정책/동의가 먼저 확장돼야 한다.
- 검증이 남은 이유:
  - 현재 정책 링크는 닫혔지만 AI notice는 미구현이고, release pack 기준 public 링크 재확인도 남아 있다.
- 선행 조건 / 의존성:
  - legal document update
  - consent snapshot/versioning policy
- 리스크:
  - AI 기능을 정책보다 먼저 열면 신뢰와 법적 리스크가 동시에 생긴다.
- 다음 액션:
  - AI 답장 설계에 맞춘 별도 동의 문구, 데이터 전달 범위, 철회 UX를 먼저 문서화한다.

# Task 현황 요약

집계 기준 메모:

- 아래 수치는 `Task 수 기준`이며, `현재 상태`는 복수 선택이 가능하므로 상태별 합은 전체 Task 수와 일치하지 않을 수 있다.

- 전체 task 수: 19
- 구현됨 포함 task 수: 13
- 아직 안 된 task 수: 5
- 추가 작업 필요 task 수: 10
- 검증 남음 task 수: 14
- P0 task 수: 5
- P1 task 수: 9
- P2 task 수: 4
- P3 task 수: 1

# 다음 작업 후보 Top 3

### 후보 1

- task 번호 / 이름
  - task10 / 우리동네 동물병원 foundation
- 지금 해야 하는 이유
  - v1.1에서 제품 가치 상승폭이 가장 크고, 현재 위치/지도/리스트/상세 구조를 가장 많이 재사용할 수 있다.
- 선행 조건 충족 여부
  - 부분 충족
  - 위치 권한, 지도, 리스트/상세, 외부 지도 전환, Kakao Local 후보 수집 기반은 이미 있다.
  - 병원 전용 타입, 신뢰도 계약, 검수/오정보 리포트는 아직 필요하다.
- 기대 효과
  - 새 도메인 가치를 크게 올리면서도 기존 RN Maps/Kakao stack 재사용이 가능하다.
- 리스크
  - 24시간, 야간, 특수동물 진료를 검증 없이 확정 노출하면 운영 리스크가 크다.

### 후보 2

- task 번호 / 이름
  - task13 / Guestbook 탭을 private 편지함으로 전환
- 지금 해야 하는 이유
  - 현재 GuestbookTab은 placeholder이고, Premium AI reply 구조의 선행 IA다.
- 선행 조건 충족 여부
  - 부분 충족
  - 탭 위치와 selected pet context는 이미 있다.
  - 실제 편지 schema와 IA, privacy 정책은 아직 정리 필요하다.
- 기대 효과
  - placeholder 탭을 실제 제품 가치가 있는 사적 기록 도메인으로 전환할 수 있고, AI premium 설계의 기반이 된다.
- 리스크
  - letters/ai_messages legacy 테이블을 그대로 재사용하면 v1.1 구조가 다시 꼬일 수 있다.

### 후보 3

- task 번호 / 이름
  - task16 / Typography, AppText foundation, 화면군 rollout
- 지금 해야 하는 이유
  - foundation은 있지만 실제 소비가 분산돼 있어 앞으로 추가될 화면까지 일관성을 잃기 쉽다.
- 선행 조건 충족 여부
  - 충족
  - token, AppText, theme 기반은 이미 있다.
  - 남은 것은 preset 재정의와 화면군별 rollout 순서다.
- 기대 효과
  - 이후 병원, 편지함, auth 화면까지 같은 타이포 기준으로 밀어붙일 수 있다.
- 리스크
  - foundation만 바꾸고 화면군 적용을 늦추면 또다시 raw text가 늘어날 수 있다.
