# NURI Project Report - 2026-05-29

## 1. 현재 판정

- 기준 브랜치: `codex/task6-community-content-policy`
- 기준 HEAD: `c03edd0`
- V1.0 기능 개발 상태: Code Freeze
- V1.0 P0 blocker: 0건
- V1.0 P1 운영/제출 gate: 3건
- V1.0 P2 보강 evidence/운영 부채: 4건
- 전체 진행률: V1.0 기능 기준 약 96%, 스토어 제출 기준 약 90%

진행률은 코드 구현량이 아니라 release gate 기준이다. 인증, 커뮤니티 방어선, 계정 탈퇴, 건강관리, 동물병원, 날씨, 지도/API 비용 방어, Google/Kakao 소셜 로그인, 펫 날짜 UX는 V1.0에서 닫혔다. 남은 것은 신규 기능이 아니라 exact release APK 설치 smoke, admin 계정 기반 운영자 QA, 스토어 제출 자산이다.

## 2. 이번 실행 결과

### 커밋/푸시

- 커밋: `c03edd0`
- 커밋 제목: `V1.0 최종 RC 증적 기준선 고정`
- 푸시 대상: `origin/codex/task6-community-content-policy`
- 판정: 완료

### 최종 제출 후보 release artifact

- 빌드 명령: `./gradlew assembleRelease`
- 결과: 성공
- artifact: `android/app/build/outputs/apk/release/app-release.apk`
- SHA-256: `1eb37508359fec609266e7a17205f0b7516861e2333100ca74af80b92e60694c`
- package: `com.nuri.app`
- versionName: `1.0`
- versionCode: `1`
- signer: NURI Upload certificate

현재 실기기에는 Android Debug certificate로 서명된 `com.nuri.app`이 설치되어 있어 release APK의 in-place 설치가 Android 정책상 차단됐다. `adb install -r` 결과는 `INSTALL_FAILED_UPDATE_INCOMPATIBLE`이다. 앱 데이터 삭제 또는 uninstall은 현재 로그인 세션을 삭제할 수 있어 수행하지 않았다.

## 3. Android 최종 스모크

- 기기: `R5CY613NMSY` / `SM_S937N`
- 실행 앱: 현재 설치본 `com.nuri.app`, `versionName=1.0`, `versionCode=1`
- 확인 화면: 홈, 타임라인, 커뮤니티, 편지함, 전체메뉴, 건강관리, 산책 리스트, 산책 상세, 동물병원 리스트, 동물병원 상세
- 산책/location discovery: 리스트와 상세 진입 성공
- 동물병원: 리스트와 상세 진입 성공, 주소는 상세에서만 표시, 전화/길찾기 CTA 표시
- 펫 날짜 UX 회귀: 홈 카드에서 `생년월일 2010.05.12` 표시
- logcat: fatal crash, ANR, unhandled promise, ReactNativeJS fatal/error pattern 0건
- 판정: 일반 사용자 설치본 final smoke 통과

## 4. 운영자 QA 진단

- 현재 로그인 세션: 일반 사용자 surface
- More 하단 확인 결과: `가이드 운영`, `동물병원 운영` 메뉴 미노출
- 코드 gate: `role === 'admin' || role === 'super_admin'`
- 운영자 화면 gate: `AnimalHospitalAdminScreen`도 동일하게 admin/super_admin role 필요
- 수행하지 못한 항목: 동물병원 운영자 approve/reject/held 조작 QA
- 원인 분류: 코드 crash가 아니라 admin 권한 세션 미확보
- 판정: V1.0 필수 잔여 gate

## 5. V1.0 구현 완료

- 이메일/소셜 인증 기본 흐름
- Google OAuth 성공 smoke
- Kakao OAuth 신규 가입 smoke
- Naver public surface soft disable
- 비밀번호 재설정
- 정책 문서 public 연결
- 계정 탈퇴 7일 유예와 자동 파기 worker
- 커뮤니티 신고/차단/auto-hide 최소 운영 방어선
- 커뮤니티 인앱 정책 고지
- 닉네임 정책과 기본 레이아웃
- 건강관리 Phase 1
- 동물병원 Localdata canonical 기반 public UX
- 동물병원 provider 비용 runtime 차단
- 산책/location discovery 서버 경유 + cache + fan-out 제한
- 날씨 cache proxy 비용 방어
- 펫 등록/수정 날짜 `YYYY-MM-DD` 직접 입력 UX
- V1.1 자체 POI DB + Supabase PostGIS 전환 설계 문서화

## 6. V1.0 남은 항목

### V1.0 필수

1. exact release APK 설치 smoke
   - 해결 방식: clean test device를 사용하거나 현재 앱 uninstall/data reset을 명시 승인한 뒤 NURI Upload 서명 release APK를 설치하고 앱 실행/logcat을 확인한다.

2. admin 계정 기반 동물병원 운영자 QA
   - 해결 방식: admin 또는 super_admin 권한 세션으로 로그인한 뒤 동물병원 운영자 화면에서 approve/reject/held 조작과 action log 반영을 확인한다.

3. Play Store 제출 자산 최종 셋업
   - 해결 방식: 스크린샷, 앱 설명, 문의처, 정책 URL, package/version metadata 일치를 제출 전 체크한다.

### V1.1 이동

- Naver OAuth hard delete cleanup
- 산책/location discovery 자체 POI DB
- Supabase PostGIS 기반 반경 검색
- Kakao Local 사용자 runtime 제거
- MapLibre/PMTiles 자체 지도 스택 후보 검토
- provider admin batch import 도구화
- Entitlement/billing foundation
- Premium AI reply
- Guestbook private letters 확장
- Typography foundation rollout

## 7. 최종 리스크

- release APK 자체는 생성됐지만 현재 실기기 debug 서명 설치본 위에 덮어쓸 수 없다. 이는 Android 서명 정책에 따른 정상 차단이며 빌드 실패가 아니다.
- 운영자 QA는 현재 세션 권한 문제로 미수행이다. 일반 사용자 final smoke와 분리해서 관리해야 한다.
- secret, token, provider 계정 전체 이메일은 문서에 기록하지 않았다.

## 8. 다음 액션

1. clean test device 또는 승인된 uninstall/data reset 후 exact release APK 설치 smoke.
2. admin/super_admin 계정 기반 동물병원 운영자 approve/reject/held 조작 QA.
