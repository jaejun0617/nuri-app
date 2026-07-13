# NURI 앱 관리자 핸드오프 후속작업 정리

기준일: 2026-07-14

## 관리자 홈페이지 판정

관리자 홈페이지 source of truth는 별도 `nuri-web /admin`이다. 계획된 단계별 본구현은 종료한다. 앱 내부 일반 사용자 화면에는 관리자 UI를 추가하지 않는다.

이후 허용되는 관리자 홈페이지 작업은 아래 3개뿐이다.

1. 운영 중 발견된 장애 수정
2. 보안 패치
3. 실제 회귀 수정

신규 본구현 차수, 신규 고도화 phase, 신규 범위 확장은 제안하지 않는다.

## 외부 운영 조건

아래 항목은 앱 본 프로젝트 구현 blocker가 아니다.

- NURI 소유 custom domain 연결
- DNS/SSL 전환
- Cloudflare Access 또는 유료 Vercel 보호 계층
- Sentry/Better Stack 등 별도 외부 runtime monitoring
- 실제 운영자 MFA/recovery material 실사용 절차
- 실제 두 명의 상시 운영자 체계

## 앱 프로젝트로 복귀한 우선순위

2026-07-14 최종 release gate 재판정 기준, 관리자 홈페이지는 계속 종료 상태이고 앱 blocker가 아니다. 다만 앱 본체 QA·보안 criterion 4건은 아직 완료 판정하지 않는다. 다음 앱 작업은 관리자 추가 구현이 아니라 `adminQA` 재로그인 후 남은 OAuth 취소, keyboard/navigation, token isolation, 전체 regression evidence를 닫는 release gate다.

1. release/운영 준비
   - 최신 release APK evidence 유지
   - keyboard/navigation/logcat gate 반복
   - Supabase dry-run/destructive diff 확인
2. PO 승인 대기
   - 앱 전체 디자인/폰트 리뉴얼
   - Play Store 자산 패키지
   - actual push provider 활성화
3. V1.1/V1.2 후속
   - 자체 POI runtime 전환
   - push token/provider 실발송 트랙
   - 성능 고도화

## 계속 금지

- hard delete
- 전체/segment broadcast
- actual push 무승인 발송
- Naver public surface 복구
- Apple login 추가
- 앱 내부 admin UI 노출
- destructive migration
