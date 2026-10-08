# NURI 커뮤니티 후보 안전 정리 및 Release 설치

## 1. 승인과 결과

2026-10-09 KST. PO의 "쓸데 없는 산출물 캐시 제거 후 빌드설치" 지시에 따라 재생성 가능한 캐시 3곳만 정리하고 증분 Release 빌드 1회, Galaxy S24 install-r 1회를 완료했다. 앱 소스·테스트·DB 변경과 커밋·푸시는 없다. 화면 확인은 PO가 직접 수행한다.

이번 설치에는 [글등록 리디자인·사진 5장](nuri-community-create-redesign-2026-10-09.md)과 [읽은 글 제목·댓글 밀도](nuri-community-read-title-compact-comments-2026-10-09.md)의 기존 로컬 변경이 포함된다. 두 보고서의 미설치 표기는 당시 이력이며 설치 상태는 이 보고서가 갱신한다. 구현 승인과 물리 화면 검증은 별개다.

## 2. 안전 정리

각 경로의 realpath 일치, 사용자 UID 501 소유, 하위 symlink 없음, 재생성 가능성, 열린 파일 없음과 active Java/Gradle 없음 확인 후 삭제했다. 삭제 전후는 동일한 `df -k /Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri`, APFS `/dev/disk3s5`, `/System/Volumes/Data` 기준이다. 시스템 볼륨을 조작한 것은 아니다.

| 측정 | 값 |
| --- | ---: |
| DISK_TOTAL | 239,362,496 KiB |
| DISK_USED_BEFORE | 178,256,088 KiB |
| DISK_FREE_BEFORE | 18.283 GiB |
| DISK_FREE_AFTER_CLEANUP | 30.122 GiB |
| OBSERVED_RECLAIMED | 11.839 GiB |
| ALLOCATED_DELETED_TOTAL | 11.833 GiB |
| DISK_FREE_AFTER_BUILD_INSTALL | 28.748 GiB |

| 삭제 경로 | 종류 | allocated KiB | 근거 |
| --- | --- | ---: | --- |
| `/private/tmp/nuri-community-category-footer-corrective-20261007-022032/build-temp` | 과거 task 캐시 | 91,976 | Jest·Metro·Node 재생성 캐시만 존재 |
| `/private/tmp/nuri-timeline-memory-detail-20261007-001213/build-temp` | 과거 task 캐시 | 65,908 | Jest·Metro·Node 재생성 캐시만 존재 |
| `/Users/shinjaejun/.gradle/caches/build-cache-1` | Gradle build result cache | 12,249,756 | 의존성·wrapper와 분리된 결과 캐시 |

삭제 대상 allocated 합계와 APFS 실제 가용 공간 변화는 별개다. 관측 delta는 같은 명령·볼륨의 삭제 직전/직후 차이이며, 동시 시스템 사용량의 미세한 변화가 포함될 수 있다. 빌드와 새 APK/AAB 보존 후 공간은 별도로 표시했다. 40GiB 확보를 위해 불확실한 산출물을 추가 삭제하지 않았다.

보존: `android/app/build`, `android/app/.cxx`, `android/build`, `android/.gradle`, 전역 Gradle `modules-2`·wrapper, Android SDK/NDK/CMake, Node/Java/Yarn, node_modules, production source/assets, 서명·config, 이전/current APK/AAB, QA reports/evidence. 다른 대형 `nuri-*` 루트는 QA·rollback 산출물이 있어 삭제하지 않았다. 소유권/사용 목적이 불확실한 `/private/tmp/nuri-android-release-4zfm22`도 유지했다. 개인 파일·Codex 데이터·시스템 관리 데이터는 건드리지 않았다.

## 3. 검증과 빌드

- 직전 글등록 후보의 source/test fingerprint와 현재 앱 입력 파일이 일치한다. 서버 migration은 앱 빌드 입력이 아니며 이번 baseline으로 별도 보존했다.
- 기존 TypeScript PASS, ESLint 7파일 오류·경고 0, 대상 6 suites/33 tests, 전체 198 suites/2,031 tests PASS 결과를 재사용했다. 이번 테스트 재실행 0회다.
- `assembleRelease bundleRelease --no-daemon --console plain` 단일 실행, 2026-10-09 02:14:21~02:17:34 KST, exit 0. clean build 없음.
- APK 서명/승인 signer, package `com.nuri.app`, non-debuggable, cleartext 비허용, 내장 JS bundle, source HEAD 검사 PASS. 빌드 중 소스 변경 0.
- 기존 Android Gradle deprecated API, Watchman recrawl, React Native featureflags package export 경고가 있다. 빌드 오류는 없으며 이 작업에서 dependency/native 수정으로 확대하지 않았다.

| 산출물 | SHA-256 | bytes |
| --- | --- | ---: |
| APK | `5c9f9cca22cb4bcd7d0fe536e403efe23556cf6196def7604571b7b0a86f5758` | 282,084,200 |
| AAB | `4c9415bd85da57d4d5a2c2e8bb6688b2bc797edd510983c36cf52c22324234cc` | 247,442,412 |

APK: `/private/tmp/nuri-community-create-install-buVMQaDd/nuri-community-create-release.apk`

AAB: `/private/tmp/nuri-community-create-install-buVMQaDd/nuri-community-create-release.aab`

Release variant의 미커밋 QA 후보이며 Store RC 승인으로 간주하지 않는다.

## 4. 설치와 보존

| 항목 | 결과 |
| --- | --- |
| Device | Galaxy S24, SM-S937N, R5CY613NMSY, Android 16 |
| versionName / versionCode | 1.0 / 1 |
| Install | `adb install -r` 1회, Success |
| Installed SHA match | PASS |
| UID | 10402, 동일 |
| 최초 설치 시각 | 2026-06-02 19:16:57, 동일 |
| 마지막 업데이트 | 2026-10-09 02:18:10 |
| 화면·설정 | 1080x2340, density 450, fontScale 1.0, navigation_mode 0, 모두 동일 |
| 앱 UI 조작 | 0 |
| 로그인·펫 화면 확인 | 미실행. install-r로 data 유지, UID/최초 시각 보존과 실제 로그인 관찰은 구분 |
| Source/test delta | 0 |
| 기존 tracked/untracked 파일 누락 | 0 |
| protected config/signing/이전 APK·AAB hash 변경 | 0 |

실제 5장 업로드, 사진 picker 왕복, 새 화면의 키보드·확대 글꼴·시각 QA는 미실행이며 기존 로컬 검증을 실기기 PASS로 확대하지 않는다. 다음 작업은 PO가 설치된 후보를 직접 확인하는 것이다.

## 5. 증거와 최종 상태

전체 로그·baseline·APK/AAB는 `/private/tmp/nuri-community-create-install-buVMQaDd/`에 보존한다. 작은 장기 metadata는 [설치](nuri-community-create-install-2026-10-09-evidence/install-result.json), [빌드](nuri-community-create-install-2026-10-09-evidence/build-result.json), [정리](nuri-community-create-install-2026-10-09-evidence/cleanup-result.json), [보존](nuri-community-create-install-2026-10-09-evidence/preservation.json)에 보관한다. 대형 binary를 repository에 복제하지 않는다.

BRANCH: `codex/task6-community-content-policy`

HEAD: `e49356c14f731599d0a428c52fff368aa997ce18`

STATUS: INSTALLED_PENDING_PO_REVIEW

BUILD_COUNT: 1

INSTALL_COUNT: 1

STAGED: NONE

COMMIT: NO

PUSH: NO

DIRECT_DB_MUTATION: 0

NATIVE_SCREEN_QA: PO_DIRECT_PENDING

STORE: HOLD

DEVICE_OWNER: PO

AUTO_START_NEXT_WORK: NO

PO 승인을 기다립니다.
