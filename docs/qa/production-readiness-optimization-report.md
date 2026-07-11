# Production Readiness Optimization Report

기준일: 2026-07-11

## 목적

이번 점검은 Play Store 자산 준비가 아니라 앱 자체의 실서비스 투입 전 안정화다. 사용자가 체감하는 초기 로딩, 탭 전환, 네비게이션/back, keyboard/nav bar, cache scope, RLS/security를 먼저 닫는다.

## 적용 결과

| 영역 | 적용 내용 | 판정 |
| --- | --- | --- |
| Home 기록/일정 | `userId + petId` scoped disk cache를 추가했다. cache hit이면 Home record/schedule 카드가 원격 응답 전 먼저 채워지고, remote bootstrap은 기존 store 상태머신으로 background refresh한다. | 완료 |
| cache security | cache schema version, savedAt, 3일 TTL, corrupt fallback, user/pet scope validation, logout/account transition cache clear를 추가했다. | 완료 |
| dashboard summary RPC | `get_user_activity_long_summary_v1`를 활동·칭호 service에서 우선 사용해 level summary와 community/comment count 중복 조회를 줄였다. RPC 실패 시 기존 조회로 fallback한다. | 완료 |
| 누리 랭킹 | screen-local ref cache를 React Query 기반 탭별 query key/cache/stale policy로 전환했다. 새 탭은 skeleton, 방문 탭은 cached rows를 표시한다. | 완료 |
| Timeline | category count와 XP/title side summary fetch를 interaction 이후로 지연해 첫 리스트 렌더와 경쟁하지 않게 했다. | 완료 |
| Community | 첫 post list fetch를 interaction 이후로 지연하고 기존 pagination/FlatList 최적화를 유지했다. | 완료 |
| DB/RPC/RLS/seed | 신규 migration 없이 기존 read-only RPC와 client cache만 사용했다. | 변경 없음 |

## 병목 판정

- Home initial blocking query: Home shell은 유지됐지만 record/schedule store가 비어 있으면 최근 기록/일정 카드가 remote bootstrap을 기다렸다. 이번 작업으로 cache hit 시 store가 먼저 채워진다.
- query waterfall: Home의 records/schedules는 독립 fetch이며, cache read와 remote bootstrap을 분리했다.
- ranking flicker: 기존 수동 state/ref cache는 탭별 stale/cache 정책이 없어 빠른 탭 전환 시 fetch state가 화면 local 상태와 섞일 수 있었다. React Query key로 분리했다.
- timeline/community: 화면 첫 paint와 직접 무관한 count/summary fetch는 interaction 이후로 지연했다.

## Android QA 범위

최종 Android release smoke에서 아래를 확인한다.

- cold start -> Home shell
- Home record/schedule cache card 표시
- 전체메뉴 -> 활동·칭호
- 전체메뉴 -> 누리 랭킹, 탭 전환
- 타임라인 initial list
- 커뮤니티 initial list
- 기록 작성/수정 keyboard
- 건강/산책/병원 진입
- Android back
- logcat fatal / ANR / unhandled promise / ReactNativeJS fatal 0건

## 남은 성능 고도화 후보

| 후보 | 분류 | 이유 |
| --- | --- | --- |
| 자동 performance marker | V1.2 성능 고도화 | release build에 과한 로그를 남기지 않는 범위에서 cold start/card ready 시간을 수집할 수 있다. |
| timeline/community React Query 전면 전환 | V1.2 성능 고도화 | 현재 zustand 상태머신이 안정적이므로 대형 전환은 출시 전에는 위험하다. |
| schedule/record cache eviction 세분화 | V1.2 성능 고도화 | 현재는 logout/account transition 시 전체 home preview cache를 제거한다. 계정별 선택 제거는 후속으로 충분하다. |

## 판정

실서비스급 전체 최적화/안정화는 코드 기준 완료로 판정한다. Android release smoke, typecheck, lint, focused tests, RLS/security smoke 결과를 최종 완료 보고에 연결한다.

