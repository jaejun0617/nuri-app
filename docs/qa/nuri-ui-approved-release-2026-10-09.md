# NURI 소셜 로그인과 계절 UI 최종 승인 Release 보고서

## 결과

PO의 `좋아 최종승인한다`를 앞선 빌드·설치·커밋·푸시·동결 지시에 연결해 실행했다. 승인된 디자인과 시작 오류 수정은 FINAL_APPROVED이며, source `f6d284d70268977c24d447601441b00f81ba3734`의 Release 빌드와 Galaxy S24 덮어 설치를 각각 1회 완료했다. 해당 source는 `origin/codex/task6-community-content-policy`에 푸시했다.

이번 동결은 승인된 구현과 전달 후보에 한정한다. Store 승인, 전체 기능의 새 native PASS, 미확인 잔상의 기술적 종결을 뜻하지 않는다. 기존 정확한 검증 경계와 OPEN은 유지한다.

## 승인 범위

- 4계절 로그인·스플래시, 공식 Google/Kakao 로고, 공개 이메일 가입 화면과 진입 제거. 기존 OAuth·온보딩·정책·복구 흐름 보존.
- 은은한 공통 계절 배경, 가이드 목록·상세, Home·전체메뉴 glass, 펫 identity와 중립 UI 색상 분리.
- 기록 생성·수정의 compact 칩·계절 header, 의료 기록 상세와 기존 지출 총액 연결, 체중 그래프, paging 정렬, 종료·로그아웃 CTA.
- 실제 펫 이름 및 조사, 계절 마커, 전체메뉴 블러 촬영 경계, 시작 시 native view 중복 등록 수정.
- 소스·테스트·활성 자산 137개를 선별 커밋했다. 기존 미사용 이미지와 디자인 원본, 무관한 문서 정리·SQL 공백 변경은 제외하고 보존했다.

관련 구현과 이전 증거는 [로그인·스플래시](nuri-social-login-2026-10-09.md), [UI 및 의료 기록](nuri-ui-polish-medical-records-2026-10-09.md), [후속 UI와 시작 오류](nuri-ui-followup-2026-10-09.md)가 소유한다. 이번 전달 단계에서는 앱 소스를 추가 수정하거나 과거 계정 삭제를 재실행하지 않았다.

## 마지막 로컬 검증

| 항목 | 결과 |
| --- | --- |
| TypeScript | PASS |
| 수정 범위 ESLint | 123개 파일, 오류 0, 기존 no-shadow 경고 30, 새 경고 0 |
| 전체 테스트 | 210 suites / 2,191 tests PASS, 전달 단계 1회 실행 |
| source와 stage diff check | PASS |
| 상대 경로 의존성 | 누락·미추적 필수 입력 없음, 기존 보호 config 명시 |
| Node / Yarn / Java | 24.20.0 / 3.6.4 / 기존 JDK 17 |
| 빌드 입력 | runtime·native·보호 설정 723개, 빌드 전후 변경 0 |
| 기존 작업 파일 | 문서 갱신 전 baseline 1,885개 상태 동일 |

lint 경고는 이전 HEAD의 같은 파일을 검사해 메시지의 줄 번호를 제외하고 비교했다. 저장소 전체에는 이전 lint 로그와 SQL migration의 EOF 공백이 남아 있으며 이번 커밋에서는 제외했다.

## Release와 설치

| 항목 | 실제 결과 |
| --- | --- |
| Build | 증분 `assembleRelease bundleRelease` 1회 성공, 2분 38초 |
| Gradle | 1,004 tasks: 71 executed, 933 up-to-date |
| Install | `adb install -r` 1회 성공 |
| Package | `com.nuri.app` |
| Version | versionName `1.0`, versionCode `1` |
| APK | `nuri-f6d284d-approved-release.apk`, 293,990,054 bytes |
| APK SHA-256 | `ccf759ca28c51aa7b034b49b2511037840203c22da37c6fd42937c28b674f98b` |
| AAB SHA-256 | `ae930830903c8068fd9da6c169d113af1117c90d5d2f2e36099b7cb00131e729` |
| Installed match | PASS, 기기 APK SHA-256과 동일 |
| Signer | `08efb41ea4729792ce9fc3d242be9704e84a8ea3eadcbbcf1c8426884db689d3`, 기존 설치 앱과 동일 |
| Artifact verifier | ACCEPTED, release, debuggable false, cleartext false, embedded JS YES |
| Device | SM-S937N / R5CY613NMSY |
| UID | `10402`, 유지 |
| First install | `2026-06-02 19:16:57`, 유지 |
| Last update | `2026-10-09 23:05:24` |
| Display | 1080×2340, density 450, fontScale 1.0, three-button 유지 |

APK/AAB와 원시 로그는 `/private/tmp/nuri-ui-approved-release-IIRKj1/` 및 기존 Android build output에 보존한다. 저장소에는 [전달 메타데이터](nuri-ui-approved-release-2026-10-09-evidence/release-result.json)를 보존하며 APK·개인 화면·비밀 설정 원문을 커밋하지 않는다. 임시 디렉터리의 영구 보존은 보장하지 않는다.

무관한 dirty를 보존해야 하므로 기존 QA 전달 방식대로 committed runtime을 해시로 고정하고 증분 빌드했다. clean-checkout Store provenance를 충족했다고 주장하지 않는다. 일반 Store preflight의 dirty guard를 수정하거나 완화하지 않았다.

## 보존과 검증 경계

- 앱 삭제·데이터 초기화·로그아웃·설정 변경·직접 DB mutation·remote 정책 변경·cleanup은 0이다. 같은 앱 ID/서명/UID로 덮어 설치했다. 로그인·선택 펫 데이터에 직접 접근하거나 변경하지 않았다.
- 설치 후 화면을 자동 실행하지 않았다. 따라서 설치 후 실제 로그인 상태·선택 펫 표시·새 의료 필드 저장은 이번 전달의 별도 native 증거가 없다. UID 보존을 데이터별 내용 검증으로 확대하지 않는다.
- 빨간 시작 오류는 직전 개발 후보에서 Android 실제 registry 회귀 검사와 S24 Home 복구를 확인했다. 이번 Release에서는 정적 artifact 검증과 설치 일치를 확인했으며 새 런타임 무오류 검사를 수행한 것은 아니다.
- HQA-01 탭 offset은 기존 OPEN이다. HQA-02 작은 체중 변화는 로컬 보완 완료/native close 미확인이다. 일반 계정 탈퇴의 FK/불변 trigger 충돌도 별도 OPEN이다.
- 전체메뉴 스크롤·불특정 화면에서 Home 복귀 잔상, 실제 OAuth, 다른 기종·확대 글꼴, 새 의료 필드 생성·수정·월별 합계·키보드의 시나리오별 증거는 기존 상태를 유지한다. PO 최종 디자인 승인을 그 전체 항목의 개별 PASS로 변환하지 않는다.
- 커뮤니티 이미지에 새겨진 집합형 문구는 이전 보고서의 예외 그대로다. 승인된 그림을 추가 변경하지 않았다.

## 최종 상태

DESIGN_APPROVAL: FINAL_APPROVED
DELIVERY: RELEASE_INSTALLED
SOURCE_COMMIT: f6d284d70268977c24d447601441b00f81ba3734
SOURCE_PUSH: COMPLETE
FREEZE: APPROVED_SCOPE_FROZEN_WITH_EXISTING_GATES
METRO: ON_PRESERVED
RELEASE_METRO_DEPENDENCY: NONE
DEVICE_OWNER: PO
CODEX_ADB_CONTROL: STOPPED_AFTER_INSTALL_VERIFICATION
STORE: HOLD
AUTO_START_NEXT_WORK: NO

다음 단일 단계는 새로운 PO 지시 대기다. 추가 검증·수정·빌드·설치·정리는 자동 시작하지 않는다.
