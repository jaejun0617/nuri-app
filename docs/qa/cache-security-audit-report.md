# Cache Security Audit Report

기준일: 2026-07-11

## 점검 범위

- Home 대표 칭호 cache
- Home 기록/일정 preview cache
- ranking React Query cache
- notification home quick dismiss local state

## 결과

| 항목 | 기준 | 결과 |
| --- | --- | --- |
| Home 대표 칭호 | `userId + petId` key, pet-level title만 표시 | 기존 정책 유지 |
| Home 기록/일정 | `userId + petId` key, schema version, TTL, corrupt fallback | 신규 적용 |
| 기록 cache | `record.petId === petId`인 항목만 저장/복원 | 신규 test 통과 |
| 일정 cache | `schedule.userId === userId && schedule.petId === petId`인 항목만 저장/복원 | 신규 test 통과 |
| logout/account transition | home record/schedule cache 제거 | 신규 적용 |
| ranking cache | React Query key는 category + fixture mode로 분리 | 신규 적용 |
| notification dismiss | home-only local user-scoped state, inbox delete와 분리 | 기존 정책 유지 |

## 금지 항목 준수

- token, password, service role key, FCM/Expo secret 저장 없음
- email/phone/raw user id를 ranking UI에 표시하지 않음
- 다른 사용자 cache를 fallback으로 표시하지 않음
- corrupt cache는 remove 후 null fallback
- DB/RPC/RLS/seed destructive 변경 없음

## 테스트

- `__tests__/homeRecordScheduleCache.test.ts`
- `__tests__/homeTitleBadge.test.ts`
- `__tests__/notificationRetentionPolicy.test.ts`
- `__tests__/activityRankingQuery.test.ts`
- `__tests__/activityRanking.test.ts`

## 판정

cache security는 release blocker 없음으로 판정한다. 오래된 home record/schedule cache는 3일 TTL로 제거되고, 계정 전환/로그아웃 시 home record/schedule cache는 전부 제거된다.

