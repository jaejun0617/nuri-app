# NURI Canonical Current State

기준일: 2026-08-05 KST

## 저장소 기준선

### 앱

- HEAD: `c691bb74108c1648ce59912bca6f6e00000616e1`
- branch: `codex/task6-community-content-policy`
- origin과 ahead/behind: `0 / 0`
- 현재 dirty 변경: 날짜 입력 5개 runtime 파일과 테스트 1개, Home 1개, project-memory 3개, 리서치 1개
- 이번 audit은 위 변경을 수정·stage·삭제하지 않았다.

### 관리자 웹

- repo: `/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri-web`
- HEAD: `5027caee2212ceca54dfe02270cc3ccdf76e32a3`
- branch: `main`
- origin과 ahead/behind: `0 / 0`
- worktree: clean

## 구현 상태

- Auth, Pet/Profile, Home, Records/Timeline, Weather, Animal Hospital, Community, Notifications, Guides, Schedules, Location/POI, More와 관리자 웹의 주요 runtime surface가 존재한다.
- Home은 전체 누적 요약, 최근 기록, 자주 쓰는 기록, 날씨, 프로필 영역을 사용한다. 최근 Home/프로필 수정은 현재 dirty 상태이므로 clean release 기준선으로 보지 않는다.
- Timeline은 `TimelineEntryGate`, entry generation, FlashList generation, 전체 필터 조회 경로를 HEAD에 포함한다. 최근 빠른 재진입 수정은 코드상 반영되어 있다.
- 날짜 직접 입력은 `DatePickerModal` 공통 경로와 펫 등록·프로필 수정에서 dirty 변경으로 존재한다. 아직 이 audit commit에 포함하지 않았다.
- Supabase migration 53개가 repo에 있으며 linked remote migration list와 dry-run이 일치한다.
- 관리자 웹은 인증·운영·콘텐츠·병원·가이드·알림 관련 route가 존재한다.

## 검증 상태

- 앱 TypeScript: 통과
- 앱 ESLint: 통과
- 앱 Jest: 71 suites / 310 tests 통과
- 관리자 TypeScript: 통과
- 관리자 ESLint: 통과
- 관리자 테스트: 14 tests 통과
- 관리자 production build: 통과
- `git diff --check`: 통과
- Supabase `db push --dry-run`: remote up to date
- Supabase remote table stats: read-only 확인
- full remote policy/RPC catalog dump: Docker daemon 부재로 미확인
- Android cold start: `com.nuri.app` launch 확인, app-scoped fatal marker 없음
- Android baseline APK: versionName `1.0`, versionCode `1`, SHA-256 `34d9f90006926688274f41a62c3e5fcdf019b3b3571626713c2ffbdffff9754b`

## 출시 상태

현재 상태는 기능 개발과 일부 QA가 진행된 release-candidate 전 단계다.

- dirty runtime 변경 때문에 현재 APK는 clean source provenance가 아니다.
- Play Store 제출 자산과 clean RC provenance는 아직 별도 release gate다.
- 실기기 기준선은 `SM-S937N`이며 사용자가 지정한 Galaxy S24 고유 모델 증적과 동일하지 않다.
- Android 전체 smoke와 이전 작업별 증적은 존재하지만, 이번 audit에서는 destructive CRUD를 재수행하지 않았다.

## 정책 기준

- 공개 social login은 현재 코드·문서 기준 Google/Kakao scope로 관리한다.
- Naver app-side/config 경로가 코드와 과거 문서에 남아 있어 hard removal은 완료로 판정하지 않는다. public surface 비노출과 hard delete는 별도 risk다.
- Apple은 Android-first v1.0 public surface에서 제외한다.
- Candidate/Trust/User 경계와 Community moderation 경계를 유지한다.
- 산책 POI는 자체 POI/PostGIS 및 운영 검수 경로를 우선하며, 공용 Kakao 경로가 모든 장소 도메인에서 제거됐다고 단정하지 않는다.

## 다음 기준

1. dirty 날짜 입력·Home 변경을 각 소유 방에서 분리 검증하고 commit한다.
2. Home 전체 요약과 Timeline의 장기 누적·필터·고속 re-entry를 clean APK에서 다시 닫는다.
3. Supabase remote policy/RPC/grant catalog의 직접 read-only 증적을 확보한다.
4. clean release artifact와 실제 운영 gate를 분리해 판정한다.
