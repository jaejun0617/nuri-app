# Final RC Evidence Baseline - 2026-05-29

## 1. 기준

- 기준 날짜: 2026-05-29 KST
- 작업 유형: V1.0 final RC evidence closeout
- 브랜치: `codex/task6-community-content-policy`
- 기준 HEAD: `c03edd0`
- 시작 worktree: `git status --short` 기준 clean
- 커밋/푸시: `c03edd0` pushed to `origin/codex/task6-community-content-policy`
- 현재 worktree 판정: RC artifact/smoke 보고서 문서 반영 중 코드 변경 없음. 최종 커밋 후 clean 상태로 고정한다.

## 2. 수정 파일 목록

- `docs/qa/final-rc-evidence-2026-05-29.md`
- `docs/qa/nuri-project-report-2026-05-29.md`
- `docs/qa/release-checklist.md`
- `docs/qa/v1.0-remaining-task-risk-ledger.md`
- `docs/project-memory/현재-프로젝트-상태.md`
- `docs/project-memory/다음-작업-우선순위.md`
- `docs/project-memory/최근-작업-로그.md`

수정 금지 파일 `src/screens/Main/components/LoggedInHome/LoggedInHome.tsx`는 수정하지 않았다.

## 3. 검증 명령 결과

| 명령 | 결과 | 판정 |
|---|---|---|
| `git status --short` | 시작 시 clean, 문서 반영 후 docs 변경만 존재 | 코드 변경 없음 |
| `corepack yarn tsc --noEmit --pretty false` | 출력 없이 종료 | 통과 |
| `corepack yarn lint` | error 0건, 기존 warning 6건 | 통과 |
| `adb devices -l` | `R5CY613NMSY`, model `SM_S937N`, `device` | 연결 확인 |
| `adb shell am start -n com.nuri.app/com.nuri.MainActivity` | 이미 foreground인 top-most instance에 intent 전달 | 실행 확인 |
| `adb logcat -d` fatal pattern scan | `FATAL EXCEPTION`, `ANR`, `unhandled promise`, ReactNativeJS fatal/error pattern 매칭 0건 | 통과 |
| `git diff --check` | 문서 반영 후 실행 | 통과 |
| `./gradlew assembleRelease` | `BUILD SUCCESSFUL in 10m 5s` | 통과 |
| `adb install -r android/app/build/outputs/apk/release/app-release.apk` | `INSTALL_FAILED_UPDATE_INCOMPATIBLE` | 현재 실기기 설치본이 Android Debug 서명이라 NURI Upload 서명 release APK로 덮어쓰기 불가 |

## 4. Android 기기 정보

- device id: `R5CY613NMSY`
- model: `SM_S937N`
- package: `com.nuri.app`
- launch activity: `com.nuri.app/com.nuri.MainActivity`
- 설치본 version: `versionName=1.0`, `versionCode=1`
- 설치본 서명: Android Debug certificate
- 새 release artifact 서명: NURI Upload certificate

이번 턴에서는 OAuth 전체 flow, Naver success smoke, 날짜 UX 확장 smoke를 반복하지 않았다. 직전 Android 실기기 evidence를 V1.0 source of truth로 유지하고, 앱 1회 실행과 logcat fatal pattern만 확인했다.

## 4-1. RC artifact provenance

- artifact: `android/app/build/outputs/apk/release/app-release.apk`
- artifact type: APK / release
- size: `114603432 bytes`
- SHA-256: `1eb37508359fec609266e7a17205f0b7516861e2333100ca74af80b92e60694c`
- package: `com.nuri.app`
- versionName: `1.0`
- versionCode: `1`
- minSdk: `24`
- targetSdk: `36`
- application label: `Pet Nuri`
- signer DN: `CN=NURI Upload, O=NURI, L=Seoul, ST=Seoul, C=KR`
- signer SHA-256: `08efb41ea4729792ce9fc3d242be9704e84a8ea3eadcbbcf1c8426884db689d3`

### 설치 smoke 판정

- 현재 실기기 설치본: `versionName=1.0`, `versionCode=1`, Android Debug signer, `DEBUGGABLE`
- 새 release APK: NURI Upload signer
- `adb install -r` 결과: 기존 설치본과 새 APK 서명이 달라 Android가 업데이트 설치를 거부했다.
- 앱 데이터 삭제 또는 uninstall은 현재 로그인 세션을 삭제할 수 있어 이번 진단에서는 수행하지 않았다.
- 따라서 exact release APK 설치 smoke는 clean test device 또는 명시적으로 앱 삭제를 허용한 별도 턴에서 수행한다. 이는 artifact 생성 실패가 아니라 기존 debug 설치본과 release 서명의 정상적인 Android 업데이트 차단이다.

## 5. V1.0 provider 최종 상태

| Provider | V1.0 상태 | Evidence |
|---|---|---|
| Google | 사용 | Android success session smoke 완료. 기존 사용자 홈 진입 기록 유지. |
| Kakao | 사용 | 신규 사용자 `NicknameSetup -> PetCreate -> 펫 등록 -> 홈` Android smoke 완료. |
| Naver | 미사용 | V1.0 public surface soft disable. 로그인 화면 미노출. Supabase `custom:naver` provider와 app-side 코드는 hard delete하지 않음. |
| Apple | 제외 | Android-first V1.0 범위 밖. |

Secret, token, provider 계정 전체 이메일, client secret 전체값은 문서에 기록하지 않는다.

## 6. 소셜 회원가입 최종 상태

- Google: V1.0 OAuth success session smoke 완료. 기존 사용자 홈 진입 기록 유지.
- Kakao: V1.0 신규 소셜 가입 smoke 완료.
- Kakao 신규 가입 flow: `OAuth -> session -> NicknameSetup -> 닉네임 중복확인/저장 -> PetCreate -> 펫 등록 -> 홈`
- provider metadata: `nickname_confirmed`를 대체하지 않는다.
- NURI profile source of truth: 앱 내부 confirmed profile.
- V1.0 blocker: 없음.

## 7. 펫 날짜 UX 최종 상태

- 적용 화면: PetCreate, PetProfileEdit
- 공통 컴포넌트: DatePicker modal
- 직접 입력 형식: `YYYY-MM-DD`
- 과거 날짜 evidence: `2010-05-12` 입력 및 저장, 홈 카드 `생년월일 2010.05.12` 반영
- invalid date evidence: `2010-99-99` 입력 시 validation error 표시 및 저장 차단
- 미래 날짜 처리: `maximumDate={new Date()}` 기준 차단
- keyboard avoiding: Android 실기기 smoke 완료
- V1.0 blocker: 없음.

## 8. V1.1 이동 항목

- Naver OAuth hard delete cleanup
- 산책/location discovery 자체 POI DB 구축
- Supabase PostGIS 기반 bbox/radius/distance query
- Kakao Local 사용자 runtime 제거
- Kakao Local admin seed 보조 도구화
- MapLibre React Native 검토
- PMTiles/OSM 기반 자체 타일 호스팅 검토

V1.0에서는 지도/API 비용 폭탄 방어 gate를 닫았다. Google Places/Photos 경로는 차단되었고, Kakao Local은 클라이언트 직접 호출 없이 서버 경유·캐시·fan-out 제한 상태로 통제한다. 단, Kakao Local은 provider-zero가 아니므로 V1.1에서는 산책/location discovery를 자체 POI DB + Supabase PostGIS 기반 반경 검색으로 전환한다. Kakao Local은 사용자 runtime에서 제거하고, 필요 시 admin seed 보조 도구로만 제한한다.

## 8-1. Android 최종 smoke 진단

현재 설치본은 Android Debug 서명 `com.nuri.app` `versionName=1.0`, `versionCode=1`이다. 새 release APK와 서명이 달라 exact release artifact 설치는 수행하지 못했지만, 기존 로그인 세션을 유지한 설치본에서 아래 화면을 직접 조작했다.

| 화면 | 확인 결과 |
|---|---|
| 홈 | `kakao0528님`, `KakaoPet`, `생년월일 2010.05.12`, 날씨 카드, Open-Meteo attribution 표시 |
| 타임라인 | 타임라인 탭 진입, empty state, `기록 시작하기` CTA 표시 |
| 커뮤니티 | 커뮤니티 탭 진입, 카테고리 칩, 운영정책 보기, 최근 글 목록 표시 |
| 편지함 | Private Letters 화면 진입, 편지 작성 폼, 0/5,000 counter, empty list 표시 |
| 전체메뉴 | 건강관리, 산책 장소 찾기, 동물병원, 커뮤니티, 로그아웃/계정삭제 등 일반 사용자 메뉴 표시 |
| 건강관리 | 월간 건강관리 화면, 기록/체중/인사이트 탭, 날짜 strip, empty state, `건강 기록하기` CTA 표시 |
| 산책/location discovery | `우리동네 산책 리스트` 진입, 현재 위치 기준, 정렬 칩, 산책 후보 리스트 표시 |
| 산책 상세 | `산책 장소 상세`, 주소, 거리, 예상 시간, 지도 보기/장소 링크, 주변 산책 장소 표시 |
| 동물병원 리스트 | `우리동네 동물병원`, 가까운순/24시 운영/특수동물병원 칩, 병원명/전화번호 표시 |
| 동물병원 상세 | 병원명, 후보 라벨, 주소, 거리, 전화번호, 기준일, 전화하기/길찾기 CTA 표시 |
| logcat | `FATAL EXCEPTION`, `ANR`, `unhandled promise`, ReactNativeJS fatal/error pattern 0건 |

## 8-2. 운영자 QA 진단

- More 화면 하단까지 스크롤했지만 현재 로그인 세션에는 `운영`, `가이드 운영`, `동물병원 운영` 메뉴가 노출되지 않았다.
- 코드 기준 운영 메뉴는 `role === 'admin' || role === 'super_admin'`일 때만 렌더링된다.
- `AnimalHospitalAdminScreen`도 같은 admin/super_admin role gate를 가진다.
- 현재 세션은 일반 사용자 public surface 진단은 가능하지만, admin 계정 기반 approve/reject/held 조작 QA는 수행할 수 없는 상태다.
- 운영자 조작 QA는 V1.0 필수 잔여로 남기되, 원인은 코드 crash가 아니라 admin 권한 세션 미확보로 분류한다.

## 9. 최종 판정

- V1.0 P0 blocker: 0건
- V1.0 OAuth blocker: 0건
- V1.0 지도/API 비용 blocker: 0건
- V1.0 펫 날짜 UX blocker: 0건
- V1.0 필수로 남은 운영/제출 gate: exact release APK 설치 smoke, admin 계정 기반 동물병원 운영자 조작 QA, 앱 스토어 출시 자산 셋업
- 프로젝트 보고서: `docs/qa/nuri-project-report-2026-05-29.md`

따라서 V1.0 기능/비용/OAuth/date UX blocker는 0건이며, 다음 실행 단위는 clean device 또는 승인된 uninstall 후 exact release APK 설치 smoke다.
