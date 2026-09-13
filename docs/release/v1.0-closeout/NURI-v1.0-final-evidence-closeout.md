# NURI v1.0 Final Evidence Closeout

기준일: 2026-09-14 KST

## 1. Document Purpose

이 문서는 현재 NURI v1.0의 product, accepted release, QA, data safety, closed work와 remaining gate를 하나의 기준으로 정리한 canonical closeout evidence다. Pack03의 승인을 기록하지만 General Phase03, policy/legal gate, Final RC 또는 Store 상태를 완료로 승격하지 않는다.

## 2. Canonical Source

| 항목 | 값 |
| --- | --- |
| Accepted product source HEAD | `944c99961e3259307974e4982fc4776caf5fac1f` |
| Branch | `codex/task6-community-content-policy` |
| Origin match at acceptance | `YES` |
| Pack03 frozen | `YES` |
| Master recall | `COMPLETE` |

Documentation closeout commit은 위 product source 이후의 문서-only commit이다. release APK provenance는 계속 `944c999`를 가리킨다.

## 3. Accepted Release

| 항목 | 값 |
| --- | --- |
| APK | `nuri-944c999-pack03-qa-release.apk` |
| SHA-256 | `7e5bfba0e1494dfd1ee2d2589472e1854f7c08fc40826c525e17dc5ecdb85ccd` |
| Application ID | `com.nuri.app` |
| Version name / code | `1.0` / `1` |
| Build variant | `release` |
| Debuggable | `NO` |
| Cleartext | `NO` |
| JS bundle embedded | `YES` |
| Signature verify | `PASS` |
| Signer match | `YES` |
| Source HEAD match | `YES` |

Accepted release는 Pack03 QA artifact이며 Final RC는 아니다.

## 4. Program Completion Ledger

| Program | 상태 |
| --- | --- |
| TECH modernization | `COMPLETE` |
| Phase01 | `COMPLETE` |
| Phase02 | `COMPLETE` |
| Phase03 Pack01 | `COMPLETE` |
| Phase03 Pack02 | `COMPLETE_AS_PO_RESCOPED` |
| PrePack03 layout hardening | `COMPLETE` |
| Phase03 Pack03 | `COMPLETE` |
| General Phase03 | `IN_PROGRESS` |

## 5. Closed Product Defects / Improvements

### Navigation and More

- Schedule navigation defects: `CLOSED`
- More bottom overlap: `CLOSED`
- More information architecture: `CLOSED`
- More scroll restoration: `CLOSED`

### Keyboard and composer

- Timeline title/body IME: `CLOSED`
- Community title/body IME: `CLOSED`
- Timeline CTA keyboard gap: `CLOSED`
- Community CTA keyboard gap: `CLOSED`
- Timeline composer focus: `CLOSED`
- Community create/edit focus: `CLOSED`

### Home and layout

- Home Top Button ghost: `CLOSED`
- Activity/Achievement excessive blank: `CLOSED`
- PetManagement excessive blank: `CLOSED`

### Account, policy and modal

- Account Delete presentation: `CLOSED`
- Policy visual hierarchy: `CLOSED_FOR_VISUAL_SCOPE`
- User-facing modal review: `COMPLETE`, 52/52 invocations reviewed

### Community data compatibility

- Community composer pet fields: `REMOVED`
- Create payload for removed metadata: `PASS`, writes null
- Edit payload for historical metadata: `PASS`, preserves historical values
- Historical post read compatibility: `PASS`
- Database schema change: `NO`
- Historical data delete: `NO`

### Place/location and alarm

- Walk/Hospital hardening: `COMPLETE`
- Shared location/distance trust: `COMPLETE`
- Maps basic preview: `COMPLETE`
- Schedule alarm hardening: `COMPLETE`

Closed items use `DO_NOT_REOPEN_UNLESS_REGRESSION` unless a separate PO decision explicitly changes the contract.

## 6. Galaxy S24 Physical QA

| 항목 | 결과 |
| --- | --- |
| Device | Galaxy S24, `SM-S937N`, serial `R5CY613NMSY` |
| Update install | `PASS` |
| App data preserved | `YES` |
| Session preserved | `YES` |
| More | `PASS` |
| Account Delete | `PASS` |
| Policy | `PASS` |
| Home Top Button | `PASS` |
| Timeline | `PASS` |
| Community | `PASS` |
| Modal | `PASS` |
| Schedule | `PASS` |
| User Notifications | `PASS` |
| Fatal / ANR / RN fatal / Red Screen | `0 / 0 / 0 / 0` |

## 7. Automated Verification

| Gate | 결과 |
| --- | --- |
| Immutable install | `PASS` |
| TypeScript | `PASS` |
| ESLint | `PASS`, 0 errors |
| Jest | `PASS`, 105 suites / 582 tests |
| Test suppression | `NONE` |
| Android debug | `PASS` |
| Android release | `PASS` |
| R8 | `NOT_RUN_BY_CURRENT_RELEASE_CONFIG` |
| Lint Vital | `PASS` |

## 8. Data Safety

| 항목 | 결과 |
| --- | --- |
| Direct database mutation | `NONE` |
| Existing user data delete | `NO` |
| Existing user data modified | `NO` |
| Actual account delete | `NO` |
| QA fixture | `QA-PACK03-944C999` |
| QA fixture cleaned | `YES` |
| Uncleaned QA fixtures | `NONE` |

## 9. Evidence Manifest

Local runtime evidence root:

`/private/tmp/nuri-qa/post-upgrade-product-experience-20260913/phase03-pack03`

Verified primary evidence:

- Account Delete: `account-delete-more-entry.png`, `account-delete-step1-unchecked.png`, `account-delete-step1-guide-expanded.png`, `account-delete-step1-checked.png`, `account-delete-step2-keyboard.png`
- More: `more-final-top.png`, `more-final-middle.png`, `more-final-bottom.png`, `more-scroll-restore-header-back.mp4`, `more-scroll-restore-android-back.mp4`
- Policy: `policy-center-final.png`, `policy-detail-theme-heading.png`, `policy-detail-important-callout.png`, `policy-detail-bottom.png`
- Home: `home-top-button-show-hide.mp4`, `home-top-button-scroll-to-top.mp4`
- Composer: `composer-focus-timeline.mp4`, `composer-focus-community-944c999-final.mp4`, `composer-focus-community-edit-944c999-final.mp4`
- Community: `community-create-944c999.png`, `community-title-944c999.png`, `community-body-944c999.png`, `community-edit-944c999.png`, `community-edit-title-focus-944c999.png`, `community-edit-body-focus-944c999.png`
- Reports: `modal-ledger.txt`, `more-child-return-ledger.txt`, `policy-device-ledger.txt`, `final-report.txt`, `final-logcat-944c999.txt`
- Artifact: `nuri-944c999-pack03-qa-release.apk`, `package-after-944c999-install.txt`, `release-build-944c999.log`

이 root와 파일들은 local runtime evidence다. Git 영구 binary archive로 표현하지 않으며 이번 문서 commit에 복사하지 않는다.

## 10. Policy / Legal Status

| 항목 | 상태 |
| --- | --- |
| Policy presentation architecture | `PO_APPROVED` |
| Policy UI | `IMPLEMENTED` |
| Policy visual hierarchy | `CLOSED_FOR_VISUAL_SCOPE` |
| Policy content | `NOT_FINAL` |
| Legal text final approval | `NO` |
| Policy version final approval | `NO` |
| Effective date final approval | `NO` |
| Final legal release gate | `OPEN` |

## 11. Known Remaining Gates

- General Phase03: `IN_PROGRESS`
- PB020 PO visual acceptance: `PENDING`
- PB011: `WAITING_FOR_PB020_PO_ACCEPTANCE`
- Final full-domain E2E: `NOT_RUN`
- Final RC: `NOT_RUN`
- Store: `ON_HOLD_BY_PO`
- Global shared Top Button smooth scroll: `BACKLOG_NOT_IMPLEMENTED_AS_SHARED_BEHAVIOR`
- FastImage nonfatal event: `MONITORING_NON_BLOCKING`; current user-visible defect not established

## 12. v1.1 Forward Boundary

Self-owned POI/PostGIS 전환은 future approved direction이다. 구독/결제, Pet Travel, actual remote push, 고급 ranking 및 미래 운영 도구와 함께 v1.1 계획 문서로 유지한다. v1.0 accepted release closeout이나 Final RC 상태와 섞지 않는다.

## 13. Git / Protected Dirty

문서 closeout 시작 시 다음 6개 pre-existing dirty path가 존재했다.

- `docs/project-memory/다음-작업-우선순위.md`
- `docs/project-memory/최근-작업-로그.md`
- `docs/project-memory/현재-프로젝트-상태.md`
- `docs/리서치/리서치.md`
- `src/screens/Main/components/LoggedInHome/LoggedInHome.tsx`
- `supabase/.temp/cli-latest`

이 파일들은 documentation closeout에서 수정, 덮어쓰기 또는 stage하지 않는다. accepted Pack03 release에도 포함되지 않았다. 새 canonical 문서는 기존 dirty를 정리한다는 이유로 이 파일들을 변경하지 않는다.

## 14. Final Snapshot

```text
NURI_V1_CURRENT_HEAD:
944c99961e3259307974e4982fc4776caf5fac1f

ACCEPTED_RELEASE_SHA256:
7e5bfba0e1494dfd1ee2d2589472e1854f7c08fc40826c525e17dc5ecdb85ccd

TECH_MODERNIZATION:
COMPLETE

PHASE01:
COMPLETE

PHASE02:
COMPLETE

PHASE03_PACK01:
COMPLETE

PHASE03_PACK02:
COMPLETE_AS_PO_RESCOPED

PREPACK03_LAYOUT_HARDENING:
COMPLETE

PHASE03_PACK03:
COMPLETE

GENERAL_PHASE03:
IN_PROGRESS

POLICY_UI:
IMPLEMENTED

POLICY_CONTENT:
NOT_FINAL

FINAL_LEGAL_RELEASE_GATE:
OPEN

PB020_PO_VISUAL_ACCEPTANCE:
PENDING

PB011:
WAITING_FOR_PB020_PO_ACCEPTANCE

FINAL_RC:
NOT_RUN

STORE:
ON_HOLD_BY_PO

DEVICE_QA:
GALAXY_S24_PASS

FATAL_ANR_RN_FATAL_RED_SCREEN:
0/0/0/0

AUTO_START_NEXT_WORK:
NO

NEXT_OWNER:
MASTER
```
