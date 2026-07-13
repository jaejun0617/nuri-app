# NURI 앱 조건부 QA 4건 최종 Closeout 상태

기준일: 2026-07-14

## 결론

조건부 QA 4건은 아직 모두 닫히지 않았다. 이번 턴에서 최신 APK와 Android 실기기로 일부 증적을 확보했지만, 100% readiness 판정 기준에는 도달하지 않았다.

## 기준 APK

- HEAD: `23744c3`
- APK SHA-256: `57c660393d4de35e1a00c8d19e4b29e85422fcddd60c86cb6048ac621ac6cbeb`
- 기기: `SM_S937N / R5CY613NMSY`

## Criterion별 상태

1. Google/Kakao OAuth
   - Google: 취소 복귀, 실제 성공, 신규 온보딩, session restore 확인.
   - Kakao: 실제 성공, 신규 온보딩, session restore 확인.
   - 잔여: Kakao 순수 취소 후 로그인 화면 복귀.

2. 전체 keyboard/navigation sweep
   - 확인: 로그인 화면, NicknameSetup, PetCreate 일부 입력 경로.
   - 잔여: 앱에 실제 노출되는 전체 TextInput route의 keyboard bar, keyboard avoiding, CTA 접근성, Android back, modal back.

3. notification token isolation
   - 확인: 기존 Jest `pushTokenLifecycle` 계약 통과.
   - 잔여: `adminQA` 재로그인 후 opt-in/out, logout revoke, account switch ownership isolation 실기기 E2E.

4. 최종 release regression gate
   - 확인: 최신 APK build/install, 소셜 온보딩 일부, typecheck/lint/Jest/Supabase/logcat short gate.
   - 잔여: `adminQA` 세션 기반 Home, Timeline, Community, Hospital, Walk, Weather, Growth, Notification, Settings 전체 물리 회귀.

## 진행률

- 기능 구현: `74/74`, 100%
- QA·보안: `50/54`, 92.6%
- 문서·release: `21/21`, 100%
- 앱 본체 가중 진행률: `97.4%`

## 금지된 판정

아래 문구는 아직 쓰지 않는다.

- QA·보안 100%
- 앱 본체 100%
- 최종 release gate 완료

## 다음 작업

사용자 입력으로 `adminQA` 로그인 완료 후 남은 release gate evidence만 닫는다. 신규 기능 구현, 관리자 홈페이지 추가 본구현, Play Store 자산, 앱 디자인 리뉴얼은 포함하지 않는다.
