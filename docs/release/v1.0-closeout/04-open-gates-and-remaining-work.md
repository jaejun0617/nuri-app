# NURI v1.0 Open Gates and Remaining Work

기준일: 2026-09-14 KST

기준 product head: `944c99961e3259307974e4982fc4776caf5fac1f`

## 현재 open gate

| 항목 | 현재 상태 | 종료 조건 | 자동 시작 |
| --- | --- | --- | --- |
| General Phase03 | `IN_PROGRESS` | PO가 승인한 남은 product scope 완료 및 검증 | `NO` |
| Policy canonical body | `NOT_FINAL` | PO/legal content reconciliation 및 최종 승인 | `NO` |
| Legal text final approval | `NO` | 승인된 최종 문안 | `NO` |
| Policy version final approval | `NO` | 승인된 version 값 | `NO` |
| Effective date final approval | `NO` | 승인된 시행일 | `NO` |
| Final legal release gate | `OPEN` | 본문, version, 시행일 및 공개 runtime 검증 완료 | `NO` |
| PB020 PO visual acceptance | `PENDING` | PO visual acceptance | `NO` |
| PB011 | `WAITING_FOR_PB020_PO_ACCEPTANCE` | PB020 승인 뒤 별도 판정 | `NO` |
| Final full-domain E2E | `NOT_RUN` | accepted final candidate의 전 도메인 E2E | `NO` |
| Final RC | `NOT_RUN` | 별도 승인된 source-matched RC build 및 release gate | `NO` |
| Store | `ON_HOLD_BY_PO` | PO release 승인 및 제출 준비 | `NO` |

## Product backlog 경계

### Global Top Button smooth scroll

```text
GLOBAL_TOP_BUTTON_SMOOTH_SCROLL: BACKLOG_NOT_IMPLEMENTED_AS_SHARED_BEHAVIOR
HOME_TOP_BUTTON_GHOST: CLOSED
HOME_TOP_BUTTON_SCROLL_TO_TOP: PASS
```

Pack03는 Home의 ghost/show/hide/scroll-to-top을 닫았다. 앱 전체 도메인을 포괄하는 shared smooth-scroll 동작은 승인된 완료 범위가 아니며 General Phase03의 별도 backlog로 남긴다. 이를 이유로 Home Pack03 항목을 재개하지 않는다.

### FastImage nonfatal event

```text
FASTIMAGE_NONFATAL: MONITORING_NON_BLOCKING
CURRENT_PACK03_USER_VISIBLE_DEFECT: NOT_ESTABLISHED
```

과거 RN New Architecture interop `Unhandled SoftException`은 비치명 event로 기록되어 있다. Pack03 최종 stability 결과는 fatal/ANR/RN fatal/red screen 모두 0이며, 현재 사용자 영향이 확인된 defect는 없다. 새 runtime 재현과 route attribution 전에는 dependency 변경이나 defect 승격을 하지 않는다.

## Policy/legal 남은 결정

- Canonical policy body reconciliation
- Account deletion 7-day description drift reconciliation
- Marketing publication/withdrawal wording decision
- OAuth consent evidence decision
- Provider retention/processor disclosure review
- Public policy version/effective date alignment
- Current public URL/runtime verification
- Scheduler runtime evidence where legally relevant

Policy UI와 visual hierarchy는 구현되어 있다. 이 목록은 content/legal gate이며 UI 완료 상태를 취소하지 않는다.

## v1.1 future boundary

자체 POI/PostGIS 및 self-owned POI 전환은 미래 milestone이다. 구독/결제, Pet Travel, actual remote push, 고급 ranking, 추가 운영 도구도 관련 계획 문서에 남아 있으나 현재 v1.0 Final RC를 자동으로 시작하거나 막는 task로 승격하지 않는다.

## 다음 실행 규칙

1. 이 문서 closeout 뒤 자동 구현을 시작하지 않는다.
2. General Phase03, policy/legal, Final E2E, Final RC, Store는 각각 별도 PO 승인으로 시작한다.
3. 닫힌 Pack03 항목은 회귀 증거 없이 재개하지 않는다.
4. Final RC를 실행하기 전 accepted Pack03 artifact와 새 candidate를 혼동하지 않는다.

```text
AUTO_START_NEXT_WORK: NO
NEXT_OWNER: MASTER
```
