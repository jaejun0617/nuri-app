# NURI Approved Community Release Closeout

2026-10-09 KST. PO 최종 승인 뒤 추가로 요청한 빌드·설치·커밋·푸시 작업이다. 최신 커뮤니티와 앞서 최종 승인된 전체메뉴 소스, 관련 테스트·서버 migration 이력을 선별했다. 오래된 문서 정리, 미사용 디자인 원본, 무관한 dirty는 제외하고 보존했다.

## Source and Validation

- Source commit: `7eafa38a69577fa63b9abcfa5c46b725823bafa7`
- Branch / push destination: `codex/task6-community-content-policy`
- 마지막 위 화살표 변경을 포함한 전체 테스트: **200 suites / 2,069 tests PASS**.
- TypeScript PASS. 변경된 52개 TS/TSX 파일 ESLint 오류 0, 기존 no-shadow 경고 7.
- 선택한 commit의 `git diff --cached --check` PASS. 전체 작업 트리에는 이전 migration·QA log의 EOF 공백 문제가 남아 있으며 이번에 수정하지 않았다.
- 모든 상대 runtime import가 tracked 파일 또는 명시적 client config로 연결됨을 확인했다. runtime 입력 697개가 build 전후 동일하며, 앱 소스는 위 커밋과 일치한다.

## Build and Artifact

`assembleRelease bundleRelease --no-daemon --console plain` 증분 실행 1회. 2분 34초, 1,004 tasks 중 66 실행·938 up-to-date. clean 없음.

| Item | Result |
| --- | --- |
| APK SHA-256 | `5d48cb860607819285b1685e4bcbf9f1cd34f1336c411c81f5dc5e673f581368` |
| Package | `com.nuri.app` |
| Version | 1.0 / 1 |
| Signature / signer match | PASS |
| Debuggable / cleartext traffic | false / false |
| Embedded JS bundle | YES |
| Metro dependency | NONE |
| Store authorization | HOLD |

APK: `/private/tmp/nuri-community-approved-release-W5PwbM/nuri-7eafa38-approved-release.apk`

AAB: `/private/tmp/nuri-community-approved-release-W5PwbM/nuri-7eafa38-approved-release.aab`

QA Release이며 clean-checkout Store provenance gate를 통과한 Store RC로 주장하지 않는다. unrelated dirty는 빌드 작업 트리에 남아 있고 runtime 입력 일치는 별도로 확인했다. AAB는 보존했으며 별도 Store 서명 검증·업로드는 수행하지 않았다. Gradle deprecated API와 기존 React Native featureflags exports 경고는 유지한다.

## Install and Preservation

- Galaxy S24 `SM-S937N / R5CY613NMSY`, install-r **1회 Success**. 설치 APK SHA-256 일치.
- UID `10402`, 최초 설치 `2026-06-02 19:16:57` 유지. 최종 업데이트 `2026-10-09 04:26:38`.
- 1080x2340, density 450, fontScale 1.0, three-button navigation 유지.
- uninstall, clear data, logout, 앱 화면 조작, 콘텐츠 작성·삭제 없음. 로그인·선택 펫의 실제 화면 확인은 하지 않았으며 설치 metadata 보존과 구분한다.
- baseline 1,814개 파일 누락·내용 변경 0(build 종료 시점). protected config/signing 3개 hash 동일. 이후 변경은 이 보고서와 상태 문서의 closeout 기록뿐이다.
- 이번 remote DB 작업·cleanup·추가 구현 0. 기존 운영 반영은 이전 보고서의 증거를 유지한다.
- Metro OFF. Fast Refresh를 위해 서버를 재시작하지 않는다. 승인된 JS가 이번 Release 내장 bundle에 포함됐다.

## Evidence and Next State

작은 검증 metadata는 [release-result.json](nuri-community-approved-release-2026-10-09-evidence/release-result.json)에 보존한다. 전체 테스트·타입·lint·빌드·설치 로그와 APK/AAB는 위 `/private/tmp/nuri-community-approved-release-W5PwbM/`에 유지한다. APK/AAB 및 개인정보·서명 입력을 Git에 추가하지 않았다.

PO_FINAL_APPROVAL: ACCEPTED

BUILD_INSTALL: COMPLETE

SOURCE_COMMIT: COMPLETE

SOURCE_PUSH: COMPLETE (`7eafa38`, current branch). This documentation receipt is published separately without another build.

NATIVE_SCREEN_QA_THIS_TURN: NOT_RUN

STORE: HOLD

AUTO_START_NEXT_WORK: NO

DEVICE_OWNER: PO
