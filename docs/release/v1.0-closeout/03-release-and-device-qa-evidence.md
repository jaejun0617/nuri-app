# NURI v1.0 Release and Device QA Evidence

기준일: 2026-09-14 KST

증적 성격: Pack03 accepted source-matched release QA

Final RC 여부: `NOT_RUN`

## Source

| 항목 | 결과 |
| --- | --- |
| Product source HEAD | `944c99961e3259307974e4982fc4776caf5fac1f` |
| Origin match at acceptance | `YES` |
| Branch | `codex/task6-community-content-policy` |
| Product source changed by documentation closeout | `NO` |

## Accepted release

| 항목 | 결과 |
| --- | --- |
| APK | `nuri-944c999-pack03-qa-release.apk` |
| SHA-256 | `7e5bfba0e1494dfd1ee2d2589472e1854f7c08fc40826c525e17dc5ecdb85ccd` |
| Application ID | `com.nuri.app` |
| Version name | `1.0` |
| Version code | `1` |
| Build variant | `release` |
| Debuggable | `NO` |
| Cleartext | `NO` |
| JS bundle embedded | `YES` |
| Signature verify | `PASS`, APK Signature Scheme v2 |
| Signer match | `YES` |
| Source HEAD match | `YES` |

이 artifact는 Pack03 accepted QA release다. Final RC와 Store artifact는 아직 생성 또는 승인되지 않았다.

## Automated and build verification

| Gate | 결과 |
| --- | --- |
| Immutable install | `PASS` |
| TypeScript | `PASS` |
| ESLint | `PASS`, errors `0`, pre-existing warnings `65` |
| Jest | `PASS`, 105 suites / 582 tests |
| Test suppression | `NONE` |
| Android debug build | `PASS`, 515 tasks |
| Android release build | `PASS`, 892 tasks |
| R8 | `NOT_RUN_BY_CURRENT_RELEASE_CONFIG` |
| Lint Vital | `PASS` |

R8은 현재 release 설정에서 실행되지 않았으므로 `PASS`로 승격하지 않는다.

## Galaxy S24 physical QA

| 항목 | 결과 |
| --- | --- |
| Device | Galaxy S24, `SM-S937N` |
| Serial | `R5CY613NMSY` |
| Update install | `PASS` |
| App data preserved | `YES` |
| Session preserved | `YES` |
| More | `PASS` |
| Account Delete | `PASS` |
| Policy | `PASS` |
| Home Top Button | `PASS` |
| Timeline | `PASS` |
| Community | `PASS` |
| User-facing modals | `PASS` |
| Schedule | `PASS` |
| User Notifications | `PASS` |

## Stability

```text
FATAL: 0
ANR: 0
RN_FATAL: 0
RED_SCREEN: 0
```

## Data safety

| 항목 | 결과 |
| --- | --- |
| Direct database mutation | `NONE` |
| Existing user data deleted | `NO` |
| Existing user data modified | `NO` |
| Actual account delete | `NO` |
| QA fixture | `QA-PACK03-944C999`, one Community post |
| QA fixture cleanup | `PASS`, removed through normal UI and absent on fresh query |
| Uncleaned QA fixtures | `NONE` |

## Evidence location

Runtime/local evidence root:

`/private/tmp/nuri-qa/post-upgrade-product-experience-20260913/phase03-pack03`

이 경로는 로컬 runtime 증적 위치다. Git에 영구 보존된 binary archive가 아니다. APK, MP4, screenshot 및 build log는 이번 documentation commit에 복사하지 않는다.

## Verified evidence manifest

아래 파일은 2026-09-14 closeout audit에서 실제 존재를 확인했다.

### Account Delete

- `account-delete-more-entry.png`
- `account-delete-step1-unchecked.png`
- `account-delete-step1-guide-expanded.png`
- `account-delete-step1-checked.png`
- `account-delete-step2-keyboard.png`
- `final-account-delete-step1-944c999.png`

### More

- `more-final-top.png`
- `more-final-middle.png`
- `more-final-bottom.png`
- `more-scroll-restore-header-back.mp4`
- `more-scroll-restore-android-back.mp4`
- `more-child-return-ledger.txt`

### Policy

- `policy-center-final.png`
- `policy-detail-theme-heading.png`
- `policy-detail-important-callout.png`
- `policy-detail-bottom.png`
- `policy-device-ledger.txt`

### Home

- `home-top-button-show-hide.mp4`
- `home-top-button-scroll-to-top.mp4`
- `final-home-944c999.png`

### Composer

- `composer-focus-timeline.mp4`
- `composer-focus-community-944c999-final.mp4`
- `composer-focus-community-edit-944c999-final.mp4`

### Community

- `community-create-944c999.png`
- `community-title-944c999.png`
- `community-body-944c999.png`
- `community-edit-944c999.png`
- `community-edit-title-focus-944c999.png`
- `community-edit-body-focus-944c999.png`

### Modal and final reports

- `modal-ledger.txt`
- `final-report.txt`
- `final-logcat-944c999.txt`
- `release-build-944c999.log`
- `package-after-944c999-install.txt`

## Evidence interpretation

- Screenshot는 정지 UI 상태 증적이다.
- MP4는 show/hide, scroll restoration, focus 전환의 연속 증적이다.
- XML과 ledger는 UI 구조 및 검수 대상 수를 보조한다.
- APK hash와 package report는 설치 artifact identity를 고정한다.
- 이 evidence는 Pack03 acceptance를 뒷받침하지만 아직 실행하지 않은 Final RC 또는 Store gate를 대신하지 않는다.
