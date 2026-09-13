# NURI v1.0 Current Product State

기준일: 2026-09-14 KST

제품 source 기준: `944c99961e3259307974e4982fc4776caf5fac1f`

## 문서 지위

이 문서는 현재 NURI v1.0 제품 상태에 대한 canonical answer다. 과거 진행 보고서나 project-memory의 상태 값이 이 문서와 다르면 과거 기록으로 해석한다. 제품 동작의 최종 사실은 실제 source, linked runtime, release artifact와 QA 증적을 함께 확인한다.

문서 closeout commit은 제품 source를 바꾸지 않는다. 검증된 APK의 source 기준은 계속 `944c99961e3259307974e4982fc4776caf5fac1f`다.

## 제품 및 release 기준

| 항목 | 현재 상태 |
| --- | --- |
| Product | NURI v1.0 |
| Android package | `com.nuri.app` |
| Current canonical product head | `944c99961e3259307974e4982fc4776caf5fac1f` |
| Accepted Pack03 APK | `nuri-944c999-pack03-qa-release.apk` |
| Accepted Pack03 SHA-256 | `7e5bfba0e1494dfd1ee2d2589472e1854f7c08fc40826c525e17dc5ecdb85ccd` |
| Accepted device | Galaxy S24, `SM-S937N`, `R5CY613NMSY` |
| Final RC | `NOT_RUN` |
| Store | `ON_HOLD_BY_PO` |

Accepted Pack03 APK는 Pack03 source-matched release QA artifact다. `FINAL_RC: NOT_RUN`이므로 이를 최종 스토어 RC로 부르지 않는다.

## 기술 기준

| 항목 | 상태 |
| --- | --- |
| React Native | `0.87.1` |
| React | `19.2.3` |
| New Architecture | Enabled |
| Fabric | Enabled |
| Hermes | Enabled |
| Technical modernization | `COMPLETE` |

## Social Auth

| Provider | 상태 |
| --- | --- |
| Google | `ON` |
| Kakao | `ON` |
| Naver | `REMOVED` |
| Apple | `OFF` |

## 프로그램 상태

| 단계 | 상태 |
| --- | --- |
| TECH modernization | `COMPLETE` |
| Phase01 policy audit | `COMPLETE` |
| Phase02 product experience audit | `COMPLETE` |
| Phase03 Pack01 | `COMPLETE` |
| Phase03 Pack02 | `COMPLETE_AS_PO_RESCOPED` |
| PrePack03 layout hardening | `COMPLETE` |
| Phase03 Pack03 | `COMPLETE` |
| General Phase03 | `IN_PROGRESS` |
| Final full-domain E2E | `NOT_RUN` |
| Final RC | `NOT_RUN` |
| Store | `ON_HOLD_BY_PO` |

Pack03 완료는 General Phase03 완료를 뜻하지 않는다.

## Pack03에서 동결된 상태

- Account Delete presentation: `CLOSED`
- More information architecture: `CLOSED`
- More scroll restoration: `CLOSED`
- Policy visual hierarchy: `CLOSED_FOR_VISUAL_SCOPE`
- User-facing modal review: `COMPLETE`
- Home Top Button ghost: `CLOSED`
- Timeline composer focus: `CLOSED`
- Community composer focus: `CLOSED`
- Community composer pet fields: `REMOVED`
- Community historical metadata compatibility: `PRESERVED`
- PrePack03 layout density/keyboard spacing hardening: `COMPLETE`

이 항목들은 새 회귀 증거가 없는 한 재조사하거나 재설계하지 않는다.

## 정책 상태

| 항목 | 상태 |
| --- | --- |
| Policy presentation architecture | `PO_APPROVED` |
| Policy UI | `IMPLEMENTED` |
| Policy visual hierarchy | `CLOSED_FOR_VISUAL_SCOPE` |
| Policy canonical body | `NOT_FINAL` |
| Legal text final approval | `NO` |
| Policy version final approval | `NO` |
| Effective date final approval | `NO` |
| Final legal release gate | `OPEN` |

정책 UI 구현과 정책 내용의 법적 확정은 별개다. 현재 정책 문서 본문을 최종 승인된 법률 문안으로 표현하지 않는다.

## v1.1 경계

자체 POI/PostGIS 및 운영 검수 기반 전환은 승인된 미래 방향이다. 이 방향은 v1.1 계획으로 유지하며 v1.0 accepted release나 남은 v1.0 gate와 섞지 않는다. 구독, 결제, 추가 provider, 고급 ranking 및 기타 미래 기능도 별도 승인 전까지 현재 v1.0 범위가 아니다.

## 다음 판단 기준

현재 자동으로 시작할 구현 작업은 없다. 남은 gate와 실행 조건은 [04-open-gates-and-remaining-work.md](04-open-gates-and-remaining-work.md)를 따른다.
