# Home / Domain Loading Optimization Report

기준일: 2026-07-11

## 목적

PO가 체감한 “홈과 주요 화면이 잠깐 뜸을 들이다가 한 번에 확 뜨는 느낌”을 줄이기 위해, 초기 화면 shell은 즉시 렌더하고 데이터는 카드별로 부드럽게 채우는 구조로 개선했다.

이번 작업은 새 기능 추가가 아니라 release readiness 성능/UX 최적화다. DB/RPC/RLS/seed, push, Play Store 자산, 홈 위젯, 무지개다리는 변경하지 않았다.

## 병목 분석

| 구분 | 확인 내용 | 판정 |
| --- | --- | --- |
| Home initial blocking query | AppProviders는 프로필/펫을 병렬 fetch하고 pet cache를 먼저 hydrate한다. Home 자체는 shell 렌더 후 기록/일정, 날씨, 추천 가이드, 홈 칭호 조회가 같은 시점에 시작된다. | Home shell은 유지되지만 비핵심 fetch가 첫 paint 직후 몰림 |
| query waterfall | 기록/일정 bootstrap은 서로 독립인데 Home mount effect에서 즉시 실행된다. 날씨는 위치 refresh, district, weather query가 연결되어 있다. | interaction 이후로 늦출 수 있는 비핵심 작업 존재 |
| focus refresh | 날씨 hook은 focus/active refresh를 지원한다. Home에서는 첫 shell 이후 refresh가 더 자연스럽다. | Home에서 deferred enable 적용 |
| screen-level loading | 활동·칭호 화면은 initial dashboard loading 때 header 아래 전체 loading state를 사용했다. | card skeleton으로 전환 필요 |
| 랭킹 tab loading | 탭 전환 시 이전 탭 row가 새 탭 label 아래 잠시 남을 수 있고, 탭별 cache가 없었다. | 탭별 cache와 skeleton 필요 |
| 무거운 컴포넌트 | ranking bar 계산은 가볍지만 매 fetch 후 전체 row를 다시 만든다. activity dashboard는 여러 summary query를 병렬 처리하지만 initial shell은 막았다. | domain shell/skeleton 우선 |

## 적용한 최적화

| 영역 | 변경 |
| --- | --- |
| Home shell | Home 렌더 자체는 유지하고, 기록/일정 bootstrap을 `InteractionManager.runAfterInteractions` 이후로 지연했다. |
| Home weather | `useWeatherGuide` auto refresh를 Home interaction 이후에만 활성화해 첫 paint와 위치/weather refresh가 경쟁하지 않게 했다. |
| Home recommendation | 홈 추천 가이드 catalog fetch를 interaction 이후 enabled 처리했다. 추천 카드 영역은 loading copy로 먼저 자리를 잡는다. |
| Home title badge | 현재 user/pet scoped AsyncStorage cache를 먼저 읽어 대표 칭호 badge를 즉시 표시하고, Supabase `user_titles` 조회는 interaction 이후 background refresh로 갱신한다. |
| Activity dashboard | `활동·칭호` 화면은 header와 ScrollView shell을 먼저 렌더하고 growth/pet/activity/achievement skeleton card를 표시한다. initial load callback dependency를 줄여 중복 load 가능성을 제거했다. |
| Ranking | `누리 랭킹`은 탭별 row cache를 유지한다. 방문한 탭은 즉시 재표시하고, 새 탭은 이전 탭 데이터가 섞이지 않도록 skeleton row를 표시한다. |
| Cache security | Home title badge cache key는 `userId + petId` scoped다. 다른 사용자나 다른 pet cache가 섞이지 않는다. stale cache는 7일 후 제거한다. |

## 완료 기준 점검

| 항목 | 결과 |
| --- | --- |
| Home 전체 blank 제거 | 기존 Home shell 유지, 비핵심 fetch 지연 |
| card-level skeleton | 활동·칭호 skeleton, 랭킹 skeleton 적용 |
| cached data 우선 표시 | Home 대표 칭호 badge cache 적용 |
| stale/background refresh | cache 우선 표시 후 background Supabase refresh |
| query 병렬/지연 | 기록/일정은 interaction 이후 독립 실행, 가이드/weather는 deferred enabled |
| 랭킹 lazy/cache | selected tab만 fetch, 탭별 cache 유지 |
| DB/RPC/RLS 변경 | 없음 |
| push/Play Store 자산 | 없음 |

## 검증

- `corepack yarn tsc --noEmit --pretty false`: 통과
- `corepack yarn lint`: 통과. 기존 warning 6개 유지, 신규 error 없음
- `git diff --check`: 통과
- focused tests:
  - `__tests__/homeTitleBadge.test.ts`
  - `__tests__/activityProgressPolicy.test.ts`
  - `__tests__/activityDashboard.test.ts`
  - `__tests__/activityRanking.test.ts`
  - `__tests__/premiumRewardModalPresentation.test.ts`
  - `__tests__/notificationRetentionPolicy.test.ts`
- Android release APK: `android/app/build/outputs/apk/release/app-release.apk` build/install 성공
- Android smoke:
  - Home cold start shell: `/tmp/nuri-qa/perf-home-cold-start-shell.png`
  - Home progressive cards: `/tmp/nuri-qa/perf-home-progressive-cards.png`
  - 활동·칭호 loaded: `/tmp/nuri-qa/perf-activity-title-loaded.png`
  - 누리 랭킹 loaded/back fix: `/tmp/nuri-qa/perf-ranking-loaded-after-backfix.png`
  - 누리 랭킹 댓글/건강 탭: `/tmp/nuri-qa/perf-ranking-comments.png`, `/tmp/nuri-qa/perf-ranking-health.png`
  - 건강/산책/병원/커뮤니티: `/tmp/nuri-qa/perf-health-loaded.png`, `/tmp/nuri-qa/perf-walk-loaded.png`, `/tmp/nuri-qa/perf-hospital-loaded.png`, `/tmp/nuri-qa/perf-community.png`
- logcat: `/tmp/nuri-qa/perf-logcat.txt`, `FATAL EXCEPTION` / `ANR in` / `Unhandled promise` / `ReactNativeJS fatal` / `Fatal signal` 0건

## 남은 성능 고도화 후보

| 후보 | 분류 | 이유 |
| --- | --- | --- |
| 기록/일정 store disk cache | V1.2 성능 고도화 | 현재 앱 provider가 선택 pet warm-up을 수행하지만 records/schedules 자체 disk cache는 없다. |
| Activity dashboard summary RPC 전면 사용 | V1.2 성능 고도화 | 현재 dashboard는 여러 query를 병렬 실행한다. 장기적으로 summary RPC payload를 더 활용하면 mobile load를 줄일 수 있다. |
| Ranking React Query 전환 | V1.2 성능 고도화 | 현재 screen-local cache로 충분하지만, 앱 전역 cache와 staleTime이 필요해지면 React Query 전환을 검토한다. |
| Home performance marker 자동 수집 | V1.2 성능 고도화 | release build에 과한 log를 남기지 않는 선에서 QA marker를 도입할 수 있다. |

## 판정

홈/주요 도메인 초기 로딩 최적화는 완료로 판정한다. Android release APK 실기기 smoke에서 cold start Home shell, Home progressive card loading, 활동·칭호 skeleton/loaded, 누리 랭킹 skeleton/cache와 탭 전환, 주요 도메인 진입, logcat crash-free를 확인했다. 랭킹 화면에서 entrySource fallback back이 no-op이 되는 문제는 기존 화면 패턴과 동일하게 `goBack` 후 `openMoreDrawer`로 최소 수정하고 재검증했다.
