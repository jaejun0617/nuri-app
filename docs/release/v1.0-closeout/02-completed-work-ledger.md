# NURI v1.0 Completed Work Ledger

기준일: 2026-09-14 KST

현재 승인 기준 product head: `944c99961e3259307974e4982fc4776caf5fac1f`

## 사용 원칙

이 문서는 완료되어 동결된 작업을 반복 조사하거나 임의로 다시 구현하는 일을 막기 위한 ledger다. 모든 항목의 기본 재개 조건은 `DO_NOT_REOPEN_UNLESS_REGRESSION`이다. 새로운 재현 증거, 계약 변경 또는 PO의 명시적 재개 승인 없이는 닫힌 항목을 열지 않는다.

## 프로그램 완료 이력

| 범위 | 상태 | 기준 | 재개 규칙 |
| --- | --- | --- | --- |
| TECH modernization | `COMPLETE` | RN 0.87.1 modernization closeout, `65c4a865e1e8a75d6c318fca445df12a0b363b4e` | `DO_NOT_REOPEN_UNLESS_REGRESSION` |
| Phase01 policy audit | `COMPLETE` | Policy architecture approved; content approval remains separate | `DO_NOT_REOPEN_UNLESS_REGRESSION` |
| Phase02 product experience audit | `COMPLETE` | PO-accepted Phase02 closeout | `DO_NOT_REOPEN_UNLESS_REGRESSION` |
| Phase03 Pack01 | `COMPLETE` | Accepted before Pack03; status reconfirmed at `944c999` | `DO_NOT_REOPEN_UNLESS_REGRESSION` |
| Phase03 Pack02 | `COMPLETE_AS_PO_RESCOPED` | PO-rescoped acceptance; status reconfirmed at `944c999` | `DO_NOT_REOPEN_UNLESS_REGRESSION` |
| PrePack03 hardening | `COMPLETE` | Pack03 final report | `DO_NOT_REOPEN_UNLESS_REGRESSION` |
| Phase03 Pack03 | `COMPLETE` | `f1ee654`, `944c999` | `DO_NOT_REOPEN_UNLESS_REGRESSION` |

General Phase03는 `IN_PROGRESS`다. 위 package 완료 상태를 General Phase03 전체 완료로 확대 해석하지 않는다.

## Pack01 완료 항목

| 항목 | 상태 | 기준 | 재개 규칙 |
| --- | --- | --- | --- |
| Schedule navigation defects | `CLOSED` | Phase03 Pack01 | `DO_NOT_REOPEN_UNLESS_REGRESSION` |
| Timeline title/body IME | `CLOSED` | Phase03 Pack01 | `DO_NOT_REOPEN_UNLESS_REGRESSION` |
| Community title/body IME | `CLOSED` | Phase03 Pack01 | `DO_NOT_REOPEN_UNLESS_REGRESSION` |
| More bottom overlap | `CLOSED` | Phase03 Pack01 | `DO_NOT_REOPEN_UNLESS_REGRESSION` |

## Place, location and alarm

| 항목 | 상태 | 기준 | 재개 규칙 |
| --- | --- | --- | --- |
| Walk/Hospital hardening | `COMPLETE` | Post-upgrade corrective work accepted before Pack03 | `DO_NOT_REOPEN_UNLESS_REGRESSION` |
| Shared location/distance trust | `COMPLETE` | Candidate/Trust/User boundary preserved | `DO_NOT_REOPEN_UNLESS_REGRESSION` |
| Maps basic preview | `COMPLETE` | Current v1.0 presentation contract | `DO_NOT_REOPEN_UNLESS_REGRESSION` |
| Schedule alarm hardening | `COMPLETE` | Device alarm, stop action and memo presentation verified | `DO_NOT_REOPEN_UNLESS_REGRESSION` |

자체 POI 전환은 v1.1 미래 범위이며 위 v1.0 완료 항목을 재개하는 근거가 아니다.

## PrePack03 완료 항목

| 항목 | 상태 | 기준 | 재개 규칙 |
| --- | --- | --- | --- |
| Timeline CTA keyboard gap | `CLOSED` | PrePack03 layout hardening | `DO_NOT_REOPEN_UNLESS_REGRESSION` |
| Community CTA keyboard gap | `CLOSED` | PrePack03 layout hardening | `DO_NOT_REOPEN_UNLESS_REGRESSION` |
| Activity/Achievement excessive blank | `CLOSED` | PrePack03 layout hardening | `DO_NOT_REOPEN_UNLESS_REGRESSION` |
| PetManagement excessive blank | `CLOSED` | PrePack03 layout hardening | `DO_NOT_REOPEN_UNLESS_REGRESSION` |

## Pack03 완료 항목

| 항목 | 상태 | 기준 | 재개 규칙 |
| --- | --- | --- | --- |
| Account Delete presentation | `CLOSED` | Pack03 `944c999` | `DO_NOT_REOPEN_UNLESS_REGRESSION` |
| More information architecture | `CLOSED` | Pack03 `944c999` | `DO_NOT_REOPEN_UNLESS_REGRESSION` |
| More scroll restoration | `CLOSED` | Pack03 `944c999` | `DO_NOT_REOPEN_UNLESS_REGRESSION` |
| Policy visual hierarchy | `CLOSED_FOR_VISUAL_SCOPE` | Pack03 `944c999` | Reopen only for visual regression; content remains a separate open gate |
| User-facing modal review | `COMPLETE` | 52/52 invocation review, Pack03 `944c999` | `DO_NOT_REOPEN_UNLESS_REGRESSION` |
| N03-P2-HOME-TOP-BUTTON-GHOST-001 | `CLOSED` | Pack03 `944c999` | `DO_NOT_REOPEN_UNLESS_REGRESSION` |
| Timeline composer focus | `CLOSED` | Pack03 `944c999` | `DO_NOT_REOPEN_UNLESS_REGRESSION` |
| Community composer focus | `CLOSED` | Pack03 `944c999` | `DO_NOT_REOPEN_UNLESS_REGRESSION` |
| Community composer pet fields | `REMOVED` | Pack03 `944c999` | Do not restore without a new product decision |
| Community historical compatibility | `PRESERVED` | Pack03 `944c999` | Historical metadata must remain readable |

## Pack03 acceptance

```text
PACK03: ACCEPTED
PACK03_PRODUCT_HEAD: 944c99961e3259307974e4982fc4776caf5fac1f
PACK03_FROZEN: YES
MASTER_RECALL: COMPLETE
GENERAL_PHASE03: IN_PROGRESS
```
