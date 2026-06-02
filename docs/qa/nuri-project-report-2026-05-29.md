# NURI Project Report - 2026-05-29

## 0. 2026-06-02 최신 프로젝트 판정

- 기준 브랜치: `codex/task6-community-content-policy`
- V1.0 기능 개발 상태: Code Freeze 유지
- V1.0 P0 blocker: 1건
- V1.0 P1 운영/QA gate: 0건
- V1.0 P2 보강 evidence/final submission prep/운영 부채: 5건
- 전체 진행률: V1.0 기능 기준 약 96%, 스토어 제출 기준 약 92%

진행률은 release gate 기준이다. exact release APK 설치 smoke, 일반 사용자 final smoke, 동물병원 admin/super_admin 서버 조작 QA는 2026-06-02에 닫혔다. 다만 QA admin 세션 확보 중 authenticated 사용자가 public client로 자기 `profiles.role`을 `super_admin`으로 갱신할 수 있는 기존 서버 권한 blocker가 확인됐다. 이 문제는 admin RPC gate까지 상승시킬 수 있으므로 V1.0 출시 전 P0로 수정해야 한다.

Play Store 제출 자산은 이번 QA closeout 범위에서 제외하며, 기능/QA blocker가 아니라 final submission prep으로 분류한다.

## 1. 현재 판정

- 기준 브랜치: `codex/task6-community-content-policy`
- 기준 HEAD: 2026-06-02 현재 branch HEAD
- V1.0 기능 개발 상태: Code Freeze
- V1.0 P0 blocker: 1건
- V1.0 P1 운영/제출 gate: 0건
- V1.0 P2 보강 evidence/final submission prep/운영 부채: 5건
- 전체 진행률: V1.0 기능 기준 약 96%, 스토어 제출 기준 약 92%

진행률은 코드 구현량이 아니라 release gate 기준이다. 인증, 커뮤니티 방어선, 계정 탈퇴, 건강관리, 동물병원, 날씨, 지도/API 비용 방어, Google/Kakao 소셜 로그인, 펫 날짜 UX, exact release APK 설치 smoke, 일반 사용자 final smoke, admin/super_admin 서버 조작 QA는 닫혔다. 남은 V1.0 필수는 `profiles.role` self-escalation 차단이다. Play Store 제출 자산은 final submission prep이다.

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

2026-05-29에는 Android Debug certificate로 서명된 `com.nuri.app`이 설치되어 있어 release APK의 in-place 설치가 Android 정책상 차단됐다. `adb install -r` 결과는 `INSTALL_FAILED_UPDATE_INCOMPATIBLE`이었다. 2026-06-02에는 PO 승인 범위에서 uninstall 후 동일 release APK 설치에 성공했다.

### 2026-06-02 release install update

- PO 지시로 uninstall/data reset 범위가 승인되어 기존 debug 서명 설치본을 uninstall했다.
- 동일 release APK 설치에 성공했다.
- 설치된 base APK SHA-256은 artifact와 동일하다.
- 설치 signer는 NURI Upload certificate이며 installed package flags에 `DEBUGGABLE`이 없다.
- release APK exact install gate는 닫혔다.

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

- 2026-05-29 로그인 세션: 일반 사용자 surface
- 2026-05-29 More 하단 확인 결과: `가이드 운영`, `동물병원 운영` 메뉴 미노출
- 코드 gate: `role === 'admin' || role === 'super_admin'`
- 운영자 화면 gate: `AnimalHospitalAdminScreen`도 동일하게 admin/super_admin role 필요
- 2026-05-29 미수행 항목: 동물병원 운영자 approve/reject/held 조작 QA
- 2026-05-29 원인 분류: 코드 crash가 아니라 admin 권한 세션 미확보
- 2026-06-02 판정: admin/super_admin 서버 조작 QA는 닫힘. UI 버튼 직접 탭 증적만 P2 evidence gap으로 유지.

### 2026-06-02 operator QA update

- QA admin 계정을 생성하고 온보딩 상태를 닫은 뒤 임시 `super_admin` role로 운영 화면을 확인했다.
- release 앱에서 `운영`, `가이드 운영`, `동물병원 운영` 메뉴가 노출됐고, `동물병원 운영` 화면 진입에 성공했다.
- 운영 summary에서 canonical `10,507`, public visible `5,427`, pending phone `201`, pending coordinates `726`, pending thumbnail `440`, pending open24 `80`, pending exotic `0`, provider-only `2`, canonical linked `13`, hidden `0`, inactive `5,080`, approved open24 `4`, approved exotic `2`를 확인했다.
- review queue에서 pending 검수 항목 표시를 확인했다.
- approve/reject/held/action log/public projection은 동일 admin 세션의 Supabase RPC로 확인했다.
- ADB 입력/필터 커서 불안정으로 UI 버튼 직접 탭 3회 증적은 확보하지 못했고 P2 evidence gap으로 분류한다.
- QA 종료 후 임시 role은 `user`로 원복했다.
- 이 과정에서 authenticated 사용자가 public client로 자기 `profiles.role`을 `super_admin`으로 갱신할 수 있는 P0 보안 blocker가 확인됐다.

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

1. `profiles.role` self-escalation 차단
   - 해결 방식: 승인된 RLS/DB corrective migration으로 일반 authenticated 사용자의 role column self-update를 차단하고, 일반 프로필 수정은 유지한다. 악성 role update 시도 후 admin RPC가 `ANIMAL_HOSPITAL_ADMIN_REQUIRED`로 거부되는지 확인한다.

### Final submission prep

1. Play Store 제출 자산 최종 셋업
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

- release APK exact install은 2026-06-02에 닫혔다.
- 동물병원 운영자 서버 조작 QA는 2026-06-02에 닫혔다. UI 버튼 직접 탭 증적은 P2 evidence gap이다.
- authenticated 사용자 role self-escalation은 출시 중단급 보안 blocker다.
- secret, token, provider 계정 전체 이메일은 문서에 기록하지 않았다.

## 8. 다음 액션

1. 승인된 RLS/DB corrective migration으로 `profiles.role` self-escalation을 차단한다.
2. corrective migration 이후 release APK와 admin RPC/UI 회귀 smoke를 1회 수행한다.
